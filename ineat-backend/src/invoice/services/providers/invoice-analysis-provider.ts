import { Prisma } from '../../../../prisma/generated/prisma/client';

export type InvoiceExternalProductStatus =
  | 'SKIPPED'
  | 'FOUND'
  | 'NOT_FOUND'
  | 'INCOMPLETE'
  | 'ERROR';

export interface InvoiceExternalProductData {
  source: 'openfoodfacts';
  barcode: string;
  name?: string | null;
  brand?: string | null;
  quantity?: string | null;
  imageUrl?: string | null;
  categoriesTags?: string[];
  nutriscore?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  ecoscore?: 'A' | 'B' | 'C' | 'D' | 'E' | null;
  novascore?: 'GROUP_1' | 'GROUP_2' | 'GROUP_3' | 'GROUP_4' | null;
  ingredients?: string | null;
  nutrients?: {
    energy?: number;
    carbohydrates?: number;
    sugars?: number;
    proteins?: number;
    fats?: number;
    saturatedFats?: number;
    fiber?: number;
    salt?: number;
  } | null;
  completeness?: number | null;
  raw?: Record<string, unknown>;
}

export interface AnalyzedInvoiceItem {
  detectedName: string;
  quantity: number;
  unitPrice?: number | null;
  totalPrice?: number | null;
  confidence: number;
  productCode?: string | null;
  category?: string | null;
  storageLocation?: string | null;
  discount?: number | null;
  selectedEan?: string | null;
  suggestedEans?: string[];
  externalProductProvider?: string | null;
  externalProductStatus?: InvoiceExternalProductStatus | null;
  externalProductData?: InvoiceExternalProductData | null;
  externalProductError?: string | null;
}

export interface AnalyzedInvoice {
  provider: string;
  confidence: number;
  merchantName?: string | null;
  totalAmount?: number | null;
  purchaseDate?: Date | null;
  invoiceNumber?: string | null;
  orderNumber?: string | null;
  rawData: Prisma.InputJsonValue;
  items: AnalyzedInvoiceItem[];
}

export interface InvoiceAnalysisProvider {
  readonly providerName: string;
  analyzePdf(pdfUrl: string, pdfBuffer?: Buffer): Promise<AnalyzedInvoice>;
}
