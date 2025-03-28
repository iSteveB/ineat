import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

// Mock des modules externes
jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

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
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
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
      };

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
      };

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

  // Tests de la méthode register
  describe('register', () => {
    it('doit créer un nouvel utilisateur et retourner le token et les informations utilisateur', async () => {
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
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password');
      (prismaService.user.create as jest.Mock).mockResolvedValue(
        mockCreatedUser,
      );

      // Act
      const result = await service.register(registerDto);

      // Assert
      expect(result).toEqual({
        user: {
          id: 'new-user-id',
          email: 'new@example.com',
          firstName: 'New',
          lastName: 'User',
          profileType: 'SINGLE',
          preferences: {},
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        accessToken: 'mocked-jwt-token',
      });

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
      expect(jwtService.sign).toHaveBeenCalledWith({
        email: 'new@example.com',
        sub: 'new-user-id',
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
      };

      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
        mockExistingUser,
      );

      // Act & Assert
      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'existing@example.com' },
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prismaService.user.create).not.toHaveBeenCalled();
    });
  });
});
