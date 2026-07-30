import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminUsersPage from './AdminUsersPage';
import { adminService } from '@/services/adminService';
import { useAuthStore } from '@/stores/authStore';

vi.mock('@tanstack/react-router', () => ({
	Link: ({ children, to }: { children: ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
}));

vi.mock('@/stores/authStore', () => ({
	useAuthStore: vi.fn(),
}));

vi.mock('@/services/adminService', () => ({
	adminService: {
		getDashboard: vi.fn(),
		listUsers: vi.fn(),
		updateUserRole: vi.fn(),
		updateSubscriptionPlan: vi.fn(),
	},
}));

const adminUser = {
	id: 'c6a6ed22-6d12-4d5b-85ac-2dbadf8f8ce1',
	email: 'ada@example.com',
	firstName: 'Ada',
	lastName: 'Lovelace',
	role: 'USER' as const,
	subscriptionPlan: 'FREE' as const,
	subscriptionStatus: 'ACTIVE' as const,
	trialStartedAt: null,
	trialEndsAt: null,
	currentPeriodStartedAt: null,
	currentPeriodEndsAt: null,
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	quotas: [],
};

const renderPage = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<AdminUsersPage />
		</QueryClientProvider>
	);
};

describe('AdminUsersPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(useAuthStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
			capabilities: { canAccessAdmin: true },
		});
		(adminService.getDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({
			users: {
				total: 1,
				admins: 1,
				free: 1,
				trial: 0,
				premium: 0,
				expiredTrials: 0,
			},
			observability: {},
		});
		(adminService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue([
			adminUser,
		]);
		(adminService.updateUserRole as ReturnType<typeof vi.fn>).mockResolvedValue({
			...adminUser,
			role: 'ADMIN',
		});
	});

	it('demande confirmation et justification avant un changement de rôle', async () => {
		const user = userEvent.setup();
		renderPage();

		const roleSelect = await screen.findByLabelText('Rôle');
		await user.selectOptions(roleSelect, 'ADMIN');

		expect(screen.getByText('Confirmer la modification')).toBeInTheDocument();
		expect(screen.getByText(/USER → ADMIN/)).toBeInTheDocument();
		const confirmButton = screen.getByRole('button', { name: 'Confirmer' });
		expect(confirmButton).toBeDisabled();

		await user.type(
			screen.getByLabelText('Justification'),
			'Accès support nécessaire'
		);
		expect(confirmButton).toBeEnabled();
		await user.click(confirmButton);

		await waitFor(() => {
			expect(adminService.updateUserRole).toHaveBeenCalledWith(
				adminUser.id,
				'ADMIN',
				'Accès support nécessaire'
			);
		});
	});
});
