import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminPage from './AdminPage';
import { adminService } from '@/services/adminService';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => navigateMock,
	useSearch: () => ({ period: '30d' }),
}));

vi.mock('@/services/adminService', () => ({
	adminService: { getDashboard: vi.fn() },
}));

const renderPage = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<AdminPage />
		</QueryClientProvider>
	);
};

describe('Admin overview', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(adminService.getDashboard as ReturnType<typeof vi.fn>).mockResolvedValue({
			period: {
				key: '30d',
				from: '2026-07-01T00:00:00.000Z',
				to: '2026-07-30T00:00:00.000Z',
			},
			users: {
				total: 100,
				admins: 2,
				active: 40,
				new: 12,
				growthRate: 20,
				free: 70,
				trial: 10,
				premium: 20,
				expiredTrials: 5,
			},
			subscriptions: {
				free: 70,
				activeTrials: 10,
				expiredTrials: 5,
				premium: 20,
				trialStarts: 10,
				conversions: 3,
				conversionRate: 30,
				cancellations: 1,
			},
			usage: {
				aiGenerations: 18,
				driveImports: 6,
				invoicesProcessed: 25,
				historyStatus: 'TRACKED_FROM_USAGE_EVENTS',
			},
			operations: {
				failedJobs: 1,
				failedWebhooks: 0,
				failedNotifications: 0,
				failedInvoices: 0,
			},
			trends: {
				registrations: [{ date: '2026-07-29', value: 2 }],
				subscriptions: [
					{ date: '2026-07-29', trials: 2, conversions: 1 },
				],
				operations: [
					{ date: '2026-07-29', successes: 4, failures: 1 },
				],
			},
			attention: [{ type: 'FAILED_JOBS', count: 1 }],
			observability: {},
		});
	});

	it('affiche métriques, tendances et incidents pour la période', async () => {
		renderPage();

		expect(await screen.findByText('Utilisateurs actifs')).toBeInTheDocument();
		expect(screen.getByText('40')).toBeInTheDocument();
		expect(screen.getByText('30 %')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: 'Graphique Inscriptions' })).toBeInTheDocument();
		expect(screen.getByText('jobs en échec')).toBeInTheDocument();
		expect(adminService.getDashboard).toHaveBeenCalledWith({ period: '30d' });
	});

	it('change la période dans l’URL', async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByText('Utilisateurs actifs');

		await user.selectOptions(screen.getByLabelText('Période'), '7d');

		expect(navigateMock).toHaveBeenCalledWith({
			to: '/app/admin',
			search: { period: '7d' },
		});
	});
});
