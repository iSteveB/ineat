import { createFileRoute } from '@tanstack/react-router';

import AdminUserDetailPage from '@/pages/admin/AdminUserDetailPage';
import { adminUserSearchSchema } from '@/pages/admin/adminUserSearch';

export const Route = createFileRoute('/app/admin/users/$userId')({
	component: AdminUserDetailPage,
	validateSearch: adminUserSearchSchema,
});
