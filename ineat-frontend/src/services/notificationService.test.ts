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
	lastOccurredAt: '2026-05-21T10:00:00.000Z',
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
					pagination: {
						nextCursor: 'next-page',
						hasNextPage: true,
					},
					unreadCount: 12,
				});
			})
		);

		const result = await notificationService.getNotifications({
			includeRead: true,
			limit: 10,
			cursor: 'current-page',
		});
		const searchParams = new URL(requestedUrl).searchParams;

		expect(result).toEqual({
			items: [notification],
			nextCursor: 'next-page',
			hasNextPage: true,
			unreadCount: 12,
		});
		expect(searchParams.get('includeRead')).toBe('true');
		expect(searchParams.get('limit')).toBe('10');
		expect(searchParams.get('cursor')).toBe('current-page');
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

	it('récupère et met à jour les préférences', async () => {
		const preferences = {
			inAppEnabled: true,
			emailEnabled: false,
			pushEnabled: false,
			weeklyDigestEnabled: true,
			dailyDigestEnabled: false,
			expiry: true,
			budget: true,
			system: true,
		};
		server.use(
			http.get(`${API_URL}/notifications/preferences`, () =>
				HttpResponse.json({ success: true, data: preferences })
			),
			http.patch(
				`${API_URL}/notifications/preferences`,
				async ({ request }) => {
					const changes = (await request.json()) as Partial<
						typeof preferences
					>;
					return HttpResponse.json({
						success: true,
						data: { ...preferences, ...changes },
					});
				}
			)
		);

		await expect(notificationService.getPreferences()).resolves.toEqual(
			preferences
		);
		await expect(
			notificationService.updatePreferences({ expiry: false })
		).resolves.toMatchObject({ expiry: false });
	});
});
