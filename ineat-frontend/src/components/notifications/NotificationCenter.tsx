import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import {
	AlertTriangle,
	Bell,
	Check,
	CircleDollarSign,
	Clock,
	Info,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { notificationService } from '@/services/notificationService';
import type {
	AppNotification,
	NotificationType,
} from '@/services/notificationService';

const typeLabels: Record<NotificationType, string> = {
	EXPIRY: 'Péremption',
	BUDGET: 'Budget',
	SYSTEM: 'Système',
};

const typeStyles: Record<NotificationType, string> = {
	EXPIRY: 'border-orange-200 bg-orange-50 text-orange-800',
	BUDGET: 'border-red-200 bg-red-50 text-red-800',
	SYSTEM: 'border-blue-200 bg-blue-50 text-blue-800',
};

type NotificationTarget = '/app/inventory' | '/app/budget';

function getNotificationTarget(
	notification: AppNotification
): NotificationTarget | null {
	if (notification.referenceType === 'inventory_item') {
		return '/app/inventory';
	}
	if (notification.referenceType?.startsWith('budget')) {
		return '/app/budget';
	}
	return null;
}

function NotificationIcon({ type }: { type: NotificationType }) {
	if (type === 'EXPIRY') return <AlertTriangle className='size-4' />;
	if (type === 'BUDGET') return <CircleDollarSign className='size-4' />;
	return <Info className='size-4' />;
}

function formatNotificationDate(date: string) {
	return new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(date));
}

export function NotificationCenter({
	compact = false,
	onNavigate,
}: {
	compact?: boolean;
	onNavigate?: () => void;
}) {
	const queryClient = useQueryClient();
	const loadMoreRef = useRef<HTMLDivElement>(null);
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isError,
		isFetchingNextPage,
		isLoading,
		refetch,
	} = useInfiniteQuery({
		queryKey: ['notifications', 'list', compact ? 'compact' : 'full'],
		queryFn: ({ pageParam }) =>
			notificationService.getNotifications({
				includeRead: true,
				limit: compact ? 20 : 50,
				cursor: pageParam,
			}),
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
	});
	const notifications = data?.pages.flatMap((page) => page.items) ?? [];
	const unreadCount = data?.pages[0]?.unreadCount ?? 0;

	useEffect(() => {
		const target = loadMoreRef.current;
		if (!target || !hasNextPage || isFetchingNextPage) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) void fetchNextPage();
			},
			{ rootMargin: '200px' }
		);
		observer.observe(target);
		return () => observer.disconnect();
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	const invalidateNotifications = () =>
		queryClient.invalidateQueries({ queryKey: ['notifications'] });
	const markAsReadMutation = useMutation({
		mutationFn: (notificationId: string) =>
			notificationService.markAsRead(notificationId),
		onSuccess: invalidateNotifications,
	});
	const markAllAsReadMutation = useMutation({
		mutationFn: () => notificationService.markAllAsRead(),
		onSuccess: invalidateNotifications,
	});

	if (isLoading) {
		return (
			<div className='flex min-h-48 items-center justify-center'>
				<div className='size-8 animate-spin rounded-full border-2 border-success-500 border-t-transparent' />
			</div>
		);
	}

	return (
		<div className={cn('space-y-4', compact ? 'p-3' : 'p-4')}>
			<header className='flex items-center justify-between gap-3'>
				<div>
					<p className='text-sm font-medium text-success-700'>
						{unreadCount} non lue{unreadCount > 1 ? 's' : ''}
					</p>
					{!compact && (
						<h1 className='text-2xl font-semibold text-neutral-900'>
							Notifications
						</h1>
					)}
				</div>
				<Button
					variant='secondary'
					size={compact ? 'sm' : 'default'}
					disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
					onClick={() => markAllAsReadMutation.mutate()}>
					<Check className='size-4' />
					Tout lire
				</Button>
			</header>

			{isError ? (
				<div className='rounded-lg border border-error-200 bg-error-50 p-5 text-center'>
					<p className='text-sm text-error-700'>
						Impossible de charger les notifications.
					</p>
					<Button className='mt-3' variant='outline' onClick={() => refetch()}>
						Réessayer
					</Button>
				</div>
			) : notifications.length === 0 ? (
				<div className='rounded-lg border border-neutral-200 bg-neutral-50 p-8 text-center'>
					<Bell className='mx-auto mb-3 size-8 text-success-600' />
					<p className='font-semibold text-neutral-900'>Rien à signaler</p>
					<p className='mt-1 text-sm text-neutral-600'>
						Les alertes de péremption et de budget apparaîtront ici.
					</p>
				</div>
			) : (
				<section className='space-y-2' aria-label='Liste des notifications'>
					{notifications.map((notification) => {
						const target = getNotificationTarget(notification);
						return (
							<article
								key={notification.id}
								className={cn(
									'rounded-lg border bg-neutral-50 p-3',
									notification.isRead
										? 'border-neutral-200 opacity-75'
										: 'border-success-200'
								)}>
								<div className='flex gap-3'>
									<div
										className={cn(
											'flex size-9 shrink-0 items-center justify-center rounded-md border',
											typeStyles[notification.type]
										)}>
										<NotificationIcon type={notification.type} />
									</div>
									<div className='min-w-0 flex-1 space-y-1.5'>
										<div className='flex flex-wrap items-center gap-2'>
											<Badge variant='outline'>
												{typeLabels[notification.type]}
											</Badge>
											<span className='inline-flex items-center gap-1 text-xs text-neutral-600'>
												<Clock className='size-3' />
												{formatNotificationDate(notification.lastOccurredAt)}
											</span>
										</div>
										<h2 className='text-sm font-semibold text-neutral-900'>
											{notification.title}
										</h2>
										<p className='text-sm text-neutral-700'>
											{notification.message}
										</p>
										<div className='flex flex-wrap gap-2 pt-1'>
											{target && (
												<Button asChild size='sm' variant='outline'>
													<Link
														to={target}
														onClick={() => {
															if (!notification.isRead) {
																markAsReadMutation.mutate(notification.id);
															}
															onNavigate?.();
														}}>
														Ouvrir
													</Link>
												</Button>
											)}
											{!notification.isRead && (
												<Button
													size='sm'
													variant='secondary'
													disabled={markAsReadMutation.isPending}
													onClick={() =>
														markAsReadMutation.mutate(notification.id)
													}>
													<Check className='size-4' /> Lu
												</Button>
											)}
										</div>
									</div>
								</div>
							</article>
						);
					})}
					<div
						ref={loadMoreRef}
						className='flex min-h-10 items-center justify-center text-xs text-neutral-500'
						aria-live='polite'>
						{isFetchingNextPage
							? 'Chargement des notifications précédentes…'
							: !hasNextPage
								? 'Fin des notifications'
								: null}
					</div>
				</section>
			)}

			{compact && (
				<div className='border-t border-neutral-200 pt-3 text-center'>
					<Button asChild variant='link' size='sm'>
						<Link to='/app/notifications' onClick={onNavigate}>
							Voir tout l’historique
						</Link>
					</Button>
				</div>
			)}
		</div>
	);
}
