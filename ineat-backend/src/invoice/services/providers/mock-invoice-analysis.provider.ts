import { Injectable } from '@nestjs/common';
import {
  AnalyzedInvoice,
  AnalyzedInvoiceItem,
  InvoiceAnalysisProvider,
} from './invoice-analysis-provider';

@Injectable()
export class MockInvoiceAnalysisProvider implements InvoiceAnalysisProvider {
  readonly providerName = 'mock';

  async analyzePdf(pdfUrl: string): Promise<AnalyzedInvoice> {
    const startedAt = new Date('2026-06-05T00:00:00.000Z');
    const items: AnalyzedInvoiceItem[] = [
      {
        detectedName: 'Pommes Golden',
        quantity: 1.5,
        unitPrice: 2.49,
        totalPrice: 3.74,
        confidence: 0.94,
        category: 'fruits-et-legumes',
        suggestedEans: [],
      },
      {
        detectedName: 'Lait demi-écrémé',
        quantity: 6,
        unitPrice: 1.12,
        totalPrice: 6.72,
        confidence: 0.91,
        productCode: '3564700012345',
        category: 'produits-laitiers',
        selectedEan: '3564700012345',
        suggestedEans: ['3564700012345'],
      },
      {
        detectedName: 'Pâtes coquillettes',
        quantity: 2,
        unitPrice: 1.39,
        totalPrice: 2.78,
        confidence: 0.86,
        category: 'epicerie',
        discount: 0.2,
        suggestedEans: [],
      },
    ];

    return {
      provider: this.providerName,
      confidence: 0.9,
      merchantName: 'Drive Démo',
      totalAmount: 13.24,
      purchaseDate: startedAt,
      invoiceNumber: 'INV-MOCK-2026-0001',
      orderNumber: 'DRV-MOCK-0001',
      rawData: JSON.parse(
        JSON.stringify({
          provider: this.providerName,
          pdfUrl,
          extractedAt: startedAt.toISOString(),
          items,
        }),
      ),
      items,
    };
  }
}
