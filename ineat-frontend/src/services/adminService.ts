import { apiClient } from '@/lib/api-client';
import type { SubscriptionPlan, UserRole } from '@/schemas';

type ApiSuccessResponse<T> = {
	success: boolean;
	data: T;
	message?: string;
};

export type AdminQuota = {
	id: string;
	usageType: 'AI_RECIPE_GENERATION' | 'DRIVE_IMPORT';
	usedCount: number;
	limit: number;
	periodStart: string;
	periodEnd: string;
};

export type AdminUser = {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
	role: UserRole;
	subscriptionPlan: SubscriptionPlan;
	subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
	trialStartedAt: string | null;
	trialEndsAt: string | null;
	currentPeriodStartedAt: string | null;
	currentPeriodEndsAt: string | null;
	createdAt: string;
	updatedAt: string;
	quotas: AdminQuota[];
};

export type AdminDashboard = {
	users: {
		total: number;
		admins: number;
		free: number;
		trial: number;
		premium: number;
		expiredTrials: number;
	};
	observability: {
		counters?: Record<string, number>;
		events?: unknown[];
		[key: string]: unknown;
	};
};

export const adminService = {
	async getDashboard() {
		const response =
			await apiClient.get<ApiSuccessResponse<AdminDashboard>>(
				'/admin/dashboard'
			);
		return response.data;
	},

	async listUsers() {
		const response =
			await apiClient.get<ApiSuccessResponse<AdminUser[]>>(
				'/admin/users'
			);
		return response.data;
	},

	async updateUserRole(userId: string, role: UserRole) {
		const response = await apiClient.patch<ApiSuccessResponse<AdminUser>>(
			`/admin/users/${userId}/role`,
			{ role }
		);
		return response.data;
	},

	async updateSubscriptionPlan(
		userId: string,
		subscriptionPlan: SubscriptionPlan
	) {
		const response = await apiClient.patch<ApiSuccessResponse<AdminUser>>(
			`/admin/users/${userId}/subscription-plan`,
			{ subscriptionPlan }
		);
		return response.data;
	},
};
