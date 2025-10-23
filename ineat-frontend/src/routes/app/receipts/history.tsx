import { createFileRoute } from '@tanstack/react-router';
import { ReceiptHistoryPage } from '@/pages/receipt/ReceiptHistoryPage';

/**
 * Route pour afficher l'historique des tickets scannés
 * Path: /app/receipts/history
 */
export const Route = createFileRoute('/app/receipts/history')({
	component: ReceiptHistoryPage,
});