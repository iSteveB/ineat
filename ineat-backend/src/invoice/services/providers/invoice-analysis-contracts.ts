import { Prisma } from '../../../../prisma/generated/prisma/client';
import type { AnalyzedInvoice } from './invoice-analysis-provider';

export interface InvoiceAnalysisVersions {
  pipeline: string;
  model: string;
  prompt: string;
  schema: string;
  normalizer: string;
}

export interface InvoiceDocumentPage {
  pageNumber: number;
  confidence: number;
  text?: string | null;
}

export interface InvoiceDocumentExtraction<TPayload = Prisma.InputJsonValue> {
  provider: string;
  confidence: number;
  pages: InvoiceDocumentPage[];
  payload: TPayload;
  versions: InvoiceAnalysisVersions;
}

export interface InvoiceDocumentExtractor<TPayload = Prisma.InputJsonValue> {
  extractDocument(
    pdfUrl: string,
    pdfBuffer?: Buffer,
  ): Promise<InvoiceDocumentExtraction<TPayload>>;
}

export interface InvoiceInterpreter<TPayload = Prisma.InputJsonValue> {
  interpretDocument(
    extraction: InvoiceDocumentExtraction<TPayload>,
    pdfUrl: string,
  ): Promise<AnalyzedInvoice> | AnalyzedInvoice;
}
