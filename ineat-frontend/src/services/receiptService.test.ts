import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { receiptService } from './receiptService';
import { server } from '@/test/mocks/server';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

describe('receiptService', () => {
	it('upload un ticket et retourne son identifiant', async () => {
		let uploadedDocumentType: FormDataEntryValue | null = null;

		server.use(
			http.post(`${API_URL}/receipt/upload`, async ({ request }) => {
				const body = await request.formData();
				uploadedDocumentType = body.get('documentType');
				return HttpResponse.json({
					data: { receiptId: 'receipt-1' },
				});
			})
		);

		const file = new File(['image'], 'ticket.png', { type: 'image/png' });

		await expect(receiptService.uploadReceipt(file)).resolves.toEqual({
			receiptId: 'receipt-1',
		});
		expect(uploadedDocumentType).toBe('receipt_image');
	});

	it('mappe les états backend de traitement en états frontend', async () => {
		server.use(
			http.get(`${API_URL}/receipt/:receiptId/status`, ({ params }) =>
				HttpResponse.json({
					data: {
						id: params.receiptId,
						status: 'PROCESSING',
						progress: 65,
						currentStep: 'llm',
					},
				})
			)
		);

		await expect(
			receiptService.getReceiptStatus('receipt-1')
		).resolves.toMatchObject({
			receiptId: 'receipt-1',
			status: 'analyzing',
			progress: 65,
			currentStep: 'llm',
		});
	});

	it('expose les erreurs de traitement ticket', async () => {
		server.use(
			http.get(`${API_URL}/receipt/:receiptId/status`, () =>
				HttpResponse.json({
					data: {
						receiptId: 'receipt-2',
						status: 'FAILED',
						errorMessage: 'OCR illisible',
					},
				})
			)
		);

		await expect(
			receiptService.getReceiptStatus('receipt-2')
		).resolves.toMatchObject({
			status: 'error',
			errorMessage: 'OCR illisible',
		});
	});

	it('normalise les résultats d’analyse et les suggestions EAN', async () => {
		server.use(
			http.get(`${API_URL}/receipt/:receiptId/analysis`, () =>
				HttpResponse.json({
					data: {
						id: 'receipt-3',
						merchantName: 'Marché Central',
						totalAmount: 14.9,
						confidence: 0.8,
						items: [
							{
								id: 'line-1',
								name: 'Compote pomme',
								quantity: 2,
								unitPrice: 1.2,
								totalPrice: 2.4,
								confidence: 0.9,
								suggestedEans: [
									{
										ean: '3017624010701',
										confidence: 0.95,
										brand: 'Materne',
										productName: 'Compote pomme',
										image: null,
									},
								],
							},
						],
					},
				})
			)
		);

		const analysis = await receiptService.getReceiptAnalysis('receipt-3');

		expect(analysis.merchantName).toBe('Marché Central');
		expect(analysis.products[0]).toMatchObject({
			id: 'line-1',
			name: 'Compote pomme',
			category: 'packaged',
			requiresBarcode: true,
			status: 'pending',
		});
		expect(analysis.products[0].suggestedEans[0].ean).toBe(
			'3017624010701'
		);
	});

	it('valide un produit puis ajoute les lignes au stock', async () => {
		const calls: Array<{ method: string; url: string; body?: unknown }> = [];

		server.use(
			http.put(
				`${API_URL}/receipt/:receiptId/products/:productId/validate`,
				async ({ request }) => {
					calls.push({
						method: request.method,
						url: request.url,
						body: await request.json(),
					});
					return new HttpResponse(null, { status: 204 });
				}
			),
			http.post(
				`${API_URL}/receipt/:receiptId/add-to-inventory`,
				async ({ request }) => {
					calls.push({
						method: request.method,
						url: request.url,
						body: await request.json(),
					});
					return new HttpResponse(null, { status: 204 });
				}
			)
		);

		await receiptService.validateProduct({
			receiptId: 'receipt-4',
			productId: 'line-1',
			eanCode: '3017624010701',
		});
		await receiptService.addToInventory({
			receiptId: 'receipt-4',
			products: [
				{
					productId: 'line-1',
					eanCode: '3017624010701',
					quantity: 2,
				},
			],
		});

		expect(calls[0]).toMatchObject({
			method: 'PUT',
			body: { eanCode: '3017624010701' },
		});
		expect(calls[1]).toMatchObject({
			method: 'POST',
			body: {
				products: [
					{
						productId: 'line-1',
						eanCode: '3017624010701',
						quantity: 2,
					},
				],
			},
		});
	});
});
