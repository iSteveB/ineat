import {
	useInfiniteQuery,
	useMutation,
	useQueryClient,
} from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import {
	AlertTriangle,
	BellOff,
	Check,
	CheckCheck,
	CircleDollarSign,
	Info,
	Loader2,
	type LucideIcon,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { notificationService } from '@/services/notificationService';
import type {
	AppNotification,
	NotificationType,
} from '@/services/notificationService';

const typeConfig: Record<
	NotificationType,
	{ label: string; icon: LucideIcon; className: string }
> = {
	EXPIRY: {
		label: 'Péremption',
		icon: AlertTriangle,
		className: 'bg-warning-50 text-warning-700',
	},
	BUDGET: {
		label: 'Budget',
		icon: CircleDollarSign,
		className: 'bg-danger-50 text-danger-700',
	},
	SYSTEM: {
		label: 'Information',
		icon: Info,
		className: 'bg-info-50 text-info-700',
	},
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

function formatNotificationDate(date: string) {
	return new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
	}).format(new Date(date));
}

/**
 * Liste des notifications, avec chargement progressif.
 * `compact` sert au panneau de la cloche ; la page complète porte son propre <h1>.
 */
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
	// Dans le panneau (dialog titré en h2), les titres de notification descendent d'un niveau
	const ItemHeading = compact ? 'h3' : 'h2';
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
			<div
				role='status'
				className='flex min-h-48 items-center justify-center gap-2 text-sm text-neutral-600'>
				<Loader2 className='size-5 animate-spin text-accent-700' aria-hidden='true' />
				Chargement des notifications…
			</div>
		);
	}

	return (
		<div className={cn('flex flex-col gap-4', compact && 'p-3')}>
			{compact && (
				<p className='pr-10 font-display text-lg font-bold text-neutral-900' aria-hidden='true'>
					Notifications
				</p>
			)}
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<p className='text-sm font-medium text-neutral-700'>
					{unreadCount === 0
						? 'Tout est lu'
						: `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}`}
				</p>
				<Button
					variant='secondary'
					size='sm'
					disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
					onClick={() => markAllAsReadMutation.mutate()}>
					<CheckCheck aria-hidden='true' />
					Tout marquer comme lu
				</Button>
			</div>

			{isError ? (
				<Alert variant='error'>
					<AlertTriangle aria-hidden='true' />
					<AlertTitle>Impossible de charger les notifications.</AlertTitle>
					<AlertDescription>
						<Button
							className='mt-2'
							variant='secondary'
							size='sm'
							onClick={() => refetch()}>
							Réessayer
						</Button>
					</AlertDescription>
				</Alert>
			) : notifications.length === 0 ? (
				<div className='card flex flex-col items-center gap-2 p-8 text-center'>
					<span className='flex size-12 items-center justify-center rounded-full bg-accent-50 text-accent-700'>
						<BellOff className='size-6' aria-hidden='true' />
					</span>
					<p className='type-h3 text-neutral-900'>Aucune notification</p>
					<p className='text-sm text-neutral-600'>
						Les alertes de péremption et de budget apparaîtront ici.
					</p>
				</div>
			) : (
				<section aria-label='Liste des notifications'>
					<ul
						className={cn(
							'divide-y divide-neutral-200 overflow-hidden',
							compact ? 'rounded-lg border border-neutral-200' : 'card p-0'
						)}>
						{notifications.map((notification) => {
							const target = getNotificationTarget(notification);
							const config = typeConfig[notification.type];
							const Icon = config.icon;
							return (
								<li
									key={notification.id}
									className={cn(
										'relative flex gap-3 p-4',
										!notification.isRead && 'bg-accent-50/60'
									)}>
									<span
										className={cn(
											'flex size-10 shrink-0 items-center justify-center rounded-md',
											config.className
										)}>
										<Icon className='size-5' aria-hidden='true' />
									</span>
									<div className='min-w-0 flex-1'>
										<div className='flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-600'>
											<span className='font-semibold uppercase tracking-wide'>
												{config.label}
											</span>
											<span aria-hidden='true'>·</span>
											<time dateTime={notification.lastOccurredAt}>
												{formatNotificationDate(notification.lastOccurredAt)}
											</time>
											{!notification.isRead && (
												<span className='inline-flex items-center gap-1 font-semibold text-accent-800'>
													<span
														className='size-2 rounded-full bg-accent-600'
														aria-hidden='true'
													/>
													Non lue
												</span>
											)}
										</div>
										<ItemHeading className='mt-1 font-semibold text-neutral-900'>
											{notification.title}
										</ItemHeading>
										<p className='text-sm text-neutral-700'>
											{notification.message}
										</p>
										{(target || !notification.isRead) && (
											<div className='mt-2 flex flex-wrap gap-2'>
												{target && (
													<Button asChild size='sm' variant='secondary'>
														<Link
															to={target}
															onClick={() => {
																if (!notification.isRead) {
																	markAsReadMutation.mutate(notification.id);
																}
																onNavigate?.();
															}}>
															Voir
														</Link>
													</Button>
												)}
												{!notification.isRead && (
													<Button
														size='sm'
														variant='ghost'
														disabled={markAsReadMutation.isPending}
														onClick={() =>
															markAsReadMutation.mutate(notification.id)
														}>
														<Check aria-hidden='true' />
														Marquer comme lu
													</Button>
												)}
											</div>
										)}
									</div>
								</li>
							);
						})}
					</ul>
					<div
						ref={loadMoreRef}
						className='flex min-h-10 items-center justify-center text-xs text-neutral-600'
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
