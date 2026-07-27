import { createFileRoute } from '@tanstack/react-router';

import { NotificationCenter } from '@/components/notifications/NotificationCenter';

export const Route = createFileRoute('/app/notifications/')({
	component: NotificationsPage,
});

function NotificationsPage() {
	return (
		<div className='mx-auto max-w-4xl'>
			<NotificationCenter />
		</div>
	);
}
