import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

// Services
import { ReceiptService } from './services/receipt.service';
import { OcrService } from './services/ocr.service';
import { CloudinaryStorageService } from './services/cloudinary-storage.service';
import { ReceiptAnalysisService } from './services/receipt-analysis.service';
import { ReceiptToInventoryService } from './services/receipt-to-inventory.service';
import { ReceiptProcessingQueue } from './queues/receipt-processing.queue';
import { ReceiptProcessor } from './processors/receipt.processor';

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
import { NotificationModule } from '../notification/notification.module';
import { LlmService } from './services/llm.service';
import { ClaudeService } from './services/claude.service';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    NotificationModule,
    BullModule.registerQueue({
      name: 'receipt-processing',
    }),
  ],
  controllers: [
    ReceiptHistoryController,
    ReceiptStatusController,
    ReceiptResultsController,
    ReceiptValidationController,
    ReceiptInventoryController,
    ReceiptController,
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
    ReceiptProcessingQueue,
    ReceiptProcessor,

    // OCR Providers
    MindeeOcrProvider,
    TesseractOcrProvider,
  ],
  exports: [
    ReceiptService,
    OcrService,
    CloudinaryStorageService,
    ReceiptProcessingQueue,
  ],
})
export class ReceiptModule {}
