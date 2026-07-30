import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminService } from '@/services/adminService';
import AdminSubscriptionsPage from './AdminSubscriptionsPage';

vi.mock('@/services/adminService', () => ({
	adminService: {
		listPromotionCodes: vi.fn(),
		listUsers: vi.fn(),
		createPromotionCode: vi.fn(),
		deactivatePromotionCode: vi.fn(),
		setSubscriptionCancellation: vi.fn(),
	},
}));

const premiumUser = {
	id: 'c6a6ed22-6d12-4d5b-85ac-2dbadf8f8ce1',
	email: 'premium@example.com',
	firstName: 'Ada',
	lastName: 'Premium',
	role: 'USER',
	subscriptionPlan: 'PREMIUM',
	subscriptionStatus: 'ACTIVE',
	currentPeriodEndsAt: '2026-08-30T00:00:00.000Z',
	stripeSubscriptionId: 'sub-1',
	cancelAtPeriodEnd: false,
};

const renderPage = () => {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<AdminSubscriptionsPage />
		</QueryClientProvider>
	);
};

describe('AdminSubscriptionsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(
			adminService.listPromotionCodes as ReturnType<typeof vi.fn>
		).mockResolvedValue([
			{
				id: 'promo-1',
				code: 'WELCOME20',
				active: true,
				createdAt: '2026-07-30T00:00:00.000Z',
				expiresAt: null,
				maxRedemptions: 100,
				timesRedeemed: 4,
				customerId: null,
				couponId: 'coupon-1',
				name: 'Bienvenue',
				percentOff: 20,
				amountOff: null,
				currency: null,
				duration: 'once',
				durationInMonths: null,
			},
		]);
		(adminService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
			items: [premiumUser],
			pagination: { page: 1, pageSize: 50, totalItems: 1, totalPages: 1 },
		});
		(
			adminService.createPromotionCode as ReturnType<typeof vi.fn>
		).mockResolvedValue({});
		(
			adminService.setSubscriptionCancellation as ReturnType<typeof vi.fn>
		).mockResolvedValue({});
	});

	it('crée un code promotionnel Stripe avec une justification', async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByText('WELCOME20');

		await user.type(screen.getByLabelText('Code'), 'summer25');
		await user.type(screen.getByLabelText('Nom de campagne'), 'Offre été');
		await user.type(
			screen.getByLabelText('Justification obligatoire'),
			'Campagne été validée'
		);
		await user.click(screen.getByRole('button', { name: 'Créer dans Stripe' }));
		await user.click(
			screen.getByRole('button', { name: 'Confirmer la création' })
		);

		await waitFor(() =>
			expect(adminService.createPromotionCode).toHaveBeenCalledWith(
				expect.objectContaining({
					code: 'SUMMER25',
					name: 'Offre été',
					percentOff: 20,
					reason: 'Campagne été validée',
				})
			)
		);
	});

	it('exige confirmation et justification avant une annulation', async () => {
		const user = userEvent.setup();
		renderPage();
		await screen.findByText('premium@example.com');

		await user.click(
			screen.getByRole('button', { name: 'Annuler à l’échéance' })
		);
		const confirm = screen.getByRole('button', { name: 'Confirmer' });
		expect(confirm).toBeDisabled();
		await user.type(
			within(screen.getByRole('alertdialog')).getByLabelText(
				'Justification obligatoire'
			),
			'Demande du client'
		);
		await user.click(confirm);

		await waitFor(() =>
			expect(adminService.setSubscriptionCancellation).toHaveBeenCalledWith(
				premiumUser.id,
				true,
				'Demande du client'
			)
		);
	});
});
