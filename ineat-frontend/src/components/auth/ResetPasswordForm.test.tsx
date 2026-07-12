import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useNavigate } from '@tanstack/react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authClient } from '@/lib/auth-client';
import ResetPasswordForm from './ResetPasswordForm';

vi.mock('@tanstack/react-router', () => ({
	useNavigate: vi.fn(),
}));

vi.mock('@/lib/auth-client', () => ({
	authClient: {
		resetPassword: vi.fn(),
	},
}));

describe('ResetPasswordForm', () => {
	const navigateMock = vi.fn();
	const user = userEvent.setup();

	beforeEach(() => {
		vi.clearAllMocks();
		(useNavigate as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
			navigateMock
		);
	});

	it('affiche une erreur si le token est absent', () => {
		render(<ResetPasswordForm />);

		expect(screen.getByTestId('error-message')).toHaveTextContent(
			'Le lien de réinitialisation est incomplet.'
		);
		expect(screen.getByTestId('submit-button')).toBeDisabled();
	});

	it('réinitialise le mot de passe avec un token valide', async () => {
		(authClient.resetPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
			error: null,
		});

		render(<ResetPasswordForm token='reset-token' />);

		await user.type(screen.getByTestId('password-input'), 'Password123');
		await user.type(
			screen.getByTestId('confirm-password-input'),
			'Password123'
		);
		await user.click(screen.getByTestId('submit-button'));

		await waitFor(() => {
			expect(authClient.resetPassword).toHaveBeenCalledWith({
				newPassword: 'Password123',
				token: 'reset-token',
			});
		});
		expect(screen.getByTestId('success-alert')).toBeInTheDocument();
	});

	it('affiche une erreur quand les mots de passe ne correspondent pas', async () => {
		render(<ResetPasswordForm token='reset-token' />);

		await user.type(screen.getByTestId('password-input'), 'Password123');
		await user.type(
			screen.getByTestId('confirm-password-input'),
			'Different123'
		);
		await user.click(screen.getByTestId('submit-button'));

		expect(screen.getByTestId('error-message')).toHaveTextContent(
			'Les mots de passe ne correspondent pas'
		);
		expect(authClient.resetPassword).not.toHaveBeenCalled();
	});

	it('affiche une erreur si Better Auth rejette le token', async () => {
		(authClient.resetPassword as ReturnType<typeof vi.fn>).mockResolvedValue({
			error: { code: 'INVALID_TOKEN' },
		});

		render(<ResetPasswordForm token='expired-token' />);

		await user.type(screen.getByTestId('password-input'), 'Password123');
		await user.type(
			screen.getByTestId('confirm-password-input'),
			'Password123'
		);
		await user.click(screen.getByTestId('submit-button'));

		await waitFor(() => {
			expect(screen.getByTestId('error-message')).toHaveTextContent(
				'Le lien de réinitialisation est invalide ou a expiré.'
			);
		});
	});
});
