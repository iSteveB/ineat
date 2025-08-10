import { createFileRoute } from '@tanstack/react-router';
import DietaryRestrictionsPage from '@/pages/settings/DietRestrictionPage';

export const Route = createFileRoute('/app/settings/diet-restrictions/')({
	component: DietaryRestrictionsPage,
});


