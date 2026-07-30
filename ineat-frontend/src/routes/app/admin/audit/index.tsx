import { createFileRoute } from '@tanstack/react-router';
import { History } from 'lucide-react';

import AdminPlaceholderPage from '@/pages/admin/AdminPlaceholderPage';

export const Route = createFileRoute('/app/admin/audit/')({
	component: () => (
		<AdminPlaceholderPage
			title='Journal d’audit'
			description='L’historique filtrable des actions administratives sera disponible ici.'
			icon={History}
		/>
	),
});
