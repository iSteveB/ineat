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
	lastActiveAt: string;
	effectivePlan: 'FREE' | 'PREMIUM';
	counts: {
		inventoryItems: number;
		invoices: number;
		recipes: number;
	};
	quotas: AdminQuota[];
};

export type AdminUsersQuery = {
	page?: number;
	pageSize?: 10 | 25 | 50;
	search?: string;
	role?: UserRole;
	plan?: SubscriptionPlan;
	status?: AdminUser['subscriptionStatus'];
	sort?: 'createdAt' | 'email' | 'lastName';
	order?: 'asc' | 'desc';
};

export type AdminUsersPage = {
	items: AdminUser[];
	pagination: {
		page: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	};
};

export type AdminDashboard = {
	period: { key: '7d' | '30d' | '90d' | 'custom'; from: string; to: string };
	users: {
		total: number;
		admins: number;
		active: number;
		new: number;
		growthRate: number;
		free: number;
		trial: number;
		premium: number;
		expiredTrials: number;
	};
	subscriptions: {
		free: number;
		activeTrials: number;
		expiredTrials: number;
		premium: number;
		trialStarts: number;
		conversions: number;
		conversionRate: number;
		cancellations: number;
	};
	usage: {
		aiGenerations: number;
		driveImports: number;
		invoicesProcessed: number;
		historyStatus: string;
	};
	operations: {
		failedJobs: number;
		failedWebhooks: number;
		failedNotifications: number;
		failedInvoices: number;
	};
	trends: {
		registrations: Array<{ date: string; value: number }>;
		subscriptions: Array<{
			date: string;
			trials: number;
			conversions: number;
		}>;
		operations: Array<{
			date: string;
			successes: number;
			failures: number;
		}>;
	};
	attention: Array<{
		type:
			| 'FAILED_JOBS'
			| 'FAILED_WEBHOOKS'
			| 'FAILED_NOTIFICATIONS'
			| 'FAILED_INVOICES';
		count: number;
	}>;
	observability: {
		counters?: Record<string, number>;
		events?: unknown[];
		[key: string]: unknown;
	};
};

export type AdminDashboardQuery = {
	period: '7d' | '30d' | '90d' | 'custom';
	from?: string;
	to?: string;
};

export const adminService = {
	async getDashboard(query: AdminDashboardQuery = { period: '30d' }) {
		const params = new URLSearchParams({ period: query.period });
		if (query.from) params.set('from', query.from);
		if (query.to) params.set('to', query.to);
		const response =
			await apiClient.get<ApiSuccessResponse<AdminDashboard>>(
				`/admin/dashboard?${params.toString()}`
			);
		return response.data;
	},

	async listUsers(query: AdminUsersQuery = {}) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
		const suffix = params.size > 0 ? `?${params.toString()}` : '';
		const response =
			await apiClient.get<ApiSuccessResponse<AdminUsersPage>>(
				`/admin/users${suffix}`
			);
		return response.data;
	},

	async getUser(userId: string) {
		const response = await apiClient.get<ApiSuccessResponse<AdminUser>>(
			`/admin/users/${userId}`
		);
		return response.data;
	},

	async updateUserRole(userId: string, role: UserRole, reason: string) {
		const response = await apiClient.patch<ApiSuccessResponse<AdminUser>>(
			`/admin/users/${userId}/role`,
			{ role, reason }
		);
		return response.data;
	},

	async updateSubscriptionPlan(
		userId: string,
		subscriptionPlan: SubscriptionPlan,
		reason: string
	) {
		const response = await apiClient.patch<ApiSuccessResponse<AdminUser>>(
			`/admin/users/${userId}/subscription-plan`,
			{ subscriptionPlan, reason }
		);
		return response.data;
	},
};
