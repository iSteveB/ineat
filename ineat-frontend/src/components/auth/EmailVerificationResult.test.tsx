import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EmailVerificationResult from './EmailVerificationResult';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
	Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => (
		<a href={to} {...props}>
			{children}
		</a>
	),
	useNavigate: () => navigate,
}));

describe('EmailVerificationResult', () => {
	beforeEach(() => vi.clearAllMocks());

	it('confirme une vérification réussie et ouvre l’application', () => {
		render(<EmailVerificationResult />);

		expect(screen.getByText('Adresse email vérifiée')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Continuer vers InEat' })).toHaveAttribute(
			'href',
			'/app'
		);
	});

	it('explique un lien expiré sans afficher le détail technique', () => {
		render(<EmailVerificationResult error='TOKEN_EXPIRED' />);

		expect(screen.getByText('Ce lien de vérification a expiré.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Retour à la connexion' })).toHaveAttribute(
			'href',
			'/login'
		);
	});
});
