import { createFileRoute } from '@tanstack/react-router';
import { AddManualProductPage } from '@/features/inventory/components/AddManualProductPage';

export const Route = createFileRoute('/app/inventory/add-manual')({
  component: AddManualProductPage,
  errorComponent: ErrorComponent,
});

function ErrorComponent() {
  return <div> 404 ERROR </div>;
}