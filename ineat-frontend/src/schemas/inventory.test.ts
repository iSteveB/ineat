import { describe, expect, it } from 'vitest';

import {
	AddExistingProductToInventorySchema,
	AddInventoryItemSchema,
	UpdateInventoryItemSchema,
} from './inventory';

const validManualProduct = {
	name: 'Yaourt nature',
	category: 'produits-laitiers',
	unitType: 'UNIT',
	quantity: 2,
	purchaseDate: '2026-05-01',
	expiryDate: '2026-05-10',
	purchasePrice: 3.5,
	barcode: '3017624010701',
};

const validProductId = '11111111-1111-4111-8111-111111111111';

describe('inventory schemas', () => {
	it('acceptent les données métier valides', () => {
		expect(() =>
			AddInventoryItemSchema.parse({
				...validManualProduct,
				packageStatus: 'UNOPENED',
				preparationStatus: 'RAW',
			}),
		).not.toThrow();

		expect(() =>
			AddExistingProductToInventorySchema.parse({
				productId: validProductId,
				quantity: 1,
				purchaseDate: '2026-05-01',
				expiryDate: '2026-05-10',
			}),
		).not.toThrow();
	});

	it('rejettent les états produit inconnus', () => {
		expect(
			AddInventoryItemSchema.safeParse({
				...validManualProduct,
				packageStatus: 'BROKEN',
			}).success,
		).toBe(false);

		expect(
			AddExistingProductToInventorySchema.safeParse({
				productId: validProductId,
				quantity: 1,
				purchaseDate: '2026-05-01',
				preparationStatus: 'WARM',
			}).success,
		).toBe(false);
	});

	it('rejettent les quantités, prix et codes-barres invalides avec messages UI', () => {
		expect(
			AddInventoryItemSchema.safeParse({
				...validManualProduct,
				quantity: 0,
			}).error?.issues[0].message,
		).toBe('La quantité doit être supérieure à 0');

		expect(
			AddInventoryItemSchema.safeParse({
				...validManualProduct,
				purchasePrice: -1,
			}).error?.issues[0].message,
		).toBe('Le prix ne peut pas être négatif');

		expect(
			AddInventoryItemSchema.safeParse({
				...validManualProduct,
				barcode: '12345678901234',
			}).error?.issues[0].message,
		).toBe('Le code-barres doit contenir entre 8 et 13 chiffres');
	});

	it('rejettent les dates incohérentes ou futures', () => {
		expect(
			AddInventoryItemSchema.safeParse({
				...validManualProduct,
				purchaseDate: '2999-01-01',
			}).error?.issues[0].message,
		).toBe("La date d'achat ne peut pas être dans le futur");

		expect(
			AddInventoryItemSchema.safeParse({
				...validManualProduct,
				purchaseDate: '2026-05-10',
				expiryDate: '2026-05-01',
			}).error?.issues[0].message,
		).toBe("La date de péremption doit être postérieure à la date d'achat");
	});

	it('protègent aussi les ajouts rapides et mises à jour', () => {
		expect(
			AddExistingProductToInventorySchema.safeParse({
				productId: validProductId,
				quantity: 1,
				purchaseDate: '2026-05-10',
				expiryDate: '2026-05-01',
			}).error?.issues[0].message,
		).toBe("La date de péremption doit être postérieure à la date d'achat");

		expect(
			UpdateInventoryItemSchema.safeParse({
				quantity: -1,
			}).error?.issues[0].message,
		).toBe('La quantité doit être supérieure à 0');
	});
});
