import { describe, expect, it } from 'vitest';

import type { InvoiceItem } from '@/services/invoiceService';
import {
	getInvoiceTotals,
	getReliableInvoiceItemIds,
	requiresInvoiceItemCorrection,
	sortInvoiceItemsForReview
} from './invoiceReview';

const item = (overrides: Partial<InvoiceItem>): InvoiceItem => ({
	id: 'item-1',
	invoiceId: 'invoice-1',
	detectedName: 'Pommes',
	quantity: 1,
	unitPrice: 2,
	totalPrice: 2,
	confidence: 0.9,
	validated: false,
	suggestedEans: [],
	createdAt: '2026-08-09T00:00:00.000Z',
	updatedAt: '2026-08-09T00:00:00.000Z',
	...overrides
});

describe('invoiceReview', () => {
	it('place les exceptions avant les lignes fiables', () => {
		const reliable = item({ id: 'reliable' });
		const uncertain = item({ id: 'uncertain', confidence: 0.4 });

		expect(sortInvoiceItemsForReview([reliable, uncertain]).map(({ id }) => id))
			.toEqual(['uncertain', 'reliable']);
	});

	it('identifie les lignes fiables pour une validation partielle', () => {
		const items = [
			item({ id: 'reliable' }),
			item({ id: 'uncertain', externalProductStatus: 'NOT_FOUND' }),
			item({ id: 'validated', validated: true })
		];

		expect(getReliableInvoiceItemIds(items)).toEqual(['reliable']);
		expect(requiresInvoiceItemCorrection(items[1])).toBe(true);
	});

	it('calcule la somme des lignes et l’écart avec la facture', () => {
		expect(
			getInvoiceTotals(
				[item({ totalPrice: 3 }), item({ id: 'item-2', totalPrice: 4.5 })],
				8
			)
		).toEqual({ linesTotal: 7.5, difference: 0.5 });
	});
});
