import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
	useUser,
	useRefreshUser,
	usePrefetchUser,
	useHasRole,
	authKeys,
} from '../hooks/auth';
import { authService } from '@/services/authService';
import { useAuthStore } from '../stores/authStore';
import * as reactQuery from '@tanstack/react-query';

// Types
interface User {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	role: string;
}

// Type pour le store d'authentification
interface AuthStore {
	isAuthenticated?: boolean;
	user: User | null;
	setUser?: (user: User) => void;
}

// Mock des modules
vi.mock('@/services/authService', () => ({
	authService: {
		getProfile: vi.fn(),
	},
}));

vi.mock('../stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

vi.mock('@tanstack/react-query', () => ({
	useQuery: vi.fn(),
	useQueryClient: vi.fn(),
}));

describe("Hooks d'authentification", () => {
	let mockUser: User;
	let mockSetUser: ReturnType<typeof vi.fn>;
	let mockQueryClient: {
		invalidateQueries: ReturnType<typeof vi.fn>;
		prefetchQuery: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		// Réinitialisation des mocks
		vi.clearAllMocks();

		// Création d'un utilisateur de test
		mockUser = {
			id: '1',
			firstName: 'Jean',
			lastName: 'Dupont',
			email: 'jean.dupont@example.com',
			role: 'USER',
		};

		// Mock de la fonction setUser
		mockSetUser = vi.fn();

		// Mock du QueryClient
		mockQueryClient = {
			invalidateQueries: vi.fn().mockResolvedValue(undefined),
			prefetchQuery: vi.fn().mockResolvedValue(undefined),
		};

		// Configuration des mocks
		vi.mocked(useAuthStore).mockReturnValue({
			isAuthenticated: true,
			user: null,
			setUser: mockSetUser,
		});

		vi.mocked(authService.getProfile).mockResolvedValue(mockUser as never);

		vi.mocked(reactQuery.useQueryClient).mockReturnValue(
			mockQueryClient as unknown as reactQuery.QueryClient
		);
	});

	describe('useUser', () => {
		it("devrait récupérer le profil utilisateur quand l'utilisateur est authentifié", async () => {
			// Mock du hook useQuery
			vi.mocked(reactQuery.useQuery).mockReturnValue({
				isLoading: true,
				isSuccess: true,
				data: mockUser,
				error: null,
				isError: false,
				isPending: false,
				isLoadingError: false,
				fetchStatus: 'idle',
				refetch: vi.fn().mockResolvedValue({ data: mockUser }),
				status: 'success',
			} as unknown as reactQuery.UseQueryResult<User, Error>);

			// Appel du hook
			const result = useUser();

			// Vérification des propriétés du résultat
			expect(result.isLoading).toBe(true);
			expect(result.isSuccess).toBe(true);
			expect(result.data).toEqual(mockUser);

			// Vérification des paramètres de useQuery
			expect(reactQuery.useQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					queryKey: authKeys.user,
					queryFn: expect.any(Function),
					enabled: true,
				})
			);

			// Récupération et exécution de la fonction queryFn
			const queryFnArg = vi.mocked(reactQuery.useQuery).mock.calls[0][0];
			if (
				queryFnArg &&
				typeof queryFnArg === 'object' &&
				'queryFn' in queryFnArg
			) {
				const queryFn = queryFnArg.queryFn as () => Promise<User>;
				await queryFn();
				expect(authService.getProfile).toHaveBeenCalled();
				expect(mockSetUser).toHaveBeenCalledWith(mockUser);
			}
		});

		it("ne devrait pas effectuer de requête quand l'utilisateur n'est pas authentifié", () => {
			// Mock du store pour un utilisateur non authentifié
			vi.mocked(useAuthStore).mockReturnValue({
				isAuthenticated: false,
				user: null,
				setUser: mockSetUser,
			});

			// Mock du hook useQuery
			vi.mocked(reactQuery.useQuery).mockReturnValue({
				isLoading: false,
				isSuccess: false,
				data: undefined,
				error: null,
				isError: false,
				isPending: false,
				isLoadingError: false,
				fetchStatus: 'idle',
				refetch: vi.fn(),
				status: 'idle',
			} as unknown as reactQuery.UseQueryResult<User, Error>);

			// Appel du hook
			const result = useUser();

			// Vérification
			expect(result.isLoading).toBe(false);
			expect(reactQuery.useQuery).toHaveBeenCalledWith(
				expect.objectContaining({
					enabled: false,
				})
			);
		});

		it('devrait utiliser les données du store si elles existent déjà', () => {
			// Mock du store avec un utilisateur
			vi.mocked(useAuthStore).mockReturnValue({
				isAuthenticated: true,
				user: mockUser,
				setUser: mockSetUser,
			});

			// Mock du hook useQuery
			vi.mocked(reactQuery.useQuery).mockReturnValue({
				isLoading: false,
				isSuccess: true,
				data: mockUser,
				error: null,
				isError: false,
				isPending: false,
				isLoadingError: false,
				fetchStatus: 'idle',
				refetch: vi.fn(),
				status: 'success',
			} as unknown as reactQuery.UseQueryResult<User, Error>);

			// Appel du hook
			const result = useUser();

			// Vérification
			expect(result.data).toEqual(mockUser);

			// Vérification de initialData
			const queryFnArg = vi.mocked(reactQuery.useQuery).mock.calls[0][0];
			if (
				queryFnArg &&
				typeof queryFnArg === 'object' &&
				'initialData' in queryFnArg
			) {
				const initialDataFn = queryFnArg.initialData as () =>
					| User
					| undefined;
				const initialData = initialDataFn();
				expect(initialData).toEqual(mockUser);
			}
		});
	});

	describe('useRefreshUser', () => {
		it('devrait invalider la requête utilisateur', async () => {
			// Appel du hook
			const refreshUser = useRefreshUser();

			// Exécution
			await refreshUser();

			// Vérification
			expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
				queryKey: authKeys.user,
			});
		});
	});

	describe('usePrefetchUser', () => {
		it('devrait précharger les données utilisateur si authentifié', async () => {
			// Appel du hook
			const prefetchUser = usePrefetchUser();

			// Exécution
			await prefetchUser();

			// Vérification
			expect(mockQueryClient.prefetchQuery).toHaveBeenCalledWith({
				queryKey: authKeys.user,
				queryFn: authService.getProfile,
			});
		});

		it('ne devrait pas précharger les données si non authentifié', async () => {
			// Mock du store pour un utilisateur non authentifié
			vi.mocked(useAuthStore).mockReturnValue({
				isAuthenticated: false,
				user: null,
				setUser: mockSetUser,
			});

			// Appel du hook
			const prefetchUser = usePrefetchUser();

			// Exécution
			await prefetchUser();

			// Vérification
			expect(mockQueryClient.prefetchQuery).not.toHaveBeenCalled();
		});
	});

	describe('useHasRole', () => {
		it("devrait retourner true si l'utilisateur a le rôle spécifié", () => {
			// Mock du store avec un utilisateur ayant le bon rôle
			vi.mocked(useAuthStore).mockReturnValue({
				user: { ...mockUser, role: 'ADMIN' },
			} as AuthStore);

			// Vérification
			expect(useHasRole('ADMIN')).toBe(true);
		});

		it("devrait retourner false si l'utilisateur n'a pas le rôle spécifié", () => {
			// Mock du store avec un utilisateur ayant un rôle différent
			vi.mocked(useAuthStore).mockReturnValue({
				user: { ...mockUser, role: 'USER' },
			} as AuthStore);

			// Vérification
			expect(useHasRole('ADMIN')).toBe(false);
		});

		it("devrait retourner false si l'utilisateur n'est pas défini", () => {
			// Mock du store sans utilisateur
			vi.mocked(useAuthStore).mockReturnValue({
				user: null,
			} as AuthStore);

			// Vérification
			expect(useHasRole('ADMIN')).toBe(false);
		});
	});
});
