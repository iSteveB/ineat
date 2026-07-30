import { createFileRoute } from '@tanstack/react-router';

import AdminOperationsPage from '@/pages/admin/AdminOperationsPage';

export const Route = createFileRoute('/app/admin/operations/')({
	component: AdminOperationsPage,
});
