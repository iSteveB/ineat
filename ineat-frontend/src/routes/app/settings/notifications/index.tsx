import { createFileRoute } from '@tanstack/react-router';

import NotificationSettingsPage from '@/pages/settings/NotificationSettingsPage';

export const Route = createFileRoute('/app/settings/notifications/')({
	component: NotificationSettingsPage,
});
