import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { BadRequestException } from '@nestjs/common';

// Mocks pour les validateurs
jest.mock('./dto/register.dto', () => ({
  validateRegisterDto: jest.fn((dto) => dto),
  RegisterDto: class MockRegisterDto {},
}));

jest.mock('./dto/login.dto', () => ({
  validateLoginDto: jest.fn((dto) => dto),
  LoginDto: class MockLoginDto {},
}));

// Import des mocks après les avoir définis
import { validateRegisterDto } from './dto/register.dto';
import { validateLoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  // Données fictives pour les tests
  const mockUser = {
    id: 'user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    profileType: 'SINGLE',
  };

  const mockLoginResponse = {
    user: mockUser,
    accessToken: 'mock-jwt-token',
  };

  const mockRegisterDto = {
    email: 'new@example.com',
    password: 'Password123',
    firstName: 'New',
    lastName: 'User',
    profileType: 'SINGLE' as const,
  };

  const mockLoginDto = {
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
            register: jest.fn().mockResolvedValue(mockLoginResponse),
            login: jest.fn().mockResolvedValue(mockLoginResponse),
            getProfile: jest.fn().mockResolvedValue(mockUser),
          },
        },
      ],
    })
      // Override des guards pour les tests
      .overrideGuard(LocalAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('doit appeler le service register avec les données validées', async () => {
      // Arrange
      (validateRegisterDto as jest.Mock).mockReturnValue(mockRegisterDto);

      // Act
      const result = await controller.register(mockRegisterDto);

      // Assert
      expect(validateRegisterDto).toHaveBeenCalledWith(mockRegisterDto);
      expect(authService.register).toHaveBeenCalledWith(mockRegisterDto);
      expect(result).toEqual(mockLoginResponse);
    });

    it('doit lever une BadRequestException si la validation échoue', async () => {
      // Arrange
      const validationError = new Error('Validation failed');
      (validateRegisterDto as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(controller.register(mockRegisterDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(validateRegisterDto).toHaveBeenCalledWith(mockRegisterDto);
      expect(authService.register).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('doit appeler le service login avec les données de la requête', async () => {
      // Arrange
      const req = { user: mockUser };
      (validateLoginDto as jest.Mock).mockReturnValue(mockLoginDto);

      // Act
      const result = await controller.login(req, mockLoginDto);

      // Assert
      expect(validateLoginDto).toHaveBeenCalledWith(mockLoginDto);
      expect(authService.login).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockLoginResponse);
    });

    it('doit lever une BadRequestException si la validation échoue', async () => {
      // Arrange
      const req = { user: mockUser };
      const validationError = new Error('Validation failed');
      (validateLoginDto as jest.Mock).mockImplementation(() => {
        throw validationError;
      });

      // Act & Assert
      await expect(controller.login(req, mockLoginDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(validateLoginDto).toHaveBeenCalledWith(mockLoginDto);
      expect(authService.login).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('doit retourner le profil utilisateur', async () => {
      // Arrange
      const req = { user: { id: 'user-id' } };

      // Act
      const result = await controller.getProfile(req);

      // Assert
      expect(authService.getProfile).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(mockUser);
    });
  });
});
