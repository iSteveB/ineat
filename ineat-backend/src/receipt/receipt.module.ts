/**
 * Module Receipt
 *
 * Module NestJS pour la gestion des tickets de caisse et factures drive
 * Inclut le traitement OCR, la validation et l'ajout à l'inventaire
 *
 * @module receipt/receipt.module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

// Services
import { ReceiptService } from './services/receipt.service';
import { OcrService } from './services/ocr.service';
import { CloudinaryStorageService } from './services/cloudinary-storage.service';

// Providers OCR
import { MindeeOcrProvider } from './providers/mindee-ocr.provider';

// Controllers
import { ReceiptController } from './controllers/receipt.controller';

/**
 * Module Receipt
 *
 * Ce module gère tout le workflow des tickets de caisse et factures drive :
 * 1. Upload de documents (photo ticket ou PDF facture) via CloudinaryStorageService
 * 2. Traitement OCR avec Mindee (ou autres providers) via OcrService
 * 3. Extraction et structuration des données via ReceiptService
 * 4. Validation par l'utilisateur via API REST
 * 5. Ajout à l'inventaire (intégration future)
 *
 * Fonctionnalités premium protégées par @RequiresPremium()
 *
 * Dépendances externes :
 * - Cloudinary : stockage des images/PDF
 * - Mindee : traitement OCR
 * - Prisma : persistance des données
 */
@Module({
  imports: [
    ConfigModule, // Pour accéder aux variables d'environnement
    PrismaModule, // Pour accéder à la base de données
  ],
  controllers: [
    ReceiptController, // Controller gérant les requêtes HTTP pour les receipts
  ],
  providers: [
    // Services principaux
    ReceiptService, // Service principal orchestrant le workflow
    OcrService, // Service OCR gérant les providers
    CloudinaryStorageService, // Service de stockage des fichiers

    // Providers OCR
    MindeeOcrProvider, // Provider OCR Mindee
    // Ajouter ici les futurs providers :
    // GoogleVisionOcrProvider,
    // TesseractOcrProvider,
  ],
  exports: [
    // Exporter les services pour utilisation dans d'autres modules
    ReceiptService, // Pour intégration avec InventoryModule
    OcrService, // Pour utilisation dans d'autres contextes OCR
  ],
})
export class ReceiptModule {}
