import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { BudgetPage } from '@/pages/budget/BudgetPage';

const monthSchema = z
	.string()
	.regex(/^\d{4}-(0[1-9]|1[0-2])$/)
	.optional();

export const Route = createFileRoute('/app/budget/')({
	component: BudgetPage,
	validateSearch: z.object({ month: monthSchema }),
});
