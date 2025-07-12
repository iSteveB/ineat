import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginForm from './LoginForm';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import userEvent from '@testing-library/user-event';
import { LoginCredentialsSchema } from '@/schemas';
import { z } from 'zod';

// Mocks pour les dépendances
vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(),
	useSearch: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

vi.mock('../../schemas/authSchema', () => ({
	LoginCredentialsSchema: {
		parse: vi.fn(),
	},
}));

describe('LoginForm', () => {
	// Préparation des mocks
	const navigateMock = vi.fn();
	const loginMock = vi.fn();
	const loginWithGoogleMock = vi.fn();
	const user = userEvent.setup();

	beforeEach(() => {
		vi.clearAllMocks();

		// Configuration des mocks par défaut
		(useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
			navigateMock
		);
		(useSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({});
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			login: loginMock,
			loginWithGoogle: loginWithGoogleMock,
			isLoading: false,
			error: null,
		});
		(
			LoginCredentialsSchema.parse as ReturnType<typeof vi.fn>
		).mockImplementation(() => true);
	});

	it('rend correctement le formulaire initial', () => {
		render(<LoginForm />);

		// Vérifier les éléments du formulaire
		expect(screen.getByText('Connexion')).toBeInTheDocument();
		expect(screen.getByTestId('email-input')).toBeInTheDocument();
		expect(screen.getByTestId('password-input')).toBeInTheDocument();
		expect(screen.getByTestId('submit-button')).toBeInTheDocument();
		expect(screen.getByTestId('google-button')).toBeInTheDocument();
		expect(
			screen.getByTestId('forgot-password-button')
		).toBeInTheDocument();
		expect(screen.getByTestId('register-button')).toBeInTheDocument();

		// Vérifier qu'il n'y a pas d'alerte d'erreur initialement
		expect(screen.queryByTestId('error-container')).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('session-expired-alert')
		).not.toBeInTheDocument();
	});

	it('affiche une alerte si la session a expiré', () => {
		// Simuler un paramètre de recherche indiquant une session expirée
		(useSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			session: 'expired',
		});

		render(<LoginForm />);

		// Vérifier que l'alerte de session expirée est présente
		const sessionAlert = screen.getByTestId('session-expired-alert');
		expect(sessionAlert).toBeInTheDocument();
		expect(sessionAlert).toHaveTextContent('Votre session a expiré');
	});

	it('soumet le formulaire avec des identifiants valides', async () => {
		// Simuler une connexion réussie
		loginMock.mockResolvedValue({ success: true });

		render(<LoginForm />);

		const emailInput = screen.getByTestId('email-input');
		const passwordInput = screen.getByTestId('password-input');
		const submitButton = screen.getByTestId('submit-button');

		// Remplir le formulaire
		await user.type(emailInput, 'utilisateur@exemple.com');
		await user.type(passwordInput, 'motDePasse123');

		// Soumettre le formulaire
		await user.click(submitButton);

		// Vérifier que la fonction login a été appelée avec les bonnes informations
		expect(loginMock).toHaveBeenCalledWith({
			email: 'utilisateur@exemple.com',
			password: 'motDePasse123',
		});

		// Vérifier que la redirection a été appelée
		await waitFor(() => {
			expect(navigateMock).toHaveBeenCalledWith({ to: '/app' });
		});
	});

	it("redirige vers l'URL spécifiée après connexion réussie", async () => {
		// Simuler un paramètre de redirection et une connexion réussie
		(useSearch as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			redirect: encodeURIComponent('/dashboard/inventory'),
		});
		loginMock.mockResolvedValue({ success: true });

		render(<LoginForm />);

		const emailInput = screen.getByTestId('email-input');
		const passwordInput = screen.getByTestId('password-input');
		const submitButton = screen.getByTestId('submit-button');

		// Remplir le formulaire
		await user.type(emailInput, 'utilisateur@exemple.com');
		await user.type(passwordInput, 'motDePasse123');

		// Soumettre le formulaire
		await user.click(submitButton);

		// Vérifier que la redirection a été appelée avec l'URL décodée
		await waitFor(() => {
			expect(navigateMock).toHaveBeenCalledWith({
				to: '/dashboard/inventory',
			});
		});
	});

	it('affiche une erreur si la validation du formulaire échoue', async () => {
		// Créer une instance typée de ZodError
		const zodErrors: z.ZodIssue[] = [
			{
				code: 'custom',
				path: ['password'],
				message: 'Le mot de passe doit contenir au moins 8 caractères',
			},
		];

		const validationError = new z.ZodError(zodErrors);

		// Modifier directement l'implémentation pour garantir que validateForm échoue
		(
			LoginCredentialsSchema.parse as ReturnType<typeof vi.fn>
		).mockImplementation(() => {
			throw validationError;
		});

		const { rerender } = render(<LoginForm />);

		// Soumettre le formulaire directement via l'événement submit
		const form = screen.getByTestId('login-form');
		fireEvent.submit(form);

		// Forcer un re-rendu pour s'assurer que l'état est mis à jour
		rerender(<LoginForm />);

		// Attendre et vérifier que l'erreur s'affiche
		await waitFor(() => {
			expect(screen.getByTestId('error-container')).toBeInTheDocument();
		});

		// Vérifier le contenu de l'erreur
		expect(screen.getByTestId('error-message')).toHaveTextContent(
			'Le mot de passe doit contenir au moins 8 caractères'
		);

		// Vérifier que la fonction login n'a pas été appelée
		expect(loginMock).not.toHaveBeenCalled();
	});

	it("affiche une erreur provenant du store d'authentification", async () => {
		// Simuler une erreur dans le store d'authentification
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			login: loginMock,
			loginWithGoogle: loginWithGoogleMock,
			isLoading: false,
			error: 'Identifiants incorrects',
		});

		render(<LoginForm />);

		// Vérifier que l'erreur est affichée
		expect(screen.getByTestId('error-container')).toBeInTheDocument();
		expect(screen.getByTestId('error-message')).toHaveTextContent(
			'Identifiants incorrects'
		);
	});

	it('désactive les contrôles pendant le chargement', async () => {
		// Simuler l'état de chargement
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			login: loginMock,
			loginWithGoogle: loginWithGoogleMock,
			isLoading: true,
			error: null,
		});

		render(<LoginForm />);

		// Vérifier que tous les contrôles sont désactivés
		expect(screen.getByTestId('email-input')).toBeDisabled();
		expect(screen.getByTestId('password-input')).toBeDisabled();
		expect(screen.getByTestId('submit-button')).toBeDisabled();
		expect(screen.getByTestId('google-button')).toBeDisabled();
		expect(screen.getByTestId('forgot-password-button')).toBeDisabled();
		expect(screen.getByTestId('register-button')).toBeDisabled();

		// Vérifier que le texte du bouton de connexion indique le chargement
		expect(screen.getByTestId('submit-button')).toHaveTextContent(
			'Connexion en cours...'
		);
	});

	it("appelle loginWithGoogle lorsqu'on clique sur le bouton Google", async () => {
		render(<LoginForm />);

		const googleButton = screen.getByTestId('google-button');

		// Cliquer sur le bouton Google
		await user.click(googleButton);

		// Vérifier que la fonction loginWithGoogle a été appelée
		expect(loginWithGoogleMock).toHaveBeenCalledTimes(1);
	});

	it('navigue vers la page de récupération de mot de passe', async () => {
		render(<LoginForm />);

		const forgotPasswordButton = screen.getByTestId(
			'forgot-password-button'
		);

		// Cliquer sur le bouton "Mot de passe oublié"
		await user.click(forgotPasswordButton);

		// Vérifier que la navigation a été appelée
		expect(navigateMock).toHaveBeenCalledWith({ to: '/forgot-password' });
	});

	it("navigue vers la page d'inscription", async () => {
		render(<LoginForm />);

		const registerButton = screen.getByTestId('register-button');

		// Cliquer sur le bouton "S'inscrire"
		await user.click(registerButton);

		// Vérifier que la navigation a été appelée
		expect(navigateMock).toHaveBeenCalledWith({ to: '/register' });
	});

	it('efface les erreurs lors de la modification des champs', async () => {
		// Créer une instance typée de ZodError
		const zodErrors: z.ZodIssue[] = [
			{
				code: 'custom',
				path: ['email'],
				message: 'Email invalide',
			},
		];

		const validationError = new z.ZodError(zodErrors);

		// Faire échouer la validation lors du premier appel uniquement
		(LoginCredentialsSchema.parse as ReturnType<typeof vi.fn>)
			.mockImplementationOnce(() => {
				throw validationError;
			})
			.mockImplementation(() => true);

		const { rerender } = render(<LoginForm />);

		// Soumettre le formulaire pour générer une erreur
		const form = screen.getByTestId('login-form');
		fireEvent.submit(form);

		// Forcer un re-rendu
		rerender(<LoginForm />);

		// Vérifier que l'erreur est affichée
		await waitFor(() => {
			expect(screen.getByTestId('error-container')).toBeInTheDocument();
		});

		// Modifier l'email et forcer un re-rendu pour voir les changements
		const emailInput = screen.getByTestId('email-input');
		await user.type(emailInput, 'nouvel.email@exemple.com');
		rerender(<LoginForm />);

		// Vérifier que l'erreur a disparu
		expect(screen.queryByTestId('error-container')).not.toBeInTheDocument();
	});
});
