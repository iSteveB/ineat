import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { inventoryService } from './inventoryService';
import { server } from '@/test/mocks/server';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

const inventoryItem = {
	id: '11111111-1111-4111-8111-111111111111',
	userId: '22222222-2222-4222-8222-222222222222',
	product: {
		id: '33333333-3333-4333-8333-333333333333',
		name: 'Yaourt nature',
		brand: 'Ferme locale',
		category: {
			id: '44444444-4444-4444-8444-444444444444',
			name: 'Produits laitiers',
			slug: 'produits-laitiers',
		},
		unitType: 'UNIT',
		createdAt: '2026-05-20T10:00:00.000Z',
		updatedAt: '2026-05-20T10:00:00.000Z',
	},
	quantity: 2,
	expiryDate: '2026-05-28T00:00:00.000Z',
	expiryDateSource: 'ESTIMATED',
	purchaseDate: '2026-05-20T00:00:00.000Z',
	purchasePrice: 3.5,
	createdAt: '2026-05-20T10:00:00.000Z',
	updatedAt: '2026-05-20T10:00:00.000Z',
	expiryStatus: 'GOOD',
};

describe('inventoryService', () => {
	it('récupère l’inventaire avec les filtres de dashboard', async () => {
		const requestedUrls: string[] = [];

		server.use(
			http.get(`${API_URL}/inventory`, ({ request }) => {
				requestedUrls.push(request.url);
				return HttpResponse.json([inventoryItem]);
			}),
		);

		const result = await inventoryService.getInventory({
			categoryId: 'cat-frais',
			storageLocation: 'fridge',
			expiringWithinDays: 7,
		});

		const requestedSearchParams = new URL(requestedUrls[0]).searchParams;
		expect(result).toHaveLength(1);
		expect(result[0].product.name).toBe('Yaourt nature');
		expect(requestedSearchParams?.get('category')).toBe('cat-frais');
		expect(requestedSearchParams?.get('storageLocation')).toBe('fridge');
		expect(requestedSearchParams?.get('expiringWithinDays')).toBe('7');
	});

	it('ajoute un produit manuel et expose l’impact budget', async () => {
		let requestBody: unknown;

		server.use(
			http.post(`${API_URL}/inventory/products`, async ({ request }) => {
				requestBody = await request.json();
				return HttpResponse.json({
					success: true,
					data: {
						item: inventoryItem,
						budget: {
							expenseCreated: true,
							message: 'Dépense ajoutée au budget',
							budgetId: '55555555-5555-4555-8555-555555555555',
							remainingBudget: 42,
						},
					},
				});
			}),
		);

		const result = await inventoryService.addManualProduct({
			name: 'Yaourt nature',
			category: 'cat-frais',
			unitType: 'UNIT',
			quantity: 2,
			purchaseDate: '2026-05-20',
			purchasePrice: 3.5,
		});

		expect(requestBody).toMatchObject({
			name: 'Yaourt nature',
			category: 'cat-frais',
			quantity: 2,
		});
		expect(result.productName).toBe('Yaourt nature');
		expect(result.shouldRefreshBudget).toBe(true);
		expect(result.budgetInfo.remainingBudget).toBe(42);
	});

	it('ajoute rapidement un produit existant', async () => {
		let requestBody: unknown;

		server.use(
			http.post(
				`${API_URL}/inventory/products/quick-add`,
				async ({ request }) => {
					requestBody = await request.json();
					return HttpResponse.json({
						success: true,
						data: {
							item: inventoryItem,
							budget: {
								expenseCreated: false,
								message: 'Produit ajouté',
							},
						},
					});
				},
			),
		);

		const result = await inventoryService.addExistingProductToInventory({
			productId: '33333333-3333-4333-8333-333333333333',
			quantity: 1,
			purchaseDate: '2026-05-20',
		});

		expect(requestBody).toMatchObject({
			productId: '33333333-3333-4333-8333-333333333333',
			quantity: 1,
		});
		expect(result.item.id).toBe(inventoryItem.id);
		expect(result.shouldRefreshBudget).toBe(false);
	});

	it('alimente les widgets dashboard récents et statistiques', async () => {
		server.use(
			http.get(`${API_URL}/inventory/recent`, ({ request }) => {
				const url = new URL(request.url);
				expect(url.searchParams.get('limit')).toBe('3');
				return HttpResponse.json([inventoryItem]);
			}),
			http.get(`${API_URL}/inventory/stats`, () =>
				HttpResponse.json({
					totalItems: 12,
					expiringSoon: 2,
					expired: 1,
					totalValue: 128.5,
				}),
			),
		);

		await expect(inventoryService.getRecentProducts(3)).resolves.toEqual([
			inventoryItem,
		]);
		await expect(inventoryService.getInventoryStats()).resolves.toMatchObject({
			totalItems: 12,
			expiringSoon: 2,
		});
	});

	it('remonte les états de validation client', async () => {
		await expect(
			inventoryService.addManualProduct({
				name: '',
				category: 'cat-frais',
				unitType: 'UNIT',
				quantity: 1,
				purchaseDate: '2026-05-20',
			}),
		).rejects.toThrow('Le nom du produit est requis');

		await expect(
			inventoryService.addExistingProductToInventory({
				productId: '',
				quantity: 1,
				purchaseDate: '2026-05-20',
			}),
		).rejects.toThrow("L'ID du produit est requis");
	});
});
