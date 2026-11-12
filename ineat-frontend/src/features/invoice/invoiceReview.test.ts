import { describe, expect, it } from 'vitest';

import type { InvoiceItem } from '@/services/invoiceService';
import {
	canChooseInvoiceProductCreation,
	getBarcodeFreeProductLabel,
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
			item({
				id: 'uncertain',
				externalProductStatus: 'NOT_FOUND',
				selectedEan: '3564700012345'
			}),
			item({ id: 'validated', validated: true })
		];

		expect(getReliableInvoiceItemIds(items)).toEqual(['reliable']);
		expect(requiresInvoiceItemCorrection(items[1])).toBe(true);
	});

	it('demande un choix pour un produit non trouvé sans code-barres', () => {
		const barcodeFreeItem = item({ externalProductStatus: 'NOT_FOUND' });

		expect(canChooseInvoiceProductCreation(barcodeFreeItem)).toBe(true);
		expect(requiresInvoiceItemCorrection(barcodeFreeItem)).toBe(true);
	});

	it('adapte le libellé des produits sans code-barres', () => {
		expect(
			getBarcodeFreeProductLabel(
				item({
					detectedName: 'Poireaux en botte',
					category: 'fruits-et-legumes',
					productForm: 'BULK'
				})
			)
		).toBe('Produit en vrac');
		expect(
			getBarcodeFreeProductLabel(
				item({
					detectedName: 'Filet mignon',
					category: 'viandes-et-poissons',
					productForm: 'FRESH'
				})
			)
		).toBe('Produit frais');
		expect(
			getBarcodeFreeProductLabel(
				item({ detectedName: 'Produit artisanal', category: 'autres' })
			)
		).toBe('Produit sans code-barres');
	});

	it('distingue une erreur OpenFoodFacts d’un produit non trouvé', () => {
		const freshItem = item({
			productForm: 'FRESH',
			barcodeType: 'STORE_REFERENCE',
			externalProductStatus: 'ERROR',
			productCode: '2012345678901'
		});

		expect(canChooseInvoiceProductCreation(freshItem)).toBe(false);
		expect(requiresInvoiceItemCorrection(freshItem)).toBe(true);
		expect(getBarcodeFreeProductLabel(freshItem)).toBe('Produit frais');
	});

	it('valide un produit non trouvé après le choix explicite de l’utilisateur', () => {
		const confirmedItem = item({
			externalProductStatus: 'NOT_FOUND',
			productForm: 'FRESH',
			productFormConfirmed: true
		});

		expect(canChooseInvoiceProductCreation(confirmedItem)).toBe(true);
		expect(requiresInvoiceItemCorrection(confirmedItem)).toBe(false);
	});

	it('ne propose pas de création si un produit InEat est déjà associé', () => {
		const existingItem = item({
			externalProductStatus: 'NOT_FOUND',
			productId: 'product-1'
		});

		expect(canChooseInvoiceProductCreation(existingItem)).toBe(false);
		expect(requiresInvoiceItemCorrection(existingItem)).toBe(false);
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
