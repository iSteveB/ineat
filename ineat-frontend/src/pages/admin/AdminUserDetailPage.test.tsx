import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminUserDetailPage from './AdminUserDetailPage';
import { adminService } from '@/services/adminService';

vi.mock('@tanstack/react-router', () => ({
	Link: ({ children, to }: { children: ReactNode; to: string }) => (
		<a href={to}>{children}</a>
	),
	useParams: () => ({ userId: 'c6a6ed22-6d12-4d5b-85ac-2dbadf8f8ce1' }),
	useSearch: () => ({ page: 2, pageSize: 25, sort: 'email', order: 'asc' }),
}));

vi.mock('@/services/adminService', () => ({
	adminService: { getUser: vi.fn() },
}));

const renderPage = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<AdminUserDetailPage />
		</QueryClientProvider>
	);
};

describe('AdminUserDetailPage', () => {
	beforeEach(() => vi.clearAllMocks());

	it('affiche les droits, compteurs et quotas du compte', async () => {
		(adminService.getUser as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: 'c6a6ed22-6d12-4d5b-85ac-2dbadf8f8ce1',
			email: 'ada@example.com',
			firstName: 'Ada',
			lastName: 'Lovelace',
			role: 'ADMIN',
			subscriptionPlan: 'TRIAL',
			subscriptionStatus: 'ACTIVE',
			effectivePlan: 'PREMIUM',
			trialStartedAt: '2026-07-29T00:00:00.000Z',
			trialEndsAt: '2026-08-01T00:00:00.000Z',
			currentPeriodStartedAt: null,
			currentPeriodEndsAt: null,
			createdAt: '2026-07-29T00:00:00.000Z',
			updatedAt: '2026-07-30T00:00:00.000Z',
			lastActiveAt: '2026-07-30T00:00:00.000Z',
			counts: { inventoryItems: 12, invoices: 3, recipes: 4 },
			quotas: [
				{
					id: 'quota-1',
					usageType: 'AI_RECIPE_GENERATION',
					usedCount: 2,
					limit: 5,
					periodStart: '2026-07-30T00:00:00.000Z',
					periodEnd: '2026-07-31T00:00:00.000Z',
				},
			],
		});

		renderPage();

		expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
		expect(screen.getByText('PREMIUM effectif')).toBeInTheDocument();
		expect(screen.getByText('12')).toBeInTheDocument();
		expect(screen.getByText('AI_RECIPE_GENERATION')).toBeInTheDocument();
		expect(adminService.getUser).toHaveBeenCalledWith(
			'c6a6ed22-6d12-4d5b-85ac-2dbadf8f8ce1'
		);
	});
});
