import { createFileRoute } from '@tanstack/react-router';

import AdminAuditPage from '@/pages/admin/AdminAuditPage';

export const Route = createFileRoute('/app/admin/audit/')({
	component: AdminAuditPage,
});
