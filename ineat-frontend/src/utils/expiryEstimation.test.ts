import { describe, expect, it } from 'vitest';

import { getExpirySuggestion } from './expiryEstimation';

describe('getExpirySuggestion', () => {
	it('uses category and storage rules for seeded categories', () => {
		const suggestion = getExpirySuggestion({
			categorySlug: 'produits-laitiers',
			categoryName: 'Produits laitiers',
			storageLocation: 'refrigerateur',
			purchaseDate: '2026-05-01',
		});

		expect(suggestion).toEqual({
			date: '2026-05-15',
			reason: 'produits laitiers + refrigerateur',
		});
	});

	it('prioritizes exact product rules before broad category rules', () => {
		const suggestion = getExpirySuggestion({
			productName: 'Pain complet',
			categorySlug: 'epicerie-salee',
			storageLocation: 'placard',
			purchaseDate: '2026-05-01',
		});

		expect(suggestion).toEqual({
			date: '2026-05-06',
			reason: 'pain + placard',
		});
	});

	it('falls back to storage rules when nothing else matches', () => {
		const suggestion = getExpirySuggestion({
			productName: 'Produit mystère',
			categorySlug: 'categorie-inconnue',
			storageLocation: 'congelateur',
			purchaseDate: '2026-05-01',
		});

		expect(suggestion).toEqual({
			date: '2026-10-28',
			reason: 'stockage congelateur',
		});
	});
});
