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
	accountStatus:
		| 'ACTIVE'
		| 'SUSPENDED'
		| 'BANNED'
		| 'PENDING_DELETION'
		| 'ANONYMIZED';
	accountStatusChangedAt: string | null;
	suspendedUntil: string | null;
	moderationReason: string | null;
	deletionScheduledAt: string | null;
	subscriptionPlan: SubscriptionPlan;
	subscriptionStatus: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
	trialStartedAt: string | null;
	trialEndsAt: string | null;
	currentPeriodStartedAt: string | null;
	currentPeriodEndsAt: string | null;
	stripeCustomerId: string | null;
	stripeSubscriptionId: string | null;
	billingInterval: 'MONTHLY' | 'YEARLY' | null;
	cancelAtPeriodEnd: boolean;
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
	accountStatus?: AdminUser['accountStatus'];
	activeFrom?: string;
	activeTo?: string;
	createdFrom?: string;
	createdTo?: string;
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

export type AdminPromotionCode = {
	id: string;
	code: string;
	active: boolean;
	createdAt: string;
	expiresAt: string | null;
	maxRedemptions: number | null;
	timesRedeemed: number;
	customerId: string | null;
	couponId: string | null;
	name: string | null;
	percentOff: number | null;
	amountOff: number | null;
	currency: string | null;
	duration: 'once' | 'repeating' | 'forever' | null;
	durationInMonths: number | null;
};

export type CreatePromotionCodeInput = {
	code: string;
	name: string;
	discountType: 'PERCENT' | 'FIXED';
	percentOff?: number;
	amountOff?: number;
	duration: 'ONCE' | 'REPEATING' | 'FOREVER';
	durationInMonths?: number;
	expiresAt?: string;
	maxRedemptions?: number;
	firstTimeOnly: boolean;
	stripeCustomerId?: string;
	reason: string;
};

export type AdminQueueSnapshot = {
	timestamp: string;
	health: 'healthy' | 'degraded' | 'critical';
	thresholds: {
		warningBacklog: number;
		criticalBacklog: number;
		warningLagMs: number;
		criticalLagMs: number;
		warningFailuresPerHour: number;
		criticalFailuresPerHour: number;
	};
	queues: Array<{
		name: string;
		health: 'healthy' | 'degraded' | 'critical';
		counts: Record<
			'waiting' | 'active' | 'delayed' | 'failed' | 'completed' | 'paused',
			number
		>;
		oldestWaitingAgeMs: number;
		recentFailuresLastHour: number;
		failedJobs: Array<{
			id: string;
			name: string;
			attemptsMade: number;
			failedReason: string;
			failedAt: string;
		}>;
	}>;
};

export type AdminQueueJobState = 'waiting' | 'active' | 'failed';

export type AdminQueueJobsPage = {
	queueName: string;
	state: AdminQueueJobState;
	items: Array<{
		id: string;
		name: string;
		state: AdminQueueJobState;
		attemptsMade: number;
		failedReason: string | null;
		createdAt: string;
		processedAt: string | null;
		finishedAt: string | null;
	}>;
	pagination: {
		page: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	};
};

export type AdminIncidentType =
	| 'INVOICE'
	| 'NOTIFICATION'
	| 'STRIPE_WEBHOOK'
	| 'RESEND';

export type AdminIncidentsPage = {
	type: AdminIncidentType;
	items: Array<{
		id: string;
		category: string;
		status: string;
		subtype: string | null;
		attempts?: number;
		stage?: string;
		durationMs?: number | null;
		modelVersion?: string | null;
		errorCode?: string | null;
		emailType?: string | null;
		error: string;
		occurredAt: string;
		createdAt?: string;
		processedAt?: string | null;
	}>;
	pagination: {
		page: number;
		pageSize: number;
		totalItems: number;
		totalPages: number;
	};
};

export type AdminInvoiceMetrics = {
	periodDays: number;
	invoices: number;
	failureRate: number;
	retriedInvoices: number;
	averageItemCount: number;
	stages: Array<{
		stage: string;
		count: number;
		p50Ms: number;
		p95Ms: number;
	}>;
};

export type AdminAuditLog = {
	id: string;
	action: string;
	resourceType: string;
	resourceId: string;
	previousValue: unknown;
	newValue: unknown;
	reason: string;
	ipAddress: string | null;
	sessionId: string | null;
	createdAt: string;
	admin: {
		id: string;
		email: string;
		firstName: string;
		lastName: string;
	};
};

