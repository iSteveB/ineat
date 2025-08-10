import { createFileRoute } from '@tanstack/react-router';
import PersonalInfoPage from '@/pages/settings/PersonalInfoPage';

export const Route = createFileRoute('/app/settings/personal-info/')({
	component: PersonalInfoPage,
});



