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
	createdAt: string;
	updatedAt: string;
};

type ApiResponse<T> = {
	success: boolean;
	data: T;
};

export const notificationService = {
	async getNotifications(options?: {
		includeRead?: boolean;
		limit?: number;
	}): Promise<AppNotification[]> {
		const params = new URLSearchParams();

		if (options?.includeRead) {
			params.set('includeRead', 'true');
		}
		if (options?.limit) {
			params.set('limit', options.limit.toString());
		}

		const response = await apiClient.get<ApiResponse<AppNotification[]>>(
			`/notifications${params.size ? `?${params.toString()}` : ''}`
		);

		return response.data;
	},

	async getUnreadCount(): Promise<number> {
		const response = await apiClient.get<
			ApiResponse<{ count: number }>
		>('/notifications/unread-count');

		return response.data.count;
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
};