export type AdminAuditQuery = {
	page?: number;
	pageSize?: 10 | 25 | 50 | 100;
	adminUserId?: string;
	action?: string;
	resourceType?: string;
	resourceId?: string;
	from?: string;
	to?: string;
	order?: 'asc' | 'desc';
};

export const adminService = {
	async getDashboard(query: AdminDashboardQuery = { period: '30d' }) {
		const params = new URLSearchParams({ period: query.period });
		if (query.from) params.set('from', query.from);
		if (query.to) params.set('to', query.to);
		const response = await apiClient.get<ApiSuccessResponse<AdminDashboard>>(
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
		const response = await apiClient.get<ApiSuccessResponse<AdminUsersPage>>(
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

	async updateAccountStatus(
		userId: string,
		action:
			| 'suspend'
			| 'activate'
			| 'ban'
			| 'rehabilitate'
			| 'schedule-deletion'
			| 'cancel-deletion',
		input: { reason: string; suspendedUntil?: string }
	) {
		const response = await apiClient.post<ApiSuccessResponse<AdminUser>>(
			`/admin/users/${userId}/account/${action}`,
			input
		);
		return response.data;
	},

	async listPromotionCodes() {
		const response =
			await apiClient.get<ApiSuccessResponse<AdminPromotionCode[]>>(
				'/admin/promotions'
			);
		return response.data;
	},

	async createPromotionCode(input: CreatePromotionCodeInput) {
		const response = await apiClient.post<
			ApiSuccessResponse<AdminPromotionCode>
		>('/admin/promotions', input);
		return response.data;
	},

	async deactivatePromotionCode(promotionCodeId: string, reason: string) {
		const response = await apiClient.post<
			ApiSuccessResponse<AdminPromotionCode>
		>(`/admin/promotions/${promotionCodeId}/deactivate`, { reason });
		return response.data;
	},

	async setSubscriptionCancellation(
		userId: string,
		cancelAtPeriodEnd: boolean,
		reason: string
	) {
		const action = cancelAtPeriodEnd
			? 'schedule-cancellation'
			: 'revoke-cancellation';
		const response = await apiClient.post<
			ApiSuccessResponse<{ id: string; cancelAtPeriodEnd: boolean }>
		>(`/admin/users/${userId}/subscription/${action}`, { reason });
		return response.data;
	},

	async getQueues() {
		const response =
			await apiClient.get<ApiSuccessResponse<AdminQueueSnapshot>>(
				'/admin/queues'
			);
		return response.data;
	},

	async listQueueJobs(
		queueName: string,
		state: AdminQueueJobState,
		page = 1,
		pageSize = 25
	) {
		const params = new URLSearchParams({
			state,
			page: String(page),
			pageSize: String(pageSize),
		});
		const response = await apiClient.get<
			ApiSuccessResponse<AdminQueueJobsPage>
		>(
			`/admin/queues/${encodeURIComponent(queueName)}/jobs?${params.toString()}`
		);
		return response.data;
	},

	async listIncidents(type: AdminIncidentType, page = 1, pageSize = 25) {
		const params = new URLSearchParams({
			type,
			page: String(page),
			pageSize: String(pageSize),
		});
		const response = await apiClient.get<
			ApiSuccessResponse<AdminIncidentsPage>
		>(`/admin/incidents?${params.toString()}`);
		return response.data;
	},

	async getInvoiceMetrics() {
		const response = await apiClient.get<
			ApiSuccessResponse<AdminInvoiceMetrics>
		>('/admin/invoice-metrics');
		return response.data;
	},

	async retryQueueJob(queueName: string, jobId: string, reason: string) {
		const response = await apiClient.post<
			ApiSuccessResponse<{
				queueName: string;
				jobId: string;
				jobName: string;
				state: string;
			}>
		>(
			`/admin/queues/${encodeURIComponent(queueName)}/jobs/${encodeURIComponent(jobId)}/retry`,
			{ reason }
		);
		return response.data;
	},

	async listAuditLogs(query: AdminAuditQuery = {}) {
		const params = new URLSearchParams();
		Object.entries(query).forEach(([key, value]) => {
			if (value !== undefined && value !== '') params.set(key, String(value));
		});
		const suffix = params.size ? `?${params.toString()}` : '';
		const response = await apiClient.get<
			ApiSuccessResponse<{
				items: AdminAuditLog[];
				pagination: {
					page: number;
					pageSize: number;
					totalItems: number;
					totalPages: number;
				};
			}>
		>(`/admin/audit-logs${suffix}`);
		return response.data;
	},
};
