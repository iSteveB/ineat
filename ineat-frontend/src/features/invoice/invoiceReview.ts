import type { InvoiceItem } from '@/services/invoiceService';

export const RELIABLE_INVOICE_CONFIDENCE = 0.75;

const VALID_BARCODE_PATTERN = /^\d{8,13}$/;

export const hasInvoiceItemBarcode = (item: InvoiceItem): boolean =>
	item.barcodeType !== 'STORE_REFERENCE' &&
	item.barcodeType !== 'NONE' &&
	[item.selectedEan, item.productCode].some(
		(value) => typeof value === 'string' && VALID_BARCODE_PATTERN.test(value)
	);

export const getBarcodeFreeProductLabel = (item: InvoiceItem): string => {
	if (item.productForm === 'BULK') return 'Produit en vrac';
	if (item.productForm === 'FRESH') return 'Produit frais';

	// Compatibilité avec les factures analysées avant l'ajout de productForm.
	if (!item.productForm && /\bvrac\b/i.test(item.detectedName)) {
		return 'Produit en vrac';
	}
	if (
		!item.productForm &&
		(item.category === 'fruits-et-legumes' ||
			item.category === 'viandes-et-poissons')
	) {
		return 'Produit frais';
	}
	return 'Produit sans code-barres';
};

export const shouldUseOpenFoodFacts = (item: InvoiceItem): boolean =>
	item.barcodeType === 'GTIN' ||
	(item.barcodeType == null && hasInvoiceItemBarcode(item));

export const canChooseInvoiceProductCreation = (item: InvoiceItem): boolean =>
	!item.validated &&
	!item.productId &&
	!item.product &&
	['NOT_FOUND', 'SKIPPED'].includes(item.externalProductStatus ?? '');

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
	(!item.productId &&
		!item.product &&
		(['ERROR', 'INCOMPLETE'].includes(item.externalProductStatus ?? '') ||
			(canChooseInvoiceProductCreation(item) &&
				!item.productFormConfirmed)));

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
