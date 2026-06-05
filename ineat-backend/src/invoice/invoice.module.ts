import { Module } from '@nestjs/common';
import { InvoiceController } from './controllers/invoice.controller';
import { InvoiceAnalysisService } from './services/invoice-analysis.service';
import { InvoiceService } from './services/invoice.service';
import { InvoiceUploadService } from './services/invoice-upload.service';

@Module({
  controllers: [InvoiceController],
  providers: [InvoiceService, InvoiceUploadService, InvoiceAnalysisService],
  exports: [InvoiceService],
})
export class InvoiceModule {}
