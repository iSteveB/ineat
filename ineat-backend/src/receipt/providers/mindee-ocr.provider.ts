/**
 * Provider OCR Mindee
 *
 * Implémentation du provider OCR utilisant l'API Mindee
 * Supporte les tickets de caisse (Receipt OCR) et les factures drive (Invoice OCR)
 *
 * @module receipt/providers/mindee-ocr.provider
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mindee from 'mindee';
import {
  IOcrProvider,
  DocumentType,
  OcrProcessingResult,
  OcrReceiptData,
  OcrLineItem,
} from '../interfaces/ocr-provider.interface';

/**
 * Provider OCR utilisant l'API Mindee
 *
 * Mindee offre deux APIs distinctes :
 * - Receipt OCR V5 : Pour les tickets de caisse photographiés
 * - Invoice OCR V4 : Pour les factures structurées (PDF/HTML)
 *
 * @example
 * ```typescript
 * const provider = new MindeeOcrProvider(configService);
 * const result = await provider.processDocument(
 *   imageBuffer,
 *   DocumentType.RECEIPT_IMAGE
 * );
 * ```
 */
@Injectable()
export class MindeeOcrProvider implements IOcrProvider {
  readonly name = 'mindee';
  private readonly logger = new Logger(MindeeOcrProvider.name);
  private client: mindee.Client;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MINDEE_API_KEY');

