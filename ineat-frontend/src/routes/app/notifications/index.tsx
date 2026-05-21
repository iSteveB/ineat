import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
	AlertTriangle,
	Bell,
	Check,
	CircleDollarSign,
	Clock,
	ReceiptText,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { notificationService } from '@/services/notificationService';
import type {
	AppNotification,
	NotificationType,
} from '@/services/notificationService';

export const Route = createFileRoute('/app/notifications/')({
	component: NotificationsPage,
});

const typeLabels: Record<NotificationType, string> = {
	EXPIRY: 'Péremption',
	BUDGET: 'Budget',
	SYSTEM: 'Ticket',
};

const typeStyles: Record<NotificationType, string> = {
	EXPIRY: 'border-orange-200 bg-orange-50 text-orange-800',
	BUDGET: 'border-red-200 bg-red-50 text-red-800',
	SYSTEM: 'border-blue-200 bg-blue-50 text-blue-800',
};

function NotificationIcon({ type }: { type: NotificationType }) {
	if (type === 'EXPIRY') return <AlertTriangle className='size-5' />;
	if (type === 'BUDGET') return <CircleDollarSign className='size-5' />;
	return <ReceiptText className='size-5' />;
}

function formatNotificationDate(date: string) {
	return new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(date));
}

type NotificationTarget = '/app/inventory' | '/app/budget' | '/app/receipt';

function getNotificationTarget(
	notification: AppNotification
): NotificationTarget | null {
	if (notification.referenceType === 'inventory_item') {
		return '/app/inventory';
	}
	if (notification.referenceType?.startsWith('budget')) {
		return '/app/budget';
	}
	if (notification.referenceType === 'receipt') {
		return '/app/receipt';
	}
	return null;
}

function NotificationsPage() {
	const queryClient = useQueryClient();
	const { data: notifications = [], isLoading } = useQuery({
		queryKey: ['notifications', 'list'],
		queryFn: () =>
			notificationService.getNotifications({
				includeRead: true,
				limit: 50,
			}),
	});

	const invalidateNotifications = () => {
		queryClient.invalidateQueries({ queryKey: ['notifications'] });
	};

	const markAsReadMutation = useMutation({
		mutationFn: (notificationId: string) =>
			notificationService.markAsRead(notificationId),
		onSuccess: invalidateNotifications,
	});

	const markAllAsReadMutation = useMutation({
		mutationFn: () => notificationService.markAllAsRead(),
		onSuccess: invalidateNotifications,
	});

	const unreadCount = notifications.filter(
		(notification) => !notification.isRead
	).length;

	if (isLoading) {
		return (
			<div className='flex min-h-80 items-center justify-center'>
				<div className='size-8 animate-spin rounded-full border-2 border-success-50 border-t-transparent' />
			</div>
		);
	}

	return (
		<div className='mx-auto max-w-4xl space-y-6 p-4'>
			<header className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<p className='text-sm font-medium text-success-700'>
						{unreadCount} non lue{unreadCount > 1 ? 's' : ''}
					</p>
					<h1 className='text-2xl font-semibold text-neutral-900'>
						Notifications
					</h1>
				</div>
				<Button
					variant='secondary'
					disabled={
						unreadCount === 0 || markAllAsReadMutation.isPending
					}
					onClick={() => markAllAsReadMutation.mutate()}>
					<Check className='size-4' />
					Tout marquer lu
				</Button>
			</header>

			{notifications.length === 0 ? (
				<section className='rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center'>
					<Bell className='mx-auto mb-3 size-8 text-success-600' />
					<h2 className='text-lg font-semibold text-neutral-900'>
						Rien à signaler
					</h2>
					<p className='mt-1 text-sm text-neutral-600'>
						Les alertes de péremption, budget et tickets
						apparaîtront ici.
					</p>
				</section>
			) : (
				<section className='space-y-3'>
					{notifications.map((notification) => {
						const target = getNotificationTarget(notification);

						return (
							<article
								key={notification.id}
								className={`rounded-lg border bg-neutral-50 p-4 shadow-sm ${
									notification.isRead
										? 'border-neutral-200 opacity-75'
										: 'border-success-200'
								}`}>
								<div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
									<div className='flex gap-3'>
										<div
											className={`flex size-10 shrink-0 items-center justify-center rounded-md border ${typeStyles[notification.type]}`}>
											<NotificationIcon
												type={notification.type}
											/>
										</div>
										<div className='min-w-0 space-y-2'>
											<div className='flex flex-wrap items-center gap-2'>
												<Badge
													variant='outline'
													className={
														typeStyles[
															notification.type
														]
													}>
													{
														typeLabels[
															notification.type
														]
													}
												</Badge>
												<span className='inline-flex items-center gap-1 text-xs text-neutral-600'>
													<Clock className='size-3' />
													{formatNotificationDate(
														notification.createdAt
													)}
												</span>
											</div>
											<h2 className='text-base font-semibold text-neutral-900'>
												{notification.title}
											</h2>
											<p className='text-sm text-neutral-700'>
												{notification.message}
											</p>
										</div>
									</div>

									<div className='flex shrink-0 flex-wrap gap-2 sm:justify-end'>
										{target && (
											<Button asChild variant='outline'>
												<Link to={target}>Ouvrir</Link>
											</Button>
										)}
										{!notification.isRead && (
											<Button
												variant='secondary'
												disabled={
													markAsReadMutation.isPending
												}
												onClick={() =>
													markAsReadMutation.mutate(
														notification.id
													)
												}>
												<Check className='size-4' />
												Lu
											</Button>
										)}
									</div>
								</div>
							</article>
						);
					})}
				</section>
			)}
		</div>
	);
}
