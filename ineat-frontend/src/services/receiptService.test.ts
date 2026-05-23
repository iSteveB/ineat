import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	receiptService,
	RECEIPT_UPLOAD_ERROR_MESSAGE,
} from './receiptService';

const originalFetch = global.fetch;

const createReceiptFile = () =>
	new File(['receipt'], 'receipt.png', { type: 'image/png' });

describe('receiptService', () => {
	beforeEach(() => {
		global.fetch = vi.fn();
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.resetAllMocks();
	});

	describe('uploadReceipt', () => {
		it('masque les erreurs Cloudinary sensibles retournées par le backend', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: false,
				status: 500,
				json: vi.fn().mockResolvedValue({
					message:
						"Échec de l'upload sur Cloudinary: Invalid api_key 738474456436988",
				}),
			});

			await expect(
				receiptService.uploadReceipt(createReceiptFile())
			).rejects.toThrow(RECEIPT_UPLOAD_ERROR_MESSAGE);

			await expect(
				receiptService.uploadReceipt(createReceiptFile())
			).rejects.not.toThrow('Invalid api_key');
		});

		it('masque les erreurs avec le code RECEIPT_UPLOAD_FAILED', async () => {
			(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
				ok: false,
				status: 500,
				json: vi.fn().mockResolvedValue({
					code: 'RECEIPT_UPLOAD_FAILED',
					message: RECEIPT_UPLOAD_ERROR_MESSAGE,
				}),
			});

			await expect(
				receiptService.uploadReceipt(createReceiptFile())
			).rejects.toThrow(RECEIPT_UPLOAD_ERROR_MESSAGE);
		});
	});
});
