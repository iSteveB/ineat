import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RegisterForm from './RegisterForm';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { RegisterDataSchema } from '@/schemas';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';

// Mocks pour les dépendances
vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

vi.mock('@/schemas/authSchema', () => ({
	RegisterDataSchema: {
		parse: vi.fn(),
	},
}));

describe('RegisterForm', () => {
	// Préparation des mocks
	const navigateMock = vi.fn();
	const registerMock = vi.fn();
	const loginWithGoogleMock = vi.fn();
	const user = userEvent.setup();

	beforeEach(() => {
		vi.clearAllMocks();

		// Configuration des mocks par défaut
		(useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
			navigateMock
		);
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			register: registerMock,
			loginWithGoogle: loginWithGoogleMock,
			isLoading: false,
			error: null,
		});
		(
			RegisterDataSchema.parse as ReturnType<typeof vi.fn>
		).mockImplementation(() => true);
	});

	it('rend correctement la vue initiale avec le bouton Google et le bouton email', () => {
		render(<RegisterForm />);

		// Vérifier les éléments de la vue initiale
		expect(screen.getByText('Créer un compte')).toBeInTheDocument();
		expect(screen.getByTestId('google-button')).toBeInTheDocument();
		expect(
			screen.getByTestId('show-email-form-button')
		).toBeInTheDocument();
		expect(screen.getByTestId('login-button')).toBeInTheDocument();

		// Vérifier que le formulaire n'est pas encore affiché
		expect(
			screen.queryByTestId('register-email-form')
		).not.toBeInTheDocument();
	});

	it("affiche le formulaire d'inscription par email lorsqu'on clique sur le bouton", async () => {
		render(<RegisterForm />);

		const showFormButton = screen.getByTestId('show-email-form-button');

		// Cliquer sur le bouton d'affichage du formulaire
		await user.click(showFormButton);

		// Vérifier que le formulaire est maintenant affiché
		expect(screen.getByTestId('register-email-form')).toBeInTheDocument();
		expect(screen.getByTestId('firstName-input')).toBeInTheDocument();
		expect(screen.getByTestId('lastName-input')).toBeInTheDocument();
		expect(screen.getByTestId('email-input')).toBeInTheDocument();
		expect(screen.getByTestId('password-input')).toBeInTheDocument();
		expect(screen.getByTestId('profile-type-group')).toBeInTheDocument();
		expect(
			screen.getByTestId('register-submit-button')
		).toBeInTheDocument();

		// Vérifier que le bouton d'affichage du formulaire n'est plus visible
		expect(
			screen.queryByTestId('show-email-form-button')
		).not.toBeInTheDocument();
	});

	it("s'inscrit avec Google lorsqu'on clique sur le bouton correspondant", async () => {
		render(<RegisterForm />);

		const googleButton = screen.getByTestId('google-button');

		// Cliquer sur le bouton d'inscription avec Google
		await user.click(googleButton);

		// Vérifier que la fonction loginWithGoogle a été appelée
		expect(loginWithGoogleMock).toHaveBeenCalledTimes(1);
	});

	it("navigue vers la page de connexion lorsqu'on clique sur le lien correspondant", async () => {
		render(<RegisterForm />);

		const loginButton = screen.getByTestId('login-button');

		// Cliquer sur le bouton de connexion
		await user.click(loginButton);

		// Vérifier que la fonction navigate a été appelée avec la bonne destination
		expect(navigateMock).toHaveBeenCalledWith({ to: '/login' });
	});

	it('soumet le formulaire avec les données correctes', async () => {
		render(<RegisterForm />);

		// Afficher le formulaire
		const showFormButton = screen.getByTestId('show-email-form-button');
		await user.click(showFormButton);

		// Remplir le formulaire
		const firstNameInput = screen.getByTestId('firstName-input');
		const lastNameInput = screen.getByTestId('lastName-input');
		const emailInput = screen.getByTestId('email-input');
		const passwordInput = screen.getByTestId('password-input');
		const submitButton = screen.getByTestId('register-submit-button');

		await user.type(firstNameInput, 'John');
		await user.type(lastNameInput, 'Doe');
		await user.type(emailInput, 'john.doe@example.com');
		await user.type(passwordInput, 'Password123');

		// Par défaut, le type de profil est déjà défini à 'FAMILY'

		// Simuler une inscription réussie
		registerMock.mockResolvedValue({ success: true });

		// Soumettre le formulaire
		await user.click(submitButton);

		// Vérifier que la fonction register a été appelée avec les bonnes données
		expect(registerMock).toHaveBeenCalledWith({
			firstName: 'John',
			lastName: 'Doe',
			email: 'john.doe@example.com',
			password: 'Password123',
			profileType: 'FAMILY',
		});

		// Vérifier que la redirection a été appelée
		await waitFor(() => {
			expect(navigateMock).toHaveBeenCalledWith({ to: '/app' });
		});
	});

	it('permet de changer le type de profil', async () => {
		render(<RegisterForm />);

		// Afficher le formulaire
		const showFormButton = screen.getByTestId('show-email-form-button');
		await user.click(showFormButton);

		// Par défaut, 'FAMILY' est sélectionné
		const studentRadio = screen.getByTestId('profile-type-student');

		// Changer le type de profil à 'STUDENT'
		await user.click(studentRadio);

		// Remplir le reste du formulaire
		const firstNameInput = screen.getByTestId('firstName-input');
		const lastNameInput = screen.getByTestId('lastName-input');
		const emailInput = screen.getByTestId('email-input');
		const passwordInput = screen.getByTestId('password-input');
		const submitButton = screen.getByTestId('register-submit-button');

		await user.type(firstNameInput, 'John');
		await user.type(lastNameInput, 'Doe');
		await user.type(emailInput, 'john.doe@example.com');
		await user.type(passwordInput, 'Password123');

		// Simuler une inscription réussie
		registerMock.mockResolvedValue({ success: true });

		// Soumettre le formulaire
		await user.click(submitButton);

		// Vérifier que la fonction register a été appelée avec le bon type de profil
		expect(registerMock).toHaveBeenCalledWith({
			firstName: 'John',
			lastName: 'Doe',
			email: 'john.doe@example.com',
			password: 'Password123',
			profileType: 'STUDENT',
		});
	});

	it('affiche une erreur si la validation du formulaire échoue', async () => {
		// Créer une instance typée de ZodError
		const zodErrors: z.ZodIssue[] = [
			{
				code: 'too_small',
				path: ['password'],
				message: 'Le mot de passe doit contenir au moins 8 caractères',
				minimum: 8,
				type: 'string',
				inclusive: true,
			},
		];

		const validationError = new z.ZodError(zodErrors);

		// Faire échouer la validation
		(
			RegisterDataSchema.parse as ReturnType<typeof vi.fn>
		).mockImplementation(() => {
			throw validationError;
		});

		render(<RegisterForm />);

		// Afficher le formulaire
		const showFormButton = screen.getByTestId('show-email-form-button');
		await user.click(showFormButton);

		// Remplir le formulaire avec un mot de passe trop court
		const firstNameInput = screen.getByTestId('firstName-input');
		const lastNameInput = screen.getByTestId('lastName-input');
		const emailInput = screen.getByTestId('email-input');
		const passwordInput = screen.getByTestId('password-input');
		const form = screen.getByTestId('register-email-form');

		await user.type(firstNameInput, 'John');
		await user.type(lastNameInput, 'Doe');
		await user.type(emailInput, 'john.doe@example.com');
		await user.type(passwordInput, 'abc');

		// Soumettre le formulaire
		fireEvent.submit(form);

		// Vérifier que l'erreur est affichée
		await waitFor(() => {
			expect(screen.getByTestId('error-container')).toBeInTheDocument();
			expect(screen.getByTestId('error-message')).toHaveTextContent(
				'Le mot de passe doit contenir au moins 8 caractères'
			);
		});

		// Vérifier que la fonction register n'a pas été appelée
		expect(registerMock).not.toHaveBeenCalled();
	});

	it("affiche une erreur provenant du store d'authentification", async () => {
		// Simuler une erreur dans le store d'authentification
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			register: registerMock,
			loginWithGoogle: loginWithGoogleMock,
			isLoading: false,
			error: 'Cette adresse email est déjà utilisée',
		});

		render(<RegisterForm />);

		// Vérifier que l'erreur est affichée
		expect(screen.getByTestId('error-container')).toBeInTheDocument();
		expect(screen.getByTestId('error-message')).toHaveTextContent(
			'Cette adresse email est déjà utilisée'
		);
	});

	it('désactive les champs du formulaire pendant le chargement', async () => {
		// D'abord, rendre le composant avec l'état normal
		const { rerender } = render(<RegisterForm />);

		// Afficher le formulaire
		const showFormButton = screen.getByTestId('show-email-form-button');
		await user.click(showFormButton);

		// Vérifier que le formulaire est maintenant affiché et les champs sont activés
		expect(screen.getByTestId('register-email-form')).toBeInTheDocument();
		expect(screen.getByTestId('firstName-input')).not.toBeDisabled();
		expect(screen.getByTestId('lastName-input')).not.toBeDisabled();
		expect(screen.getByTestId('email-input')).not.toBeDisabled();
		expect(screen.getByTestId('password-input')).not.toBeDisabled();
		expect(screen.getByTestId('register-submit-button')).not.toBeDisabled();

		// Maintenant, changer le mock pour simuler l'état de chargement
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			register: registerMock,
			loginWithGoogle: loginWithGoogleMock,
			isLoading: true,
			error: null,
		});

		// Re-rendre le composant avec le même état (showForm reste true en raison de l'état React persistant entre les re-rendus)
		rerender(<RegisterForm />);

		// Vérifier que tous les champs du formulaire sont désactivés
		expect(screen.getByTestId('firstName-input')).toBeDisabled();
		expect(screen.getByTestId('lastName-input')).toBeDisabled();
		expect(screen.getByTestId('email-input')).toBeDisabled();
		expect(screen.getByTestId('password-input')).toBeDisabled();
		expect(screen.getByTestId('register-submit-button')).toBeDisabled();

		// Vérifier que le texte du bouton d'inscription indique l'état de chargement
		expect(screen.getByTestId('register-submit-button')).toHaveTextContent(
			'Inscription en cours...'
		);
	});

	it('efface les erreurs lors de la modification des champs', async () => {
		// Créer une instance typée de ZodError
		const zodErrors: z.ZodIssue[] = [
			{
				code: 'too_small',
				path: ['password'],
				message: 'Le mot de passe doit contenir au moins 8 caractères',
				minimum: 8,
				type: 'string',
				inclusive: true,
			},
		];

		const validationError = new z.ZodError(zodErrors);

		// Faire échouer la validation lors du premier appel uniquement
		(RegisterDataSchema.parse as ReturnType<typeof vi.fn>)
			.mockImplementationOnce(() => {
				throw validationError;
			})
			.mockImplementation(() => true);

		render(<RegisterForm />);

		// Afficher le formulaire
		const showFormButton = screen.getByTestId('show-email-form-button');
		await user.click(showFormButton);

		// Remplir le formulaire avec un mot de passe trop court
		const firstNameInput = screen.getByTestId('firstName-input');
		const lastNameInput = screen.getByTestId('lastName-input');
		const emailInput = screen.getByTestId('email-input');
		const passwordInput = screen.getByTestId('password-input');
		const form = screen.getByTestId('register-email-form');

		await user.type(firstNameInput, 'John');
		await user.type(lastNameInput, 'Doe');
		await user.type(emailInput, 'john.doe@example.com');
		await user.type(passwordInput, 'abc');

		// Soumettre le formulaire pour générer une erreur
		fireEvent.submit(form);

		// Vérifier que l'erreur est affichée
		await waitFor(() => {
			expect(screen.getByTestId('error-container')).toBeInTheDocument();
		});

		// Modifier un champ pour effacer l'erreur
		await user.type(passwordInput, 'password123');

		// Vérifier que l'erreur a disparu
		expect(screen.queryByTestId('error-container')).not.toBeInTheDocument();
	});
});
