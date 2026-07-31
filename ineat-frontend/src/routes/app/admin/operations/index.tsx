import { createFileRoute } from '@tanstack/react-router';

import AdminOperationsPage from '@/pages/admin/AdminOperationsPage';
import { z } from 'zod';

export const Route = createFileRoute('/app/admin/operations/')({
	validateSearch: z.object({
		incident: z
			.enum(['INVOICE', 'NOTIFICATION', 'STRIPE_WEBHOOK', 'RESEND'])
			.optional(),
		jobState: z.enum(['waiting', 'active', 'failed']).optional(),
	}),
	component: AdminOperationsRoute,
});

function AdminOperationsRoute() {
	const search = Route.useSearch();
	return (
		<AdminOperationsPage
			initialIncidentType={search.incident}
			initialJobState={search.jobState}
		/>
	);
}
