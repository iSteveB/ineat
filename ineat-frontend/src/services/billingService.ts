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

export const billingService = {
	async createCheckoutSession(interval: BillingInterval) {
		const response = await apiClient.post<ApiSuccessResponse<CheckoutSession>>(
			'/billing/checkout',
			{ interval }
		);

		return response.data;
	},
};
