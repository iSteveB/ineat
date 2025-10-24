import { createFileRoute } from '@tanstack/react-router';
import { ReceiptResultsPage } from '@/pages/receipt/ReceiptResultsPage';

/**
 * Route pour afficher les résultats d'un ticket scanné
 * Path: /app/receipts/:receiptId/results
 */
export const Route = createFileRoute('/app/receipt/$receiptId/results')({
	component: ReceiptResultsPage,
});