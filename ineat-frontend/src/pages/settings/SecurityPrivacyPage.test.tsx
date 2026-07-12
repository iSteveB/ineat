import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { userService } from '@/services/userService';
import SecurityPrivacyPage from './SecurityPrivacyPage';

const clearUserMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
	Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	useNavigate: () => navigateMock,
}));

vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn((selector) => selector({ clearUser: clearUserMock })),
}));

vi.mock('@/services/userService', () => ({
	userService: {
		updatePassword: vi.fn(),
		deleteAccount: vi.fn(),
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

	it('supprime le compte, affiche un succès et vide la session locale', async () => {
		(userService.deleteAccount as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: true,
			message: 'Compte supprimé avec succès',
		});

		render(<SecurityPrivacyPage />);

		await user.click(
			screen.getByRole('button', {
				name: /Supprimer définitivement mon compte/i,
			})
		);
		await user.click(
			screen.getByRole('button', {
				name: 'Supprimer définitivement',
			})
		);

		await waitFor(() => {
			expect(userService.deleteAccount).toHaveBeenCalledTimes(1);
		});
		expect(toast.success).toHaveBeenCalledWith('Compte supprimé avec succès');
		expect(clearUserMock).toHaveBeenCalledTimes(1);
		expect(navigateMock).toHaveBeenCalledWith({
			to: '/login',
			replace: true,
		});
	});

	it("affiche l'erreur et conserve la session locale si la suppression échoue", async () => {
		(userService.deleteAccount as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error('Impossible de supprimer le compte')
		);

		render(<SecurityPrivacyPage />);

		await user.click(
			screen.getByRole('button', {
				name: /Supprimer définitivement mon compte/i,
			})
		);
		await user.click(
			screen.getByRole('button', {
				name: 'Supprimer définitivement',
			})
		);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				'Impossible de supprimer le compte'
			);
		});
		expect(clearUserMock).not.toHaveBeenCalled();
		expect(navigateMock).not.toHaveBeenCalled();
	});
});
