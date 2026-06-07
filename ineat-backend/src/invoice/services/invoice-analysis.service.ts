import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnalyzedInvoice,
  InvoiceAnalysisProvider,
} from './providers/invoice-analysis-provider';
import { MockInvoiceAnalysisProvider } from './providers/mock-invoice-analysis.provider';
import { OpenAIInvoiceAnalysisProvider } from './providers/openai-invoice-analysis.provider';

export {
  AnalyzedInvoice,
  AnalyzedInvoiceItem,
} from './providers/invoice-analysis-provider';

@Injectable()
export class InvoiceAnalysisService {
  private readonly providers: Record<string, InvoiceAnalysisProvider>;

  constructor(
    private readonly configService: ConfigService,
    mockProvider: MockInvoiceAnalysisProvider,
    openAIProvider: OpenAIInvoiceAnalysisProvider,
  ) {
    this.providers = {
      [mockProvider.providerName]: mockProvider,
      [openAIProvider.providerName]: openAIProvider,
    };
  }

  async analyzePdf(pdfUrl: string): Promise<AnalyzedInvoice> {
    const providerName = (
      this.configService.get<string>('INVOICE_ANALYSIS_PROVIDER') ?? 'mock'
    ).toLowerCase();
    const provider = this.providers[providerName];

    if (!provider) {
      throw new Error(`Unsupported invoice analysis provider: ${providerName}`);
    }

    return provider.analyzePdf(pdfUrl);
  }
}
