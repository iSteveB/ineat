import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmailVerificationPending from './EmailVerificationPending';
import { authService } from '@/services/authService';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => navigate,
}));

vi.mock('@/services/authService', () => ({
	authService: { resendVerificationEmail: vi.fn() },
}));

describe('EmailVerificationPending', () => {
	beforeEach(() => vi.clearAllMocks());

	it('affiche l’adresse et applique un cooldown après le renvoi', async () => {
		vi.mocked(authService.resendVerificationEmail).mockResolvedValue();
		render(<EmailVerificationPending email='test@example.com' />);

		expect(screen.getByText('test@example.com')).toBeInTheDocument();
		const button = screen.getByRole('button', { name: "Renvoyer l'email" });
		fireEvent.click(button);
		fireEvent.click(button);

		await waitFor(() =>
			expect(
				screen.getByRole('button', { name: 'Renvoyer dans 60 s' })
			).toBeDisabled()
		);
		expect(authService.resendVerificationEmail).toHaveBeenCalledTimes(1);
	});

	it('affiche une erreur de renvoi sans révéler l’existence du compte', async () => {
		vi.mocked(authService.resendVerificationEmail).mockRejectedValue(
			new Error("Impossible de renvoyer l'email.")
		);
		render(<EmailVerificationPending email='test@example.com' />);

		fireEvent.click(screen.getByRole('button', { name: "Renvoyer l'email" }));

		await waitFor(() =>
			expect(screen.getByTestId('resend-error')).toHaveTextContent(
				"Impossible de renvoyer l'email."
			)
		);
	});
});
