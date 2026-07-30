import { createFileRoute } from '@tanstack/react-router';
import AdminPage from '@/pages/admin/AdminPage';
import { z } from 'zod';

export const Route = createFileRoute('/app/admin/')({
	component: AdminPage,
	validateSearch: z.object({
		period: z.enum(['7d', '30d', '90d', 'custom']).catch('30d'),
		from: z.string().date().optional(),
		to: z.string().date().optional(),
	}),
});
