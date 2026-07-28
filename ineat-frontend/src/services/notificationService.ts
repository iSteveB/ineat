import { apiClient } from '@/lib/api-client';

export type NotificationType = 'EXPIRY' | 'BUDGET' | 'SYSTEM';

export type AppNotification = {
	id: string;
	userId: string;
	type: NotificationType;
	title: string;
	message: string;
	isRead: boolean;
	referenceId?: string | null;
	referenceType?: string | null;
	dismissedAt?: string | null;
	resolvedAt?: string | null;
	lastOccurredAt: string;
	createdAt: string;
	updatedAt: string;
};

type ApiResponse<T> = {
	success: boolean;
	data: T;
};

export type NotificationPage = {
	items: AppNotification[];
	nextCursor: string | null;
	hasNextPage: boolean;
	unreadCount: number;
};

export type NotificationPreferences = {
	inAppEnabled: boolean;
	emailEnabled: boolean;
	pushEnabled: boolean;
	weeklyDigestEnabled: boolean;
	dailyDigestEnabled: boolean;
	expiry: boolean;
	budget: boolean;
	system: boolean;
};

type NotificationsApiResponse = ApiResponse<AppNotification[]> & {
	pagination: {
		nextCursor: string | null;
		hasNextPage: boolean;
	};
	unreadCount: number;
};

export const notificationService = {
	async getNotifications(options?: {
		includeRead?: boolean;
		limit?: number;
		cursor?: string;
	}): Promise<NotificationPage> {
		const params = new URLSearchParams();

		if (options?.includeRead) {
			params.set('includeRead', 'true');
		}
		if (options?.limit) {
			params.set('limit', options.limit.toString());
		}
		if (options?.cursor) {
			params.set('cursor', options.cursor);
		}

		const response = await apiClient.get<NotificationsApiResponse>(
			`/notifications${params.size ? `?${params.toString()}` : ''}`
		);

		return {
			items: response.data,
			nextCursor: response.pagination.nextCursor,
			hasNextPage: response.pagination.hasNextPage,
			unreadCount: response.unreadCount,
		};
	},

	async getUnreadCount(): Promise<number> {
		const response = await apiClient.get<
			ApiResponse<{ count: number }>
		>('/notifications/unread-count');

		return response.data.count;
	},

	async getPreferences(): Promise<NotificationPreferences> {
		const response = await apiClient.get<
			ApiResponse<NotificationPreferences>
		>('/notifications/preferences');
		return response.data;
	},

	async updatePreferences(changes: Partial<NotificationPreferences>) {
		const response = await apiClient.patch<
			ApiResponse<NotificationPreferences>
		>('/notifications/preferences', changes);
		return response.data;
	},

	async markAsRead(notificationId: string, isRead = true) {
		const response = await apiClient.patch<ApiResponse<AppNotification>>(
			`/notifications/${notificationId}/read`,
			{ isRead }
		);

		return response.data;
	},

	async markAllAsRead(): Promise<number> {
		const response = await apiClient.patch<
			ApiResponse<{ count: number }>
		>('/notifications/read-all');

		return response.data.count;
	},

	async dismiss(notificationId: string) {
		const response = await apiClient.patch<ApiResponse<AppNotification>>(
			`/notifications/${notificationId}/dismiss`
		);

		return response.data;
	},
};
