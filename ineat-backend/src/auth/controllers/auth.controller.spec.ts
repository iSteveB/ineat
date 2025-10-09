// src/auth/controllers/auth.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import * as authDtos from '../dto/auth.dto';
import { RegisterDto, LoginDto } from '../dto/auth.dto';
import { ProfileType, User } from '@prisma/client';

// Type pour l'utilisateur sans le mot de passe
type UserWithoutPassword = Omit<User, 'passwordHash'>;

// Interface qui étend correctement la requête Express
interface RequestWithUser extends Request {
  user: UserWithoutPassword;
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    profileType: ProfileType;
  };
  accessToken: string;
}

// Mock pour les DTOs
jest.mock('../dto/register.dto', () => ({
  validateRegisterDto: jest.fn((dto) => dto),
  RegisterDto: class MockRegisterDto {},
}));

jest.mock('../dto/login.dto', () => ({
  validateLoginDto: jest.fn((dto) => dto),
  LoginDto: class MockLoginDto {},
}));

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Mock de la réponse Express
  const mockResponse = {
    cookie: jest.fn().mockReturnThis(),
  } as unknown as Response;

  // Données fictives pour les tests
  const mockUser: Partial<UserWithoutPassword> = {
    id: 'user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    profileType: 'SINGLE',
    preferences: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthResponse: AuthResponse = {
    user: {
      id: 'user-id',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      profileType: 'SINGLE',
    },
    accessToken: 'mock-jwt-token',
  };

  const mockRegisterDto: RegisterDto = {
    email: 'new@example.com',
    password: 'Password123',
    firstName: 'New',
    lastName: 'User',
    profileType: 'SINGLE',
  };

  const mockLoginDto: LoginDto = {
    email: 'test@example.com',
    password: 'password',
  };

  beforeEach(async () => {
    // Réinitialiser tous les mocks avant chaque test
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn().mockResolvedValue(mockAuthResponse),
            login: jest.fn().mockResolvedValue(mockAuthResponse),
            getProfile: jest.fn().mockResolvedValue(mockUser),
            logout: jest.fn().mockResolvedValue({
              success: true,
              message: 'Déconnexion réussie',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('doit appeler authService.register avec les données validées et la réponse', async () => {
      // Arrange
      (authDtos.validateRegisterDto as jest.Mock).mockReturnValue(
        mockRegisterDto,
      );

      // Act
      const result = await controller.register(mockRegisterDto, mockResponse);

      // Assert
      expect(authDtos.validateRegisterDto).toHaveBeenCalledWith(
        mockRegisterDto,
      );
      expect(authService.register).toHaveBeenCalledWith(
        mockRegisterDto,
        mockResponse,
      );
      expect(result).toEqual(mockAuthResponse);
    });

    it('doit lever une BadRequestException si la validation échoue', async () => {
      // Arrange
      const validationError = new Error('Validation failed');
      (authDtos.validateRegisterDto as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(
        controller.register(mockRegisterDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
      expect(authDtos.validateRegisterDto).toHaveBeenCalledWith(
        mockRegisterDto,
      );
      expect(authService.register).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it("doit appeler authService.login avec l'utilisateur de la requête et la réponse", async () => {
      // Créer un objet de requête avec uniquement les propriétés que nous utilisons dans notre méthode de test
      const req = {
        user: mockUser,
      } as Request;

      (authDtos.validateLoginDto as jest.Mock).mockReturnValue(mockLoginDto);

      // Act
      const result = await controller.login(
        req as RequestWithUser,
        mockLoginDto,
        mockResponse,
      );

      // Assert
      expect(authDtos.validateLoginDto).toHaveBeenCalledWith(mockLoginDto);
      expect(authService.login).toHaveBeenCalledWith(mockUser, mockResponse);
      expect(result).toEqual(mockAuthResponse);
    });

    it('doit lever une BadRequestException si la validation échoue', async () => {
      // Arrange
      const req = {
        user: mockUser,
      } as Request;

      const validationError = new Error('Validation failed');
      (authDtos.validateLoginDto as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(
        controller.login(req as RequestWithUser, mockLoginDto, mockResponse),
      ).rejects.toThrow(BadRequestException);
      expect(authDtos.validateLoginDto).toHaveBeenCalledWith(mockLoginDto);
      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('doit retourner le profil utilisateur', async () => {
      // Arrange
      const req = {
        user: { ...mockUser, id: 'user-id' },
      } as unknown as Request;

      // Act
      const result = await controller.getProfile(req as RequestWithUser);

      // Assert
      expect(authService.getProfile).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockUser);
    });
  });

  describe('logout', () => {
    it('doit appeler authService.logout avec la réponse', async () => {
      // Arrange
      const req = {
        user: { ...mockUser, id: 'user-id' },
      } as unknown as Request;

      const expectedResponse = {
        success: true,
        message: 'Déconnexion réussie',
      };

      // Act
      const result = await controller.logout(
        req as RequestWithUser,
        mockResponse,
      );

      // Assert
      expect(authService.logout).toHaveBeenCalledWith(mockResponse);
      expect(result).toEqual(expectedResponse);
    });
  });
});