    if (!apiKey) {
      this.logger.warn('MINDEE_API_KEY non configurée - Provider indisponible');
    } else {
      this.client = new mindee.Client({ apiKey });
      this.logger.log('Provider Mindee initialisé avec succès');
    }
  }

  /**
   * Vérifier si le provider supporte un type de document
   * Mindee supporte tous les types (RECEIPT_IMAGE, INVOICE_PDF, INVOICE_HTML)
   */
  supportsDocumentType(type: DocumentType): boolean {
    return [
      DocumentType.RECEIPT_IMAGE,
      DocumentType.INVOICE_PDF,
      DocumentType.INVOICE_HTML,
    ].includes(type);
  }

  /**
   * Vérifier si le provider est disponible et configuré
   */
  async isAvailable(): Promise<boolean> {
    const apiKey = this.configService.get<string>('MINDEE_API_KEY');
    return !!apiKey && !!this.client;
  }

  /**
   * Traiter un document (ticket ou facture)
   *
   * @param buffer - Buffer du fichier
   * @param type - Type de document
   * @returns Résultat du traitement avec données extraites
   *
   * @throws Error si le type n'est pas supporté
   * @throws Error si l'API Mindee retourne une erreur
   */
  async processDocument(
    buffer: Buffer,
    type: DocumentType,
  ): Promise<OcrProcessingResult> {
    const startTime = Date.now();

    this.logger.log(
      `Début du traitement ${type} avec Mindee (taille: ${buffer.length} bytes)`,
    );

    try {
      // Vérifier le support du type
      if (!this.supportsDocumentType(type)) {
        throw new Error(`Type de document non supporté: ${type}`);
      }

      // Vérifier la disponibilité
      if (!(await this.isAvailable())) {
        throw new Error('Provider Mindee non disponible (clé API manquante)');
      }

      // Créer l'input document depuis le buffer
      // docFromBuffer accepte (buffer, filename)
      const inputDoc = this.client.docFromBuffer(
        buffer,
        this.getFileName(type),
      );

      // Router vers la bonne API selon le type
      let apiResponse: mindee.PredictResponse<mindee.product.ReceiptV5> | mindee.PredictResponse<mindee.product.InvoiceV4>;
      if (type === DocumentType.RECEIPT_IMAGE) {
        // API Receipt pour tickets photo
        // ReceiptV5 = endpoint mindee/expense_receipts v5 (API standard)
        this.logger.debug(
          'Utilisation de Receipt OCR API (expense_receipts v5)',
        );
        apiResponse = await this.client.parse(
          mindee.product.ReceiptV5,
          inputDoc,
        );
      } else {
        // API Invoice pour factures drive (PDF/HTML)
        // InvoiceV4 = endpoint mindee/invoices v4 (API standard)
        this.logger.debug('Utilisation de Invoice OCR API (invoices v4)');
        apiResponse = await this.client.parse(
          mindee.product.InvoiceV4,
          inputDoc,
        );
      }

      // Extraire les données de la réponse
      const prediction = apiResponse.document.inference.prediction;

      // Mapper vers notre format standardisé
      const data = this.mapToStandard(prediction, type);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Traitement réussi en ${processingTime}ms (confiance: ${data.confidence.toFixed(2)})`,
      );

      return {
        success: true,
        data,
        processingTime,
        provider: this.name,
        documentType: type,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Échec du traitement après ${processingTime}ms: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        error: this.formatError(error),
        processingTime,
        provider: this.name,
        documentType: type,
      };
    }
  }

  /**
   * Obtenir le nom de fichier selon le type (pour Mindee)
   */
  private getFileName(type: DocumentType): string {
    switch (type) {
      case DocumentType.RECEIPT_IMAGE:
        return 'receipt.jpg';
      case DocumentType.INVOICE_PDF:
        return 'invoice.pdf';
      case DocumentType.INVOICE_HTML:
        return 'invoice.html';
      default:
        return 'document';
    }
  }

  /**
   * Mapper les données Mindee vers notre format standard
   */
  private mapToStandard(prediction: any, type: DocumentType): OcrReceiptData {
    if (type === DocumentType.RECEIPT_IMAGE) {
      return this.mapReceiptToStandard(prediction);
    } else {
      return this.mapInvoiceToStandard(prediction);
    }
  }

  /**
   * Mapper un ticket de caisse (Receipt API) vers format standard
   */
  private mapReceiptToStandard(receipt: any): OcrReceiptData {
    this.logger.debug(
      `Mapping Receipt - ${receipt.lineItems?.length || 0} items détectés`,
    );

    return {
      merchantName: receipt.supplierName?.value || null,
      merchantAddress: this.formatAddress(receipt.supplierAddress?.value),
      totalAmount: receipt.totalAmount?.value || null,
      taxAmount: receipt.totalTax?.value || null,
      purchaseDate: receipt.date?.value ? new Date(receipt.date.value) : null,
      currency: receipt.locale?.currency || 'EUR',
      lineItems: this.mapReceiptLineItems(receipt.lineItems || []),
      confidence: receipt.confidence || 0,
      rawData: receipt, // Conserver les données brutes
    };
  }

  /**
   * Mapper une facture drive (Invoice API) vers format standard
   */
  private mapInvoiceToStandard(invoice: any): OcrReceiptData {
    this.logger.debug(
      `Mapping Invoice - ${invoice.lineItems?.length || 0} items détectés`,
    );

    return {
      merchantName: invoice.supplierName?.value || null,
      merchantAddress: this.formatAddress(invoice.supplierAddress?.value),
      totalAmount: invoice.totalAmount?.value || null,
      taxAmount: invoice.totalTax?.value || null,
      purchaseDate: invoice.date?.value ? new Date(invoice.date.value) : null,
      currency: invoice.locale?.currency || 'EUR',
      lineItems: this.mapInvoiceLineItems(invoice.lineItems || []),
      confidence: invoice.confidence || 0.95, // Factures généralement plus fiables
      invoiceNumber: invoice.invoiceNumber?.value || null,
      orderNumber: invoice.referenceNumber?.value || null, // Mapping du numéro de référence
      rawData: invoice,
    };
  }

  /**
   * Mapper les line items d'un ticket de caisse
   */
  private mapReceiptLineItems(items: any[]): OcrLineItem[] {
    return items.map((item, index) => {
      const lineItem: OcrLineItem = {
        description: item.description || `Article ${index + 1}`,
        quantity: item.quantity || null,
        unitPrice: item.unitPrice || null,
        totalPrice: item.totalAmount || null,
        confidence: item.confidence || 0,
      };

      this.logger.debug(
        `Item ${index + 1}: "${lineItem.description}" (confiance: ${lineItem.confidence.toFixed(2)})`,
      );

      return lineItem;
    });
  }

  /**
   * Mapper les line items d'une facture drive
   * Les factures drive ont généralement plus d'informations
   */
  private mapInvoiceLineItems(items: any[]): OcrLineItem[] {
    return items.map((item, index) => {
      const lineItem: OcrLineItem = {
        description: item.description || `Article ${index + 1}`,
        quantity: item.quantity || null,
        unitPrice: item.unitPrice || null,
        totalPrice: item.totalAmount || null,
        confidence: item.confidence || 0.99, // Factures très fiables
        // Champs bonus des factures drive
        productCode: item.productCode || null, // EAN/code-barres
        discount: item.discount || null,
      };

      this.logger.debug(
        `Item ${index + 1}: "${lineItem.description}"${lineItem.productCode ? ` (EAN: ${lineItem.productCode})` : ''} (confiance: ${lineItem.confidence.toFixed(2)})`,
      );

      return lineItem;
    });
  }

  /**
   * Formater une adresse (nettoyer les retours à la ligne, etc.)
   */
  private formatAddress(address: string | null): string | null {
    if (!address) return null;
    return address.replace(/\n/g, ', ').trim();
  }

  /**
   * Formater un message d'erreur de manière compréhensible
   */
  private formatError(error: any): string {
    // Erreurs API Mindee
    if (error.response?.data?.api_request?.error) {
      const apiError = error.response.data.api_request.error;
      return `Erreur API Mindee: ${apiError.message || apiError}`;
    }

    // Erreurs réseau
    if (error.code === 'ECONNREFUSED') {
      return "Impossible de contacter l'API Mindee";
    }

    if (error.code === 'ETIMEDOUT') {
      return "Timeout lors de la requête à l'API Mindee";
    }

    // Erreurs de quota
    if (error.response?.status === 429) {
      return 'Quota API Mindee dépassé';
    }

    // Erreurs d'authentification
    if (error.response?.status === 401) {
      return 'Clé API Mindee invalide';
    }

    // Erreur générique
    return error.message || 'Erreur inconnue lors du traitement OCR';
  }
}
