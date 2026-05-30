import { createFileRoute } from '@tanstack/react-router';
import AdminPage from '@/pages/admin/AdminPage';

export const Route = createFileRoute('/app/admin/')({
	component: AdminPage,
});
