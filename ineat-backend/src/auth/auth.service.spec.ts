import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Response } from 'express';
import { User } from '@prisma/client';
import { SafeUserDto } from './dto/register.dto';

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
          secure: true,
          sameSite: 'lax',
          path: '/',
        }),
      );
      expect(result).toEqual({
        user: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          profileType: 'SINGLE',
        },
        accessToken: 'mocked-jwt-token',
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
      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'user-id',
          email: 'test@example.com',
        }),
        accessToken: 'mocked-jwt-token',
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
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new@example.com',
          passwordHash: 'hashed-new-password',
          firstName: 'New',
          lastName: 'User',
          profileType: 'SINGLE',
          preferences: {},
        },
      });
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'new-user-id',
          email: 'new@example.com',
        }),
        accessToken: 'mocked-jwt-token',
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
        where: { id: 'user-id' },
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

      const mockUser = {
        id: 'google-user-id',
        email: 'google@example.com',
        passwordHash: '',
        firstName: 'Google',
        lastName: 'User',
        profileType: 'SINGLE',
        preferences: { oauth: 'google' },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      // Act
      const result = await service.findOrCreateGoogleUser(
        googleData,
        mockResponse,
      );

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'google@example.com' },
      });
      expect(prismaService.user.create).not.toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'google-user-id',
          email: 'google@example.com',
        }),
        accessToken: 'mocked-jwt-token',
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

      const mockCreatedUser = {
        id: 'new-google-id',
        email: 'new-google@example.com',
        passwordHash: '',
        firstName: 'New',
        lastName: 'Google',
        profileType: 'SINGLE',
        preferences: { profilePicture: 'photo-url', oauth: 'google' },
        createdAt: new Date(),
        updatedAt: new Date(),
      } as User;

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prismaService.user.create as jest.Mock).mockResolvedValue(
        mockCreatedUser,
      );

      // Act
      const result = await service.findOrCreateGoogleUser(
        googleData,
        mockResponse,
      );

      // Assert
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'new-google@example.com' },
      });
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'new-google@example.com',
          firstName: 'New',
          lastName: 'Google',
          passwordHash: '',
          profileType: 'SINGLE',
          preferences: {
            profilePicture: 'photo-url',
            oauth: 'google',
          },
        },
      });
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(result).toEqual({
        user: expect.objectContaining({
          id: 'new-google-id',
          email: 'new-google@example.com',
        }),
        accessToken: 'mocked-jwt-token',
      });
    });
  });
});
