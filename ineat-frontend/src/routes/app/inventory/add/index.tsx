import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import AddProductPage from '@/pages/product/AddProductPage';

const searchSchema = z.object({
	productData: z.string().optional(),
});

export const Route = createFileRoute('/app/inventory/add/')({
	component: AddProductPage,
	validateSearch: searchSchema,
});
