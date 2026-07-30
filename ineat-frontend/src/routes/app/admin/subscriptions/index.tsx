import { createFileRoute } from '@tanstack/react-router';

import AdminSubscriptionsPage from '@/pages/admin/AdminSubscriptionsPage';

export const Route = createFileRoute('/app/admin/subscriptions/')({
	component: AdminSubscriptionsPage,
});
