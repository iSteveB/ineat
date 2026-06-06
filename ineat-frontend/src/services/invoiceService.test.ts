import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';

import { invoiceService } from './invoiceService';
import { server } from '@/test/mocks/server';

const API_URL = `${import.meta.env.VITE_API_URL}/api`;

const invoice = {
	id: '11111111-1111-4111-8111-111111111111',
	userId: '22222222-2222-4222-8222-222222222222',
	pdfUrl: 'https://res.cloudinary.com/demo/raw/upload/invoice.pdf',
	status: 'COMPLETED',
	merchantName: 'Drive Démo',
	totalAmount: 12.5,
	purchaseDate: '2026-06-05T00:00:00.000Z',
	createdAt: '2026-06-05T10:00:00.000Z',
	updatedAt: '2026-06-05T10:00:00.000Z',
	items: [
		{
			id: '33333333-3333-4333-8333-333333333333',
			invoiceId: '11111111-1111-4111-8111-111111111111',
			detectedName: 'Pommes',
			quantity: 2,
			unitPrice: 2.5,
			totalPrice: 5,
			confidence: 0.93,
			validated: false,
			suggestedEans: [],
			createdAt: '2026-06-05T10:00:00.000Z',
			updatedAt: '2026-06-05T10:00:00.000Z',
		},
	],
};

describe('invoiceService', () => {
	it('importe une facture PDF en multipart', async () => {
		let contentType: string | null = null;
		let uploadedFileName = '';

		server.use(
			http.post(`${API_URL}/invoices/drive-import`, async ({ request }) => {
				contentType = request.headers.get('content-type');
				const formData = await request.formData();
				const file = formData.get('file') as File;
				uploadedFileName = file.name;

				return HttpResponse.json({
					success: true,
					data: invoice,
					message: 'Facture importée',
				});
			})
		);

		const file = new File(['%PDF-1.4'], 'facture.pdf', {
			type: 'application/pdf',
		});
		const result = await invoiceService.importDriveInvoice(file);

		expect(contentType).toContain('multipart/form-data');
		expect(uploadedFileName).toBe('facture.pdf');
		expect(result.id).toBe(invoice.id);
	});

	it('refuse côté client les fichiers non PDF', async () => {
		const file = new File(['png'], 'facture.png', { type: 'image/png' });

		await expect(invoiceService.importDriveInvoice(file)).rejects.toThrow(
			'Seules les factures PDF sont acceptées'
		);
	});

	it('met à jour une ligne détectée', async () => {
		let requestBody: unknown;

		server.use(
			http.patch(
				`${API_URL}/invoices/${invoice.id}/items/${invoice.items[0].id}`,
				async ({ request }) => {
					requestBody = await request.json();
					return HttpResponse.json({
						...invoice.items[0],
						detectedName: 'Pommes bio',
					});
				}
			)
		);

		const result = await invoiceService.updateInvoiceItem(
			invoice.id,
			invoice.items[0].id,
			{ detectedName: 'Pommes bio' }
		);

		expect(requestBody).toMatchObject({ detectedName: 'Pommes bio' });
		expect(result.detectedName).toBe('Pommes bio');
	});

	it('valide une sélection de lignes', async () => {
		let requestBody: unknown;

		server.use(
			http.post(
				`${API_URL}/invoices/${invoice.id}/validate`,
				async ({ request }) => {
					requestBody = await request.json();
					return HttpResponse.json({
						success: true,
						invoiceId: invoice.id,
						validatedItemCount: 1,
						skippedItemCount: 0,
						inventoryItemCount: 1,
						expenseCount: 1,
						totalBudgetAmount: 5,
						message: 'Validé',
					});
				}
			)
		);

		const result = await invoiceService.validateInvoice(invoice.id, [
			invoice.items[0].id,
		]);

		expect(requestBody).toEqual({ invoiceItemIds: [invoice.items[0].id] });
		expect(result.validatedItemCount).toBe(1);
		expect(result.totalBudgetAmount).toBe(5);
	});
});
