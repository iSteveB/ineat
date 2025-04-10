import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ForgotPasswordForm from './ForgotPasswordForm';
import { useNavigate } from '@tanstack/react-router';
import { apiClient } from '../../lib/api-client';
import userEvent from '@testing-library/user-event';

// Mocks pour les dépendances
vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(),
}));

vi.mock('../../lib/api-client', () => ({
	apiClient: {
		post: vi.fn(),
	},
}));

describe('ForgotPasswordForm', () => {
	const navigateMock = vi.fn();
	const user = userEvent.setup();

	beforeEach(() => {
		vi.clearAllMocks();
		(useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
			navigateMock
		);
	});

	it('rend correctement le formulaire initial', () => {
		render(<ForgotPasswordForm />);

		// Vérifier les éléments du formulaire
		expect(
			screen.getByText('Réinitialisation de mot de passe')
		).toBeInTheDocument();
		expect(screen.getByLabelText('Email')).toBeInTheDocument();
		expect(
			screen.getByPlaceholderText('votre.email@exemple.com')
		).toBeInTheDocument();
		expect(
			screen.getByText('Envoyer le lien de réinitialisation')
		).toBeInTheDocument();
		expect(screen.getByText('Retour à la connexion')).toBeInTheDocument();

		// Vérifier qu'il n'y a pas d'alerte d'erreur ou de succès initialement
		expect(screen.queryByTestId('error-alert')).not.toBeInTheDocument();
		expect(screen.queryByTestId('success-alert')).not.toBeInTheDocument();
	});

	it('affiche une erreur avec un email invalide', async () => {
		const { rerender } = render(<ForgotPasswordForm />);

		const emailInput = screen.getByTestId('email-input');
		//const submitButton = screen.getByTestId('submit-button');
		const form = screen.getByTestId('reset-form');

		// Saisir un email invalide en utilisant directement fireEvent pour plus de contrôle
		await user.type(emailInput, 'email-invalide');

		// Soumettre le formulaire directement plutôt que de cliquer sur le bouton
		form.dispatchEvent(
			new Event('submit', { cancelable: true, bubbles: true })
		);

		// Forcer le re-rendu pour s'assurer que l'état est mis à jour
		rerender(<ForgotPasswordForm />);

		// Attendre et vérifier que l'erreur s'affiche
		await waitFor(() => {
			expect(screen.queryByTestId('error-container')).toBeInTheDocument();
		});

		// Vérifier le contenu de l'erreur
		const errorMessage = screen.getByTestId('error-message');
		expect(errorMessage).toHaveTextContent("Format d'email invalide");
	});

	it("affiche une erreur si l'email est vide", async () => {
		const { rerender } = render(<ForgotPasswordForm />);

		const form = screen.getByTestId('reset-form');

		// Soumettre le formulaire avec un email vide
		form.dispatchEvent(
			new Event('submit', { cancelable: true, bubbles: true })
		);

		// Forcer le re-rendu pour s'assurer que l'état est mis à jour
		rerender(<ForgotPasswordForm />);

		// Attendre et vérifier que l'erreur s'affiche
		await waitFor(() => {
			expect(screen.queryByTestId('error-container')).toBeInTheDocument();
		});

		// Vérifier le contenu de l'erreur
		const errorMessage = screen.getByTestId('error-message');
		expect(errorMessage).toHaveTextContent("L'email est requis");
	});

	it('soumet le formulaire avec un email valide et affiche le message de succès', async () => {
		// Mock de la réponse API réussie
		(apiClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: true,
		});

		render(<ForgotPasswordForm />);

		const emailInput = screen.getByTestId('email-input');
		const submitButton = screen.getByTestId('submit-button');

		// Saisir un email valide
		await user.type(emailInput, 'utilisateur@exemple.com');
		await user.click(submitButton);

		// Vérifier que l'API a été appelée avec les bons paramètres
		await waitFor(() => {
			expect(apiClient.post).toHaveBeenCalledWith(
				'/auth/forgot-password',
				{
					email: 'utilisateur@exemple.com',
				}
			);
		});

		// Vérifier que le message de succès s'affiche
		await waitFor(() => {
			expect(screen.getByTestId('success-alert')).toBeInTheDocument();
		});

		// Vérifier que le formulaire n'est plus affiché
		expect(screen.queryByTestId('reset-form')).not.toBeInTheDocument();
	});

	it("affiche une erreur si l'API renvoie une erreur", async () => {
		// Mock de l'erreur API
		const errorMessage = 'Impossible de se connecter au serveur';
		(apiClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error(errorMessage)
		);

		render(<ForgotPasswordForm />);

		const emailInput = screen.getByTestId('email-input');
		const submitButton = screen.getByTestId('submit-button');

		// Saisir un email valide
		await user.type(emailInput, 'utilisateur@exemple.com');
		await user.click(submitButton);

		// Vérifier que l'erreur s'affiche
		await waitFor(() => {
			expect(screen.getByTestId('error-alert')).toBeInTheDocument();
		});

		// Vérifier le contenu de l'erreur
		const errorMessageContent = screen.getByTestId('error-message');
		expect(errorMessageContent).toHaveTextContent(errorMessage);
	});

	it('désactive les contrôles pendant le chargement', async () => {
		// Mock d'une réponse API lente
		(apiClient.post as ReturnType<typeof vi.fn>).mockImplementation(() => {
			return new Promise((resolve) => {
				setTimeout(() => resolve({ success: true }), 100);
			});
		});

		render(<ForgotPasswordForm />);

		const emailInput = screen.getByTestId('email-input');
		const submitButton = screen.getByTestId('submit-button');

		// Saisir un email valide
		await user.type(emailInput, 'utilisateur@exemple.com');
		await user.click(submitButton);

		// Vérifier que le bouton affiche l'état de chargement et est désactivé
		expect(screen.getByText('Envoi en cours...')).toBeInTheDocument();
		expect(submitButton).toBeDisabled();
		expect(emailInput).toBeDisabled();

		// Vérifier que le lien de retour est désactivé
		const retourLink = screen.getByTestId('back-to-login');
		expect(retourLink).toBeDisabled();

		// Attendre que le chargement soit terminé
		await waitFor(() => {
			expect(screen.getByTestId('success-alert')).toBeInTheDocument();
		});
	});

	it('navigue vers la page de connexion lorsqu\'on clique sur "Retour à la connexion"', async () => {
		render(<ForgotPasswordForm />);

		const retourLink = screen.getByTestId('back-to-login');
		await user.click(retourLink);

		expect(navigateMock).toHaveBeenCalledWith({ to: '/login' });
	});

	it("efface l'erreur lors de la modification de l'email", async () => {
		const { rerender } = render(<ForgotPasswordForm />);

		const emailInput = screen.getByTestId('email-input');
		const form = screen.getByTestId('reset-form');

		// Saisir un email invalide
		await user.type(emailInput, 'email-invalide');

		// Soumettre le formulaire directement
		form.dispatchEvent(
			new Event('submit', { cancelable: true, bubbles: true })
		);

		// Forcer le re-rendu pour s'assurer que l'état est mis à jour
		rerender(<ForgotPasswordForm />);

		// Attendre que l'erreur s'affiche
		await waitFor(() => {
			expect(screen.queryByTestId('error-container')).toBeInTheDocument();
		});

		// Modifier l'email - cela devrait effacer l'erreur
		await user.clear(emailInput);
		await user.type(emailInput, 'email-modifie@exemple.com');

		// Forcer un nouveau re-rendu pour s'assurer que l'état est mis à jour
		rerender(<ForgotPasswordForm />);

		// Vérifier que l'erreur a disparu
		expect(screen.queryByTestId('error-container')).not.toBeInTheDocument();
	});
});
