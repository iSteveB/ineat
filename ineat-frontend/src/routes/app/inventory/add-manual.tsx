import { createFileRoute } from '@tanstack/react-router';
import { AddManualProductPage } from '@/pages/product/AddManualProductPage';

export const Route = createFileRoute('/app/inventory/add-manual')({
  component: AddManualProductPage,
});