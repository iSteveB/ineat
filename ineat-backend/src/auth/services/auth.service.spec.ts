import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { User } from '../../../prisma/generated/prisma/client';
import { SafeUserDto } from '../dto/auth.dto';
import { ObservabilityService } from '../../observability/observability.service';
import { authUserSelect } from '../auth-user.select';

// Mock des modules externes
jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  // Mock de la réponse Express
  const mockResponse = {
    cookie: jest.fn().mockReturnThis(),
  } as unknown as Response;

  // Configuration du module de test
  beforeEach(async () => {
    // Réinitialiser tous les mocks avant chaque test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
        {
          provide: ObservabilityService,
          useValue: {
            trackEvent: jest.fn(),
            increment: jest.fn(),
            recordTiming: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mocked-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key) => {
              if (key === 'NODE_ENV') return 'test';
              if (key === 'JWT_SECRET') return 'test-secret';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  const expectStandardAuthResponse = (
    result: unknown,
    expectedUser: { id: string; email: string },
  ) => {
    expect(result).toEqual({
      success: true,
      message: 'Authentification réussie',
      data: {
        user: expect.objectContaining(expectedUser),
        accessToken: 'mocked-jwt-token',
      },
      timestamp: expect.any(String),
    });
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Tests de la méthode validateUser
  describe('validateUser', () => {
    it("doit retourner l'utilisateur sans mot de passe si les identifiants sont valides", async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        profileType: 'SINGLE',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Act
      const result = await service.validateUser('test@example.com', 'password');

      // Assert
      expect(result).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileType: 'SINGLE',
        preferences: {},
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: authUserSelect,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'password',
        'hashed-password',
      );
    });

    it("doit retourner null si l'utilisateur n'existe pas", async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await service.validateUser('test@example.com', 'password');

      // Assert
      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: authUserSelect,
      });
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('doit retourner null si le mot de passe est incorrect', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        profileType: 'SINGLE',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      const result = await service.validateUser(
        'test@example.com',
        'wrong-password',
      );

      // Assert
      expect(result).toBeNull();
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: authUserSelect,
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(
        'wrong-password',
        'hashed-password',
      );
    });
  });

  // Tests pour setCookies
  describe('setCookies', () => {
    it('doit définir un cookie contenant le JWT et retourner les informations utilisateur', async () => {
      // Arrange
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileType: 'SINGLE',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const result = await service.setCookies(
        user as SafeUserDto,
        mockResponse,
      );

      // Assert
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: 'test@example.com',
        sub: 'user-id',
      });
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'auth_token',
        'mocked-jwt-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
          maxAge: 24 * 60 * 60 * 1000,
        }),
      );
      expectStandardAuthResponse(result, {
        id: 'user-id',
        email: 'test@example.com',
      });
    });
  });

  // Tests pour login
  describe('login', () => {
    it('doit définir un cookie et retourner les informations utilisateur', async () => {
      // Arrange
      const user = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        profileType: 'SINGLE',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const result = await service.login(user as User, mockResponse);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalled();
      expectStandardAuthResponse(result, {
        id: 'user-id',
        email: 'test@example.com',
      });
    });
  });

  // Tests pour register
  describe('register', () => {
    it('doit créer un nouvel utilisateur, définir un cookie et retourner les informations', async () => {
      // Arrange
      const registerDto = {
        email: 'new@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
        profileType: 'SINGLE' as const,
      };

      const mockCreatedUser = {
        id: 'new-user-id',
        email: 'new@example.com',
        passwordHash: 'hashed-new-password',
        firstName: 'New',
        lastName: 'User',
        profileType: 'SINGLE',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password');
      (prismaService.user.create as jest.Mock).mockResolvedValue(
        mockCreatedUser,
      );

      // Act
      const result = await service.register(registerDto, mockResponse);

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
        select: authUserSelect,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: expect.any(String),
          email: 'new@example.com',
          passwordHash: 'hashed-new-password',
          firstName: 'New',
          lastName: 'User',
          profileType: 'SINGLE',
          subscription: 'FREE',
          preferences: {},
          updatedAt: expect.any(Date),
        }),
        select: authUserSelect,
      });
      expect(mockResponse.cookie).toHaveBeenCalled();
      expectStandardAuthResponse(result, {
        id: 'new-user-id',
        email: 'new@example.com',
      });
    });

    it("doit lever une exception si l'email existe déjà", async () => {
      // Arrange
      const registerDto = {
        email: 'existing@example.com',
        password: 'Password123',
        firstName: 'New',
        lastName: 'User',
        profileType: 'SINGLE' as const,
      };

      const mockExistingUser = {
        id: 'existing-user-id',
        email: 'existing@example.com',
      } as User;

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockExistingUser,
      );

      // Act & Assert
      await expect(service.register(registerDto, mockResponse)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
        select: authUserSelect,
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prismaService.user.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).not.toHaveBeenCalled();
    });
  });

  // Tests pour logout
  describe('logout', () => {
    it('doit effacer le cookie et retourner un message de succès', async () => {
      // Act
      const result = await service.logout(mockResponse);

      // Assert
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'auth_token',
        '',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          expires: expect.any(Date),
          path: '/',
        }),
      );
      expect(result).toEqual({
        success: true,
        message: 'Déconnexion réussie',
      });
    });
  });

  // Tests pour getProfile
  describe('getProfile', () => {
    it('doit retourner le profil utilisateur sans le mot de passe', async () => {
      // Arrange
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Test',
        lastName: 'User',
        profileType: 'SINGLE',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.getProfile('user-id');

      // Assert
      expect(result).toEqual({
        success: true,
        data: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          profileType: 'SINGLE',
          subscription: 'FREE',
          preferences: {},
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        select: authUserSelect,
      });
    });

    it("doit lever une exception si l'utilisateur n'existe pas", async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getProfile('non-existent-id')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
        select: authUserSelect,
      });
    });
  });

  // Tests pour findOrCreateGoogleUser
  describe('findOrCreateGoogleUser', () => {
    it('doit trouver un utilisateur existant, définir un cookie et retourner les informations', async () => {
      // Arrange
      const googleData = {
        email: 'google@example.com',
        firstName: 'Google',
        lastName: 'User',
        photo: 'photo-url',
      };
      const mockExistingGoogleUser = {
        id: 'google-user-id',
        email: 'google@example.com',
        passwordHash: '',
        firstName: 'Google',
        lastName: 'User',
        profileType: 'SINGLE',
        subscription: 'FREE',
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockExistingGoogleUser,
      );

      // Act
      const result = await service.findOrCreateGoogleUser(
        googleData,
        mockResponse,
      );

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'google@example.com' },
        select: authUserSelect,
      });
      expect(prismaService.user.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalled();
      expectStandardAuthResponse(result, {
        id: 'google-user-id',
        email: 'google@example.com',
      });
    });

    it('doit créer un nouvel utilisateur, définir un cookie et retourner les informations', async () => {
      // Arrange
      const googleData = {
        email: 'new-google@example.com',
        firstName: 'New',
        lastName: 'Google',
        photo: 'photo-url',
      };
      const mockCreatedGoogleUser = {
        id: 'new-google-id',
        email: 'new-google@example.com',
        passwordHash: '',
        firstName: 'New',
        lastName: 'Google',
        profileType: 'SINGLE',
        subscription: 'FREE',
        avatarUrl: null,
        preferences: {
          profilePicture: 'photo-url',
          oauth: 'google',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(
        mockCreatedGoogleUser,
      );

      // Act
      const result = await service.findOrCreateGoogleUser(
        googleData,
        mockResponse,
      );

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new-google@example.com' },
        select: authUserSelect,
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: expect.any(String),
          email: 'new-google@example.com',
          firstName: 'New',
          lastName: 'Google',
          passwordHash: '',
          profileType: 'SINGLE',
          subscription: 'FREE',
          preferences: {
            profilePicture: 'photo-url',
            oauth: 'google',
          },
          updatedAt: expect.any(Date),
        }),
        select: authUserSelect,
      });
      expect(mockResponse.cookie).toHaveBeenCalled();
      expectStandardAuthResponse(result, {
        id: 'new-google-id',
        email: 'new-google@example.com',
      });
    });
  });
});
