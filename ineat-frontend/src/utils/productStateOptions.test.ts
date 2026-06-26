import { describe, expect, it } from 'vitest';

import { getProductStateOptions } from './productStateOptions';

describe('getProductStateOptions', () => {
	it('does not ask for cooked/raw for dry rice stored in the pantry', () => {
		expect(
			getProductStateOptions({
				productName: 'Riz basmati',
				categorySlug: 'epicerie-salee',
				storageLocation: 'placard',
			}),
		).toEqual({
			showPackageStatus: false,
			showPreparationStatus: false,
			defaultPackageStatus: undefined,
			defaultPreparationStatus: undefined,
		});
	});

	it('defaults rice stored in the fridge to cooked', () => {
		expect(
			getProductStateOptions({
				productName: 'Riz basmati',
				categorySlug: 'epicerie-salee',
				storageLocation: 'refrigerateur',
			}),
		).toEqual({
			showPackageStatus: false,
			showPreparationStatus: true,
			defaultPackageStatus: undefined,
			defaultPreparationStatus: 'COOKED',
		});
	});

	it('defaults fish stored in the fridge to raw', () => {
		expect(
			getProductStateOptions({
				productName: 'Filet de poisson',
				categorySlug: 'viandes-et-poissons',
				storageLocation: 'refrigerateur',
			}),
		).toEqual({
			showPackageStatus: false,
			showPreparationStatus: true,
			defaultPackageStatus: undefined,
			defaultPreparationStatus: 'RAW',
		});
	});

	it('offers opened/closed for dairy products', () => {
		expect(
			getProductStateOptions({
				productName: 'Lait demi-écrémé',
				categorySlug: 'produits-laitiers',
				storageLocation: 'refrigerateur',
			}),
		).toEqual({
			showPackageStatus: true,
			showPreparationStatus: false,
			defaultPackageStatus: 'UNOPENED',
			defaultPreparationStatus: undefined,
		});
	});
});
