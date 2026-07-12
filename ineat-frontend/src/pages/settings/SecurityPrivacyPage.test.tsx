import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { userService } from '@/services/userService';
import SecurityPrivacyPage from './SecurityPrivacyPage';

vi.mock('@tanstack/react-router', () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn((selector) => selector({ logout: vi.fn() })),
}));

vi.mock('@/services/userService', () => ({
	userService: {
		updatePassword: vi.fn(),
	},
}));

vi.mock('sonner', () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

describe('SecurityPrivacyPage password update', () => {
	const user = userEvent.setup();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('appelle le service réel et vide les champs après succès', async () => {
		(userService.updatePassword as ReturnType<typeof vi.fn>).mockResolvedValue(
			{
				success: true,
				message: 'Mot de passe mis à jour avec succès',
			}
		);

		render(<SecurityPrivacyPage />);

		await user.type(screen.getByLabelText('Mot de passe actuel'), 'OldPass123');
		await user.type(screen.getByLabelText('Nouveau mot de passe'), 'NewPass123');
		await user.type(
			screen.getByLabelText('Confirmer le mot de passe'),
			'NewPass123'
		);
		await user.click(
			screen.getByRole('button', {
				name: 'Mettre à jour le mot de passe',
			})
		);

		await waitFor(() => {
			expect(userService.updatePassword).toHaveBeenCalledWith({
				currentPassword: 'OldPass123',
				newPassword: 'NewPass123',
			});
		});
		expect(toast.success).toHaveBeenCalledWith(
			'Mot de passe mis à jour avec succès'
		);
		expect(screen.getByLabelText('Mot de passe actuel')).toHaveValue('');
		expect(screen.getByLabelText('Nouveau mot de passe')).toHaveValue('');
		expect(screen.getByLabelText('Confirmer le mot de passe')).toHaveValue('');
	});

	it("affiche l'erreur et conserve les champs en cas d'échec", async () => {
		(userService.updatePassword as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error('Le mot de passe actuel est incorrect')
		);

		render(<SecurityPrivacyPage />);

		await user.type(screen.getByLabelText('Mot de passe actuel'), 'OldPass123');
		await user.type(screen.getByLabelText('Nouveau mot de passe'), 'NewPass123');
		await user.type(
			screen.getByLabelText('Confirmer le mot de passe'),
			'NewPass123'
		);
		await user.click(
			screen.getByRole('button', {
				name: 'Mettre à jour le mot de passe',
			})
		);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				'Le mot de passe actuel est incorrect'
			);
		});
		expect(screen.getByLabelText('Mot de passe actuel')).toHaveValue(
			'OldPass123'
		);
		expect(screen.getByLabelText('Nouveau mot de passe')).toHaveValue(
			'NewPass123'
		);
		expect(screen.getByLabelText('Confirmer le mot de passe')).toHaveValue(
			'NewPass123'
		);
	});

	it('bloque le submit quand la confirmation ne correspond pas', async () => {
		render(<SecurityPrivacyPage />);

		await user.type(screen.getByLabelText('Mot de passe actuel'), 'OldPass123');
		await user.type(screen.getByLabelText('Nouveau mot de passe'), 'NewPass123');
		await user.type(
			screen.getByLabelText('Confirmer le mot de passe'),
			'OtherPass123'
		);

		expect(
			screen.getByRole('button', {
				name: 'Mettre à jour le mot de passe',
			})
		).toBeDisabled();
		expect(userService.updatePassword).not.toHaveBeenCalled();
	});
});
