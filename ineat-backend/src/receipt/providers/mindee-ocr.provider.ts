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
 * Utilise ClientV2 avec modelId pour les APIs Mindee :
 * - Receipt OCR : mindee/expense_receipts
 * - Invoice OCR : mindee/invoices
 */
@Injectable()
export class MindeeOcrProvider implements IOcrProvider {
  readonly name = 'mindee';
  private readonly logger = new Logger(MindeeOcrProvider.name);
  private client: mindee.ClientV2;

  // Model IDs (depuis .env ou valeurs par défaut)
  private readonly RECEIPT_MODEL_ID: string;
  private readonly INVOICE_MODEL_ID: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('MINDEE_API_KEY');

    // Récupérer les modelIds depuis .env
    this.RECEIPT_MODEL_ID =
      this.configService.get<string>('MINDEE_RECEIPT_MODEL_ID') ||
      'mindee/expense_receipts';
    this.INVOICE_MODEL_ID =
      this.configService.get<string>('MINDEE_INVOICE_MODEL_ID') ||
      'mindee/invoices';

    if (!apiKey) {
      this.logger.warn('MINDEE_API_KEY non configurée - Provider indisponible');
    } else {
      // Log pour debug (masquer une partie de la clé)
      const maskedKey =
        apiKey.substring(0, 8) + '***' + apiKey.substring(apiKey.length - 4);
      this.logger.log(`Provider Mindee initialisé avec clé: ${maskedKey}`);
      this.logger.log(`Model Receipt: ${this.RECEIPT_MODEL_ID}`);
      this.logger.log(`Model Invoice: ${this.INVOICE_MODEL_ID}`);

      // Utiliser ClientV2 avec modelId
      this.client = new mindee.ClientV2({ apiKey });
      this.logger.log('ClientV2 Mindee créé avec succès');
    }
  }

  /**
   * Vérifier si le provider supporte un type de document
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
    const isAvailable = !!apiKey && !!this.client;

    this.logger.debug(
      `Provider disponible: ${isAvailable} (apiKey: ${!!apiKey}, client: ${!!this.client})`,
    );

    return isAvailable;
  }

  /**
   * Traiter un document (ticket ou facture)
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
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        throw new Error('Provider Mindee non disponible (clé API manquante)');
      }

      // Créer l'input document depuis le buffer
      const fileName = this.getFileName(type);
      this.logger.debug(`Création du document avec nom: ${fileName}`);

      const inputSource = new mindee.BufferInput({
        buffer,
        filename: fileName,
      });
      this.logger.debug("Document créé, appel à l'API Mindee...");

      // Définir le modelId selon le type de document
      const modelId =
        type === DocumentType.RECEIPT_IMAGE
          ? this.RECEIPT_MODEL_ID
          : this.INVOICE_MODEL_ID;

      this.logger.debug(`Utilisation du model: ${modelId}`);

      // Paramètres d'inférence
      const inferenceParams = {
        modelId,
        confidence: true, // Calculer les scores de confiance
        polygon: false, // Pas besoin des bounding boxes
        rawText: false, // Pas besoin du texte brut
      };

      // Envoyer pour traitement
      this.logger.debug('Envoi de la requête à Mindee...');
      const response = await this.client.enqueueAndGetInference(
        inputSource,
        inferenceParams,
      );

      this.logger.log('✓ Réponse API reçue');

      // Les vraies données sont dans rawHttp.inference.result.fields
      const fields = (response as any).rawHttp?.inference?.result?.fields;

      if (!fields) {
        this.logger.error(
          'Structure de réponse inattendue:',
          JSON.stringify(response, null, 2),
        );
        throw new Error('Structure de réponse Mindee invalide');
      }

      this.logger.log(
        `Données extraites: ${fields.line_items?.items?.length || 0} items détectés`,
      );

      // Mapper vers notre format standardisé
      const data = this.mapToStandard(fields, type);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `✓ Traitement réussi en ${processingTime}ms (confiance: ${data.confidence.toFixed(2)})`,
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

      // Log détaillé de l'erreur pour debug
      this.logger.error(
        `❌ Échec du traitement après ${processingTime}ms: ${error.message}`,
      );

      // Log de l'erreur complète pour debug
      if (error.response) {
        this.logger.error("Réponse complète de l'API Mindee:");
        this.logger.error(JSON.stringify(error.response.data, null, 2));

        if (error.response.status) {
          this.logger.error(`Status HTTP: ${error.response.status}`);
        }
      }

      if (error.code) {
        this.logger.error(`Code erreur: ${error.code}`);
      }

      // Log du stack trace
      this.logger.error('Stack trace:', error.stack);

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
  private mapToStandard(fields: any, type: DocumentType): OcrReceiptData {
    this.logger.log('Mapping des données vers format standard...');

    if (type === DocumentType.RECEIPT_IMAGE) {
      return this.mapReceiptToStandard(fields);
    } else {
      return this.mapInvoiceToStandard(fields);
    }
  }

  /**
   * Mapper un ticket de caisse (Receipt API) vers format standard
   * Les données viennent de rawHttp.inference.result.fields
   */
  private mapReceiptToStandard(fields: any): OcrReceiptData {
    const lineItems = fields.line_items?.items || [];

    this.logger.debug(`Mapping Receipt - ${lineItems.length} items détectés`);

    return {
      merchantName: fields.supplier_name?.value || null,
      merchantAddress: this.formatAddress(fields.supplier_address?.value),
      totalAmount: fields.total_amount?.value || null,
      taxAmount: fields.total_tax?.value || null,
      purchaseDate: fields.date?.value ? new Date(fields.date.value) : null,
      currency: fields.locale?.fields?.currency?.value || 'EUR',
      lineItems: this.mapReceiptLineItems(lineItems),
      confidence: this.calculateConfidence(fields),
      rawData: fields,
    };
  }

  /**
   * Mapper une facture drive (Invoice API) vers format standard
   */
  private mapInvoiceToStandard(fields: any): OcrReceiptData {
    const lineItems = fields.line_items?.items || [];

    this.logger.debug(`Mapping Invoice - ${lineItems.length} items détectés`);

    return {
      merchantName: fields.supplier_name?.value || null,
      merchantAddress: this.formatAddress(fields.supplier_address?.value),
      totalAmount: fields.total_amount?.value || null,
      taxAmount: fields.total_tax?.value || null,
      purchaseDate: fields.date?.value ? new Date(fields.date.value) : null,
      currency: fields.locale?.fields?.currency?.value || 'EUR',
      lineItems: this.mapInvoiceLineItems(lineItems),
      confidence: this.calculateConfidence(fields),
      invoiceNumber: fields.invoice_number?.value || null,
      orderNumber: fields.reference_number?.value || null,
      rawData: fields,
    };
  }

  /**
   * Mapper les line items d'un ticket de caisse
   * Structure: items[].fields.{description, quantity, unit_price, total_price}.value
   */
  private mapReceiptLineItems(items: any[]): OcrLineItem[] {
    return items.map((item, index) => {
      const fields = item.fields || {};

      const lineItem: OcrLineItem = {
        description: fields.description?.value || `Article ${index + 1}`,
        quantity: fields.quantity?.value || null,
        unitPrice: fields.unit_price?.value || null,
        totalPrice: fields.total_price?.value || null,
        confidence: this.mapConfidence(item.confidence),
      };

      this.logger.debug(
        `Item ${index + 1}: "${lineItem.description}" x${lineItem.quantity} = ${lineItem.totalPrice}€ (confiance: ${lineItem.confidence.toFixed(2)})`,
      );

      return lineItem;
    });
  }

  /**
   * Mapper la confiance Mindee (string) vers un nombre (0-1)
   */
  private mapConfidence(confidence: string | number | undefined): number {
    if (typeof confidence === 'number') return confidence;

    const confidenceMap: Record<string, number> = {
      Certain: 0.95,
      High: 0.85,
      Medium: 0.7,
      Low: 0.5,
    };

    return confidenceMap[confidence as string] || 0.5;
  }

  /**
   * Calculer la confiance moyenne des champs
   */
  private calculateConfidence(fields: any): number {
    const confidences: number[] = [];

    // Parcourir les champs principaux
    for (const key of Object.keys(fields)) {
      const field = fields[key];
      if (field?.confidence) {
        confidences.push(this.mapConfidence(field.confidence));
      }
    }

    if (confidences.length === 0) return 0.5;

    const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    return Math.round(avg * 100) / 100;
  }

  /**
   * Mapper les line items d'une facture drive
   */
  private mapInvoiceLineItems(items: any[]): OcrLineItem[] {
    return items.map((item, index) => {
      const fields = item.fields || {};

      const lineItem: OcrLineItem = {
        description: fields.description?.value || `Article ${index + 1}`,
        quantity: fields.quantity?.value || null,
        unitPrice: fields.unit_price?.value || null,
        totalPrice:
          fields.total_price?.value || fields.total_amount?.value || null,
        confidence: this.mapConfidence(item.confidence),
        productCode: fields.product_code?.value || null,
        discount: fields.discount?.value || null,
      };

      this.logger.debug(
        `Item ${index + 1}: "${lineItem.description}"${lineItem.productCode ? ` (EAN: ${lineItem.productCode})` : ''} x${lineItem.quantity} = ${lineItem.totalPrice}€ (confiance: ${lineItem.confidence.toFixed(2)})`,
      );

      return lineItem;
    });
  }

  /**
   * Formater une adresse
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
    if (error.response?.status === 401 || error.response?.status === 403) {
      return "Clé API Mindee invalide ou accès refusé. Vérifiez que votre clé a accès à l'API Receipt V5.";
    }

    // Erreur générique
    return error.message || 'Erreur inconnue lors du traitement OCR';
  }
}
