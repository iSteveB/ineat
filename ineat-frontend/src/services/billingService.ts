import { apiClient } from '@/lib/api-client';

export type BillingInterval = 'MONTHLY' | 'YEARLY';

type ApiSuccessResponse<T> = {
	success: boolean;
	data: T;
	message?: string;
};

type CheckoutSession = {
	id: string;
	url: string;
};

type PortalSession = {
	id: string;
	url: string;
};

type TrialStart = {
	trialStartedAt: string;
	trialEndsAt: string;
};

export const billingService = {
	async createCheckoutSession(interval: BillingInterval) {
		const response = await apiClient.post<ApiSuccessResponse<CheckoutSession>>(
			'/billing/checkout',
			{ interval }
		);

		return response.data;
	},

	async createPortalSession() {
		const response =
			await apiClient.post<ApiSuccessResponse<PortalSession>>('/billing/portal');

		return response.data;
	},

	async startTrial() {
		const response =
			await apiClient.post<ApiSuccessResponse<TrialStart>>(
				'/billing/trial/start'
			);

		return response.data;
	},
};
