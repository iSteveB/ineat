import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SubscriptionPage from './SubscriptionPage';
import { billingService } from '@/services/billingService';
import type { User } from '@/schemas';
import { toast } from 'sonner';

const navigateMock = vi.fn();
const refreshUserMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => navigateMock,
}));

vi.mock('@/hooks/useAuth', () => ({
	useRefreshUser: () => refreshUserMock,
	useUser: vi.fn(),
}));

vi.mock('@/services/billingService', () => ({
	billingService: {
		createCheckoutSession: vi.fn(),
		createPortalSession: vi.fn(),
		startTrial: vi.fn(),
	},
}));

vi.mock('sonner', () => ({
	toast: {
		error: vi.fn(),
		info: vi.fn(),
		success: vi.fn(),
	},
}));

import { useUser } from '@/hooks/useAuth';

const baseUser: User = {
	id: 'user-1',
	email: 'steve@example.com',
	firstName: 'Steve',
	lastName: 'Pro',
	profileType: 'SINGLE',
	subscription: 'FREE',
	role: 'USER',
	subscriptionPlan: 'FREE',
	subscriptionStatus: 'ACTIVE',
	trialStartedAt: null,
	trialEndsAt: null,
	trialUsedAt: null,
	currentPeriodStartedAt: null,
	currentPeriodEndsAt: null,
	billingInterval: null,
	cancelAtPeriodEnd: false,
	effectivePlan: 'FREE',
	capabilities: {
		inventoryLimit: 50,
		canUseRecipes: false,
		canGenerateAiRecipes: false,
		aiRecipeGenerationRemaining: 0,
		canImportDrive: false,
		driveImportsRemaining: 0,
		canUseAutomaticBudgetSync: false,
		canAccessAdmin: false,
	},
	createdAt: '2026-07-26T00:00:00.000Z',
	updatedAt: '2026-07-26T00:00:00.000Z',
};

const mockUser = (user: User = baseUser) => {
	(useUser as ReturnType<typeof vi.fn>).mockReturnValue({
		data: user,
		isLoading: false,
	});
};

