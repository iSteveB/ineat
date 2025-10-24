import { createFileRoute } from '@tanstack/react-router';
import ReceiptScanPage from '@/pages/receipt/ReceiptScanPage';

export const Route = createFileRoute('/app/inventory/add/receipt')({
	component: ReceiptScanPage,
});
