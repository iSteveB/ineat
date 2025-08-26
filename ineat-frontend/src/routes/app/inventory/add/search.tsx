import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import AddManualProductPage from '@/pages/product/AddManualProductPage';

const searchSchema = z.object({
	barcode: z.number().optional(),
});

export const Route = createFileRoute('/app/inventory/add/search')({
	component: AddManualProductPage,
	validateSearch: searchSchema,
});
