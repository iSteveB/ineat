import { createFileRoute } from '@tanstack/react-router';
import SettingsPage from '@/pages/settings/SettingsPage';

export const Route = createFileRoute('/app/settings/')({
	component: SettingsPage,
});


