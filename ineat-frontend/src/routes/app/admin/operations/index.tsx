import { createFileRoute } from '@tanstack/react-router';
import { Activity } from 'lucide-react';

import AdminPlaceholderPage from '@/pages/admin/AdminPlaceholderPage';

export const Route = createFileRoute('/app/admin/operations/')({
	component: () => (
		<AdminPlaceholderPage
			title='Opérations'
			description='La supervision des jobs, webhooks et notifications sera disponible ici.'
			icon={Activity}
		/>
	),
});
