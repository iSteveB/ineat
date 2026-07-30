import { createFileRoute } from '@tanstack/react-router';

import AdminUsersPage from '@/pages/admin/AdminUsersPage';

export const Route = createFileRoute('/app/admin/users/')({
	component: AdminUsersPage,
});
