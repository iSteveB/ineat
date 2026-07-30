import { createFileRoute } from '@tanstack/react-router';
import { CreditCard } from 'lucide-react';

import AdminPlaceholderPage from '@/pages/admin/AdminPlaceholderPage';

export const Route = createFileRoute('/app/admin/subscriptions/')({
	component: () => (
		<AdminPlaceholderPage
			title='Abonnements'
			description='Les commandes métier et les anomalies d’abonnement seront disponibles ici.'
			icon={CreditCard}
		/>
	),
});
