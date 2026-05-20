import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { ReceiptService } from './services/receipt.service';
import { OcrService } from './services/ocr.service';
import { CloudinaryStorageService } from './services/cloudinary-storage.service';
import { ReceiptAnalysisService } from './services/receipt-analysis.service';
import { ReceiptToInventoryService } from './services/receipt-to-inventory.service';

// Providers OCR
import { MindeeOcrProvider } from './providers/mindee-ocr.provider';
import { TesseractOcrProvider } from './providers/tesseract-ocr.provider';
import { ReceiptController } from './controllers/receipt.controller';
import { ReceiptStatusController } from './controllers/receipt-status.controller';
import { ReceiptResultsController } from './controllers/receipt-results.controller';
import { ReceiptValidationController } from './controllers/receipt-validation.controller';
import { ReceiptInventoryController } from './controllers/receipt-inventory.controller';
import { ReceiptHistoryController } from './controllers/receipt-history.controller';

// Modules partagés
import { PrismaModule } from '../prisma/prisma.module';
import { LlmService } from './services/llm.service';
import { ClaudeService } from './services/claude.service';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [
    ReceiptController,
    ReceiptStatusController,
    ReceiptResultsController,
    ReceiptValidationController,
    ReceiptInventoryController,
    ReceiptHistoryController,
  ],
  providers: [
    // Services
    LlmService,
    ClaudeService,
    ReceiptService,
    OcrService,
    CloudinaryStorageService,
    ReceiptAnalysisService,
    ReceiptToInventoryService,

    // OCR Providers
    MindeeOcrProvider,
    TesseractOcrProvider,
  ],
  exports: [ReceiptService, OcrService, CloudinaryStorageService],
})
export class ReceiptModule {}
