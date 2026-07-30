import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminService } from '@/services/adminService';
import AdminAuditPage from './AdminAuditPage';

vi.mock('@/services/adminService', () => ({
	adminService: { listAuditLogs: vi.fn() },
}));

const renderPage = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<AdminAuditPage />
		</QueryClientProvider>
	);
};

describe('AdminAuditPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(adminService.listAuditLogs as ReturnType<typeof vi.fn>).mockResolvedValue({
			items: [
				{
					id: 'audit-1',
					action: 'STRIPE_PROMOTION_CODE_CREATED',
					resourceType: 'STRIPE_PROMOTION_CODE',
					resourceId: 'promo-1',
					previousValue: null,
					newValue: { code: 'WELCOME20' },
					reason: 'Campagne validée',
					ipAddress: '127.0.0.1',
					sessionId: 'session-1',
					createdAt: '2026-07-30T12:00:00.000Z',
					admin: {
						id: 'admin-1',
						email: 'admin@example.com',
						firstName: 'Ada',
						lastName: 'Admin',
					},
				},
			],
			pagination: { page: 1, pageSize: 25, totalItems: 1, totalPages: 1 },
		});
	});

	it('affiche le journal puis le détail avant/après sélection', async () => {
		const user = userEvent.setup();
		renderPage();

		const action = await screen.findByText('STRIPE_PROMOTION_CODE_CREATED');
		expect(screen.getByText('Campagne validée')).toBeInTheDocument();
		await user.click(action);

		expect(screen.getByText(/WELCOME20/)).toBeInTheDocument();
		expect(screen.getByText('IP : 127.0.0.1')).toBeInTheDocument();
	});

	it('transmet les filtres au serveur', async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByText('STRIPE_PROMOTION_CODE_CREATED');

		await user.type(screen.getByPlaceholderText('Type de ressource'), 'USER');
		await user.click(screen.getByRole('button', { name: 'Appliquer' }));

		await waitFor(() =>
			expect(adminService.listAuditLogs).toHaveBeenLastCalledWith(
				expect.objectContaining({ resourceType: 'USER', page: 1 })
			)
		);
	});
});
