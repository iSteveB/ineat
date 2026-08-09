import type { InvoiceItem } from '@/services/invoiceService';

export const RELIABLE_INVOICE_CONFIDENCE = 0.75;

export const getInvoiceItemTotal = (item: {
	quantity?: number;
	unitPrice?: number | null;
	totalPrice?: number | null;
}): number | null => {
	if (typeof item.totalPrice === 'number') return item.totalPrice;
	if (typeof item.quantity === 'number' && typeof item.unitPrice === 'number') {
		return Math.round(item.quantity * item.unitPrice * 100) / 100;
	}
	return null;
};

export const requiresInvoiceItemCorrection = (item: InvoiceItem): boolean =>
	!item.detectedName.trim() ||
	item.quantity <= 0 ||
	getInvoiceItemTotal(item) === null ||
	item.confidence < RELIABLE_INVOICE_CONFIDENCE ||
	['ERROR', 'NOT_FOUND', 'INCOMPLETE'].includes(
		item.externalProductStatus ?? ''
	);

export const sortInvoiceItemsForReview = (
	items: InvoiceItem[]
): InvoiceItem[] =>
	[...items].sort((left, right) => {
		const correctionDelta =
			Number(requiresInvoiceItemCorrection(right)) -
			Number(requiresInvoiceItemCorrection(left));
		if (correctionDelta !== 0) return correctionDelta;
		return left.confidence - right.confidence;
	});

export const getReliableInvoiceItemIds = (items: InvoiceItem[]): string[] =>
	items
		.filter((item) => !item.validated && !requiresInvoiceItemCorrection(item))
		.map((item) => item.id);

export const getInvoiceTotals = (items: InvoiceItem[], invoiceTotal?: number | null) => {
	const linesTotal = Math.round(
		items.reduce((sum, item) => sum + (getInvoiceItemTotal(item) ?? 0), 0) *
			100
	) / 100;
	const difference =
		typeof invoiceTotal === 'number'
			? Math.round((invoiceTotal - linesTotal) * 100) / 100
			: null;

	return { linesTotal, difference };
};
