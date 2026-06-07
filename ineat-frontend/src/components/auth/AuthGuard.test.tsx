import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AuthGuard from './AuthGuard';
import { useAuthStore } from '@/stores/authStore';
import { useLocation, useNavigate } from '@tanstack/react-router';

// Mocks pour les dépendances
vi.mock('@tanstack/react-router', () => ({
	Outlet: vi.fn(() => (
		<div data-testid='outlet-content'>Protected Content</div>
	)),
	useLocation: vi.fn(),
	useNavigate: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

vi.mock('../ui/spinner', () => ({
	default: () => <div data-testid='spinner'>Loading...</div>,
}));

describe('AuthGuard', () => {
	// Configuration pour les tests
	const mockCheckAuthentication = vi.fn();
	const mockLocation = {
		pathname: '/dashboard',
		search: '?param=value',
	};
	const navigateMock = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Configuration des mocks par défaut
		(useLocation as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
			mockLocation
		);
		(useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
			navigateMock
		);
	});

	it('affiche un spinner pendant la vérification', async () => {
		// Configuration du store avec authentification en cours
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			checkAuthentication: () => new Promise(() => {}), // Promise qui ne se résout jamais pour maintenir l'état de chargement
		});

		render(<AuthGuard />);

		// Le spinner devrait être visible
		expect(screen.getByTestId('spinner')).toBeInTheDocument();

		// L'Outlet ne devrait pas encore être rendu
		expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument();
	});

	it("redirige vers la landing si l'utilisateur n'est pas authentifié côté serveur", async () => {
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			checkAuthentication: mockCheckAuthentication.mockResolvedValue(false),
		});

		// Rendre le composant - nous ne pouvons pas capturer directement l'erreur de redirection
		// car elle est lancée dans un useEffect
		render(<AuthGuard />);

		// Attendre que la redirection soit appelée
		await waitFor(() => {
			expect(navigateMock).toHaveBeenCalledWith({
				to: '/',
				search: {
					redirect: encodeURIComponent('/dashboard?param=value'),
				},
				replace: true,
			});
		});

		expect(mockCheckAuthentication).toHaveBeenCalledTimes(1);
	});

	it("redirige si la vérification d'authentification échoue", async () => {
		// Configuration du store avec authentification locale mais vérification serveur qui échoue
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			user: { id: '1', name: 'Test User' },
			checkAuthentication: vi.fn().mockResolvedValue(false),
		});

		// Rendre le composant
		render(<AuthGuard />);

		// Attendre que la vérification asynchrone se termine
		await waitFor(() => {
			// Vérifier que redirect a été appelé avec les bons paramètres
			expect(navigateMock).toHaveBeenCalledWith({
				to: '/',
				search: {
					redirect: encodeURIComponent('/dashboard?param=value'),
					session: 'expired',
				},
				replace: true,
			});
		});
	});

	it("redirige si la vérification d'authentification génère une erreur", async () => {
		// Configuration du store avec authentification locale mais vérification serveur qui échoue avec une erreur
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			checkAuthentication: vi
				.fn()
				.mockRejectedValue(new Error('Auth verification failed')),
		});

		// Rendre le composant
		render(<AuthGuard />);

		// Attendre que la vérification asynchrone se termine
		await waitFor(() => {
			// Vérifier que redirect a été appelé avec les bons paramètres
			expect(navigateMock).toHaveBeenCalledWith({
				to: '/',
				search: {
					redirect: encodeURIComponent('/dashboard?param=value'),
					session: 'expired',
				},
				replace: true,
			});
		});
	});

	it("rend les composants enfants si l'authentification réussit", async () => {
		// Configuration du store avec authentification réussie
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			checkAuthentication: vi.fn().mockResolvedValue(true),
		});

		render(<AuthGuard />);

		// Initialement, le spinner devrait être visible
		expect(screen.getByTestId('spinner')).toBeInTheDocument();

		// Après la vérification, l'Outlet devrait être rendu
		await waitFor(() => {
			expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
			expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
		});
	});
});
