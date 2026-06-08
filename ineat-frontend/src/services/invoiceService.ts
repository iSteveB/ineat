import { apiClient } from '@/lib/api-client';

export const INVOICE_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const INVOICE_IMPORT_TIMEOUT_MS = 120000;

export type InvoiceStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'VALIDATED';

export interface InvoiceItem {
	id: string;
	invoiceId: string;
	productId?: string | null;
	detectedName: string;
	quantity: number;
	unitPrice?: number | null;
	totalPrice?: number | null;
	confidence: number;
	validated: boolean;
	productCode?: string | null;
	category?: string | null;
	discount?: number | null;
	selectedEan?: string | null;
	suggestedEans: string[];
	externalProductProvider?: string | null;
	externalProductStatus?:
		| 'SKIPPED'
		| 'FOUND'
		| 'NOT_FOUND'
		| 'INCOMPLETE'
		| 'ERROR'
		| null;
	externalProductData?: {
		source: 'openfoodfacts';
		barcode: string;
		name?: string | null;
		brand?: string | null;
		quantity?: string | null;
		imageUrl?: string | null;
		categoriesTags?: string[];
		completeness?: number | null;
		raw?: Record<string, unknown>;
	} | null;
	externalProductError?: string | null;
	product?: {
		id: string;
		name: string;
		brand?: string | null;
		barcode?: string | null;
		category?: {
			id: string;
			name: string;
			slug: string;
			icon?: string | null;
		} | null;
	} | null;
	expiryDate?: string | null;
	storageLocation?: string | null;
	notes?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Invoice {
	id: string;
	userId: string;
	pdfUrl: string;
	status: InvoiceStatus;
	merchantName?: string | null;
	totalAmount?: number | null;
	purchaseDate?: string | null;
	invoiceNumber?: string | null;
	orderNumber?: string | null;
	analysisProvider?: string | null;
	analysisConfidence?: number | null;
	processingTime?: number | null;
	errorMessage?: string | null;
	createdAt: string;
	updatedAt: string;
	items: InvoiceItem[];
}

export interface DriveImportResponse {
	success: boolean;
	data: Invoice;
	message: string;
}

export interface UpdateInvoiceItemInput {
	detectedName?: string;
	quantity?: number;
	unitPrice?: number;
	totalPrice?: number;
	category?: string;
	productId?: string | null;
	expiryDate?: string;
	storageLocation?: string;
	notes?: string;
	selectedEan?: string | null;
}

export interface ValidateInvoiceResponse {
	success: boolean;
	invoiceId: string;
	validatedItemCount: number;
	skippedItemCount: number;
	inventoryItemCount: number;
	expenseCount: number;
	totalBudgetAmount: number;
	message: string;
}

const validatePdf = (file: File): void => {
	if (file.type !== 'application/pdf') {
		throw new Error('Seules les factures PDF sont acceptées');
	}

	if (!file.name.toLowerCase().endsWith('.pdf')) {
		throw new Error('Le fichier doit avoir une extension PDF');
	}

	if (file.size > INVOICE_MAX_FILE_SIZE_BYTES) {
		throw new Error('La facture PDF ne doit pas dépasser 5 Mo');
	}
};

export const invoiceService = {
	async importDriveInvoice(file: File): Promise<Invoice> {
		validatePdf(file);

		const formData = new FormData();
		formData.append('file', file);

		const response = await apiClient.fetch<DriveImportResponse>(
			'/invoices/drive-import',
			{
				method: 'POST',
				body: formData,
				timeoutMs: INVOICE_IMPORT_TIMEOUT_MS,
			}
		);

		return response.data;
	},

	async getInvoice(invoiceId: string): Promise<Invoice> {
		return apiClient.get<Invoice>(`/invoices/${invoiceId}`);
	},

	async updateInvoiceItem(
		invoiceId: string,
		itemId: string,
		data: UpdateInvoiceItemInput
	): Promise<InvoiceItem> {
		return apiClient.patch<InvoiceItem>(
			`/invoices/${invoiceId}/items/${itemId}`,
			data
		);
	},

	async validateInvoice(
		invoiceId: string,
		invoiceItemIds: string[]
	): Promise<ValidateInvoiceResponse> {
		return apiClient.post<ValidateInvoiceResponse>(
			`/invoices/${invoiceId}/validate`,
			{ invoiceItemIds }
		);
	},
};
