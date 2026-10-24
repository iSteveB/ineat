import { createFileRoute } from '@tanstack/react-router';

import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export const Route = createFileRoute('/app/notifications/')({
	component: NotificationsPage,
});

function NotificationsPage() {
	return (
		<div className='mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:px-6 lg:py-6'>
			<header>
				<h1 className='type-h1 text-neutral-900'>Notifications</h1>
				<p className='text-neutral-600'>
					Péremptions, budget et informations sur votre compte.
				</p>
			</header>
			<NotificationCenter />
		</div>
	);
}
