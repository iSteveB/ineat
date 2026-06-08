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

  async analyzePdf(
    pdfUrl: string,
    pdfBuffer?: Buffer,
  ): Promise<AnalyzedInvoice> {
    const providerName = this.resolveProviderName();
    const provider = this.providers[providerName];

    if (!provider) {
      throw new Error(`Unsupported invoice analysis provider: ${providerName}`);
    }

    return provider.analyzePdf(pdfUrl, pdfBuffer);
  }

  private resolveProviderName(): string {
    const configuredProvider = this.configService.get<string>(
      'INVOICE_ANALYSIS_PROVIDER',
    );

    if (configuredProvider?.trim()) {
      return configuredProvider.trim().toLowerCase();
    }

    return this.configService.get<string>('OPENAI_API_KEY') ? 'openai' : 'mock';
  }
}