describe('SubscriptionPage', () => {
	const assignMock = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
		mockUser();
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: {
				...window.location,
				assign: assignMock,
			},
		});
	});

	it('affiche le trial gratuit sans carte et appelle le endpoint trial', async () => {
		const user = userEvent.setup();
		(billingService.startTrial as ReturnType<typeof vi.fn>).mockResolvedValue({
			...baseUser,
			subscription: 'TRIAL',
			subscriptionPlan: 'TRIAL',
			effectivePlan: 'PREMIUM',
		});
		refreshUserMock.mockResolvedValue(undefined);

		render(<SubscriptionPage />);

		expect(
			screen.getByText('Essayez Premium gratuitement pendant 3 jours, sans carte bancaire.')
		).toBeInTheDocument();

		await user.click(
			screen.getByRole('button', { name: 'Essayer 3 jours gratuitement' })
		);

		await waitFor(() => {
			expect(billingService.startTrial).toHaveBeenCalledTimes(1);
		});
		expect(refreshUserMock).toHaveBeenCalledTimes(1);
		expect(toast.success).toHaveBeenCalledWith(
			'Votre essai Premium est actif pendant 3 jours.'
		);
	});

	it('laisse choisir mensuel et annuel pendant un trial actif', async () => {
		const user = userEvent.setup();
		mockUser({
			...baseUser,
			subscription: 'TRIAL',
			subscriptionPlan: 'TRIAL',
			effectivePlan: 'PREMIUM',
			trialEndsAt: '2026-07-29T00:00:00.000Z',
			capabilities: {
				...baseUser.capabilities,
				inventoryLimit: 500,
				canUseRecipes: true,
				canGenerateAiRecipes: true,
				aiRecipeGenerationRemaining: 10,
				canImportDrive: true,
				driveImportsRemaining: 3,
				canUseAutomaticBudgetSync: true,
			},
		});
		(
			billingService.createCheckoutSession as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 'cs_test_yearly',
			url: 'https://checkout.stripe.test/yearly',
		});

		render(<SubscriptionPage />);

		expect(
			screen.getByText(/Trial actif: vous avez les droits Premium/)
		).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Commencer Premium' }))
			.toBeEnabled();
		expect(screen.getByRole('button', { name: 'Choisir l’annuel' }))
			.toBeEnabled();

		await user.click(screen.getByRole('button', { name: 'Choisir l’annuel' }));

		await waitFor(() => {
			expect(billingService.createCheckoutSession).toHaveBeenCalledWith(
				'YEARLY'
			);
		});
		expect(assignMock).toHaveBeenCalledWith('https://checkout.stripe.test/yearly');
	});

	it('affiche le renouvellement et ouvre le portail pour un Premium actif', async () => {
		const user = userEvent.setup();
		mockUser({
			...baseUser,
			subscription: 'PREMIUM',
			subscriptionPlan: 'PREMIUM',
			effectivePlan: 'PREMIUM',
			billingInterval: 'YEARLY',
			currentPeriodEndsAt: '2026-08-01T00:00:00.000Z',
			capabilities: {
				...baseUser.capabilities,
				inventoryLimit: 500,
				canUseRecipes: true,
				canGenerateAiRecipes: true,
				aiRecipeGenerationRemaining: 100,
				canImportDrive: true,
				driveImportsRemaining: 25,
				canUseAutomaticBudgetSync: true,
			},
		});
		(
			billingService.createPortalSession as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			id: 'bps_test',
			url: 'https://billing.stripe.test/session',
		});

		render(<SubscriptionPage />);

		expect(
			screen.getByText(/Facturation annuelle gérée par Stripe, renouvellement le/)
		).toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: 'Gérer mon abonnement' }));

		await waitFor(() => {
			expect(billingService.createPortalSession).toHaveBeenCalledTimes(1);
		});
		expect(assignMock).toHaveBeenCalledWith(
			'https://billing.stripe.test/session'
		);
	});

	it("affiche l'erreur Stripe quand le Customer Portal ne peut pas s'ouvrir", async () => {
		const user = userEvent.setup();
		mockUser({
			...baseUser,
			subscription: 'PREMIUM',
			subscriptionPlan: 'PREMIUM',
			effectivePlan: 'PREMIUM',
			billingInterval: 'MONTHLY',
			currentPeriodEndsAt: '2026-08-01T00:00:00.000Z',
			capabilities: {
				...baseUser.capabilities,
				inventoryLimit: 500,
				canUseRecipes: true,
				canGenerateAiRecipes: true,
				aiRecipeGenerationRemaining: 100,
				canImportDrive: true,
				driveImportsRemaining: 25,
				canUseAutomaticBudgetSync: true,
			},
		});
		(
			billingService.createPortalSession as ReturnType<typeof vi.fn>
		).mockRejectedValue(
			new Error("Aucun abonnement Stripe n'est encore associé à votre compte.")
		);

		render(<SubscriptionPage />);

		await user.click(screen.getByRole('button', { name: 'Gérer mon abonnement' }));

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith(
				"Aucun abonnement Stripe n'est encore associé à votre compte."
			);
		});
		expect(assignMock).not.toHaveBeenCalled();
	});

	it('permet de reprendre Premium après un paiement non confirmé', async () => {
		mockUser({
			...baseUser,
			subscription: 'PREMIUM',
			subscriptionPlan: 'PREMIUM',
			subscriptionStatus: 'EXPIRED',
			effectivePlan: 'FREE',
		});

		render(<SubscriptionPage />);

		expect(screen.getByText(/Paiement non confirmé/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Commencer Premium' }))
			.toBeEnabled();
		expect(screen.getByRole('button', { name: 'Choisir l’annuel' }))
			.toBeEnabled();
	});
});
