import { Prisma } from '../../../../prisma/generated/prisma/client';

export interface AnalyzedInvoiceItem {
  detectedName: string;
  quantity: number;
  unitPrice?: number | null;
  totalPrice?: number | null;
  confidence: number;
  productCode?: string | null;
  category?: string | null;
  discount?: number | null;
  selectedEan?: string | null;
  suggestedEans?: string[];
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
  analyzePdf(pdfUrl: string): Promise<AnalyzedInvoice>;
}
