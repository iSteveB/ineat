import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { notificationService } from './notificationService';
import { server } from '@/test/mocks/server';

const API_URL = import.meta.env.VITE_API_URL;

const notification = {
	id: '11111111-1111-4111-8111-111111111111',
	userId: '22222222-2222-4222-8222-222222222222',
	type: 'EXPIRY',
	title: 'Produit bientôt périmé',
	message: 'Yaourt expire dans 2 jours.',
	isRead: false,
	referenceId: '33333333-3333-4333-8333-333333333333',
	referenceType: 'inventory_item',
	createdAt: '2026-05-21T10:00:00.000Z',
	updatedAt: '2026-05-21T10:00:00.000Z',
};

describe('notificationService', () => {
	it('récupère les notifications avec options', async () => {
		let requestedUrl = '';

		server.use(
			http.get(`${API_URL}/notifications`, ({ request }) => {
				requestedUrl = request.url;
				return HttpResponse.json({
					success: true,
					data: [notification],
				});
			})
		);

		const result = await notificationService.getNotifications({
			includeRead: true,
			limit: 10,
		});
		const searchParams = new URL(requestedUrl).searchParams;

		expect(result).toEqual([notification]);
		expect(searchParams.get('includeRead')).toBe('true');
		expect(searchParams.get('limit')).toBe('10');
	});

	it('récupère le compteur non lu et marque les notifications lues', async () => {
		server.use(
			http.get(`${API_URL}/notifications/unread-count`, () =>
				HttpResponse.json({
					success: true,
					data: { count: 3 },
				})
			),
			http.patch(`${API_URL}/notifications/read-all`, () =>
				HttpResponse.json({
					success: true,
					data: { count: 3 },
				})
			),
			http.patch(
				`${API_URL}/notifications/${notification.id}/read`,
				async ({ request }) => {
					const body = await request.json();
					return HttpResponse.json({
						success: true,
						data: {
							...notification,
							isRead: Boolean(
								(body as { isRead?: boolean }).isRead
							),
						},
					});
				}
			)
		);

		await expect(notificationService.getUnreadCount()).resolves.toBe(3);
		await expect(notificationService.markAllAsRead()).resolves.toBe(3);
		await expect(
			notificationService.markAsRead(notification.id)
		).resolves.toMatchObject({
			id: notification.id,
			isRead: true,
		});
	});
});
