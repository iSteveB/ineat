import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmailVerificationResult from './EmailVerificationResult';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => navigate,
}));

describe('EmailVerificationResult', () => {
	beforeEach(() => vi.clearAllMocks());

	it('confirme une vérification réussie et ouvre l’application', () => {
		render(<EmailVerificationResult />);

		expect(screen.getByText('Adresse email vérifiée')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Continuer vers InEat' }));
		expect(navigate).toHaveBeenCalledWith({ to: '/app' });
	});

	it('explique un lien expiré sans afficher le détail technique', () => {
		render(<EmailVerificationResult error='TOKEN_EXPIRED' />);

		expect(screen.getByText('Ce lien de vérification a expiré.')).toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Retour à la connexion' }));
		expect(navigate).toHaveBeenCalledWith({ to: '/login' });
	});
});
