import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HelpPage from './HelpPage';
import { supportService } from '@/services/supportService';

vi.mock('@/stores/authStore', () => ({
	useAuthStore: (selector: (state: unknown) => unknown) =>
		selector({
			user: {
				id: 'user-1',
				firstName: 'Jane',
				lastName: 'Doe',
				email: 'jane@example.com',
			},
		}),
}));

vi.mock('@/services/supportService', async () => {
	const actual = await vi.importActual('@/services/supportService');
	return {
		...actual,
		supportService: { sendMessage: vi.fn() },
	};
});

describe('HelpPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(supportService.sendMessage).mockResolvedValue({
			success: true,
			message: 'Message envoyé',
		});
	});

	it('shows the FAQ and the account email as read-only', () => {
		render(<HelpPage />);

		expect(screen.getByText('Questions fréquentes')).toBeInTheDocument();
		expect(screen.getByDisplayValue('jane@example.com')).toHaveAttribute(
			'readonly'
		);
		expect(
			screen.getByRole('option', { name: 'Proposer une fonctionnalité' })
		).toBeInTheDocument();
	});

	it('adapts the placeholder and sends the selected category', async () => {
		render(<HelpPage />);

		fireEvent.change(screen.getByLabelText('Sujet'), {
			target: { value: 'FEATURE_REQUEST' },
		});
		const message = screen.getByLabelText('Message');
		expect(message).toHaveAttribute(
			'placeholder',
			'Décrivez votre idée et le problème qu’elle vous aiderait à résoudre.'
		);
		fireEvent.change(message, {
			target: { value: 'Je souhaite partager ma liste avec ma famille.' },
		});
		fireEvent.click(screen.getByRole('button', { name: 'Envoyer le message' }));

		await waitFor(() =>
			expect(supportService.sendMessage).toHaveBeenCalledWith(
				'FEATURE_REQUEST',
				'Je souhaite partager ma liste avec ma famille.'
			)
		);
		expect(await screen.findByText('Message envoyé')).toBeInTheDocument();
	});
});
