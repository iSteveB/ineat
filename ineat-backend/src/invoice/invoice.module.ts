import { Module } from '@nestjs/common';
import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceAnalysisService } from './services/invoice-analysis.service';
import { InvoiceService } from './services/invoice.service';
import { InvoiceUploadService } from './services/invoice-upload.service';
import { MockInvoiceAnalysisProvider } from './services/providers/mock-invoice-analysis.provider';
import { OpenAIInvoiceAnalysisProvider } from './services/providers/openai-invoice-analysis.provider';

@Module({
  controllers: [InvoiceController],
  providers: [
    InvoiceService,
    InvoiceUploadService,
    InvoiceAnalysisService,
    MockInvoiceAnalysisProvider,
    OpenAIInvoiceAnalysisProvider,
  ],
  exports: [InvoiceService],
})
export class InvoiceModule {}
