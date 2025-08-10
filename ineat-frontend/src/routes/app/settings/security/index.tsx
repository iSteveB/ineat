import { createFileRoute } from '@tanstack/react-router';
import SecurityPrivacyPage from '@/pages/settings/SecurityPrivacyPage';

export const Route = createFileRoute('/app/settings/security/')({
	component: SecurityPrivacyPage,
});

