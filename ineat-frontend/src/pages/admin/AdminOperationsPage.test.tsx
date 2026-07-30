import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminService } from '@/services/adminService';
import AdminOperationsPage from './AdminOperationsPage';

vi.mock('@/services/adminService', () => ({
	adminService: { getQueues: vi.fn(), retryQueueJob: vi.fn() },
}));

const snapshot = {
	timestamp: '2026-07-30T18:00:00.000Z',
	health: 'degraded' as const,
	thresholds: {
		warningBacklog: 100,
		criticalBacklog: 1000,
		warningLagMs: 300000,
		criticalLagMs: 1800000,
		warningFailuresPerHour: 5,
		criticalFailuresPerHour: 20,
	},
	queues: [
		{
			name: 'notification-delivery',
			health: 'degraded' as const,
			counts: {
				waiting: 2,
				active: 1,
				delayed: 0,
				failed: 1,
				completed: 20,
				paused: 0,
			},
			oldestWaitingAgeMs: 120000,
			recentFailuresLastHour: 1,
			failedJobs: [
				{
					id: 'job-1',
					name: 'deliver-email',
					attemptsMade: 3,
					failedReason: 'SMTP unavailable',
					failedAt: '2026-07-30T17:59:00.000Z',
				},
			],
		},
	],
};

const renderPage = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<AdminOperationsPage />
		</QueryClientProvider>
	);
};

describe('AdminOperationsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(adminService.getQueues as ReturnType<typeof vi.fn>).mockResolvedValue(
			snapshot
		);
		(adminService.retryQueueJob as ReturnType<typeof vi.fn>).mockResolvedValue({
			state: 'waiting',
		});
	});

	it('affiche la santé et les métadonnées sûres des jobs', async () => {
		renderPage();

		expect(await screen.findByText('Santé globale')).toBeInTheDocument();
		expect(screen.getAllByText('Dégradé')).toHaveLength(2);
		expect(screen.getByText('SMTP unavailable')).toBeInTheDocument();
		expect(
			screen.getByText(/notification-delivery · job-1/)
		).toBeInTheDocument();
	});

	it('exige une justification avant de relancer un job', async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByText('SMTP unavailable');

		await user.click(screen.getByRole('button', { name: 'Relancer' }));
		const dialog = screen.getByRole('alertdialog');
		const confirm = within(dialog).getByRole('button', {
			name: 'Relancer le job',
		});
		expect(confirm).toBeDisabled();
		await user.type(
			within(dialog).getByLabelText('Justification obligatoire'),
			'Incident résolu'
		);
		await user.click(confirm);

		await waitFor(() =>
			expect(adminService.retryQueueJob).toHaveBeenCalledWith(
				'notification-delivery',
				'job-1',
				'Incident résolu'
			)
		);
	});
});
