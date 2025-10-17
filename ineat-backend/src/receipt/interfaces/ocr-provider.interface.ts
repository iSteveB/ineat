/**
 * Interface et types pour les providers OCR
 * 
 * Ce fichier définit le contrat que tous les providers OCR doivent respecter,
 * permettant l'interchangeabilité (Mindee, Google Vision, Tesseract, etc.)
 * 
 * @module receipt/interfaces/ocr-provider.interface
 */

/**
 * Types de documents supportés
 */
export enum DocumentType {
  /** Ticket de caisse photographié */
  RECEIPT_IMAGE = 'receipt_image',
  /** Facture drive au format PDF */
  INVOICE_PDF = 'invoice_pdf',
  /** Facture drive au format HTML */
  INVOICE_HTML = 'invoice_html',
}

/**
 * Item/ligne de produit extrait d'un document
 */
export interface OcrLineItem {
  /** Description du produit */
  description: string;
  
  /** Quantité (null si non détectable) */
  quantity: number | null;
  
  /** Prix unitaire (null si non détectable) */
  unitPrice: number | null;
  
  /** Prix total de la ligne (null si non détectable) */
  totalPrice: number | null;
  
  /** Score de confiance de l'extraction (0-1) */
  confidence: number;
  
  /** Code produit (EAN/code-barres) - Très fiable sur factures drive */
  productCode?: string | null;
  
  /** Catégorie suggérée par le magasin (factures drive uniquement) */
  category?: string | null;
  
  /** Réduction appliquée sur cette ligne (factures drive uniquement) */
  discount?: number | null;
}

/**
 * Données structurées extraites d'un document (ticket ou facture)
 * Format standardisé pour tous les providers
 */
export interface OcrReceiptData {
  /** Nom du magasin/commerce */
  merchantName: string | null;
  
  /** Adresse du magasin */
  merchantAddress: string | null;
  
  /** Montant total TTC */
  totalAmount: number | null;
  
  /** Montant total des taxes */
  taxAmount: number | null;
  
  /** Date de l'achat */
  purchaseDate: Date | null;
  
  /** Devise (EUR, USD, etc.) */
  currency: string | null;
  
  /** Liste des articles/produits */
  lineItems: OcrLineItem[];
  
  /** Score de confiance global (0-1) */
  confidence: number;
  
  /** Numéro de facture (factures drive uniquement) */
  invoiceNumber?: string | null;
  
  /** Numéro de commande (factures drive uniquement) */
  orderNumber?: string | null;
  
  /** Données brutes du provider (pour debugging/référence) */
  rawData?: any;
}

/**
 * Résultat du traitement OCR
 */
export interface OcrProcessingResult {
  /** Indique si le traitement a réussi */
  success: boolean;
  
  /** Données extraites (si succès) */
  data?: OcrReceiptData;
  
  /** Message d'erreur (si échec) */
  error?: string;
  
  /** Temps de traitement en millisecondes */
  processingTime: number;
  
  /** Nom du provider utilisé */
  provider: string;
  
  /** Type de document traité */
  documentType: DocumentType;
}

/**
 * Interface que tous les providers OCR doivent implémenter
 * 
 * Cette interface garantit l'interchangeabilité des providers.
 * Chaque provider (Mindee, Google Vision, Tesseract) implémente cette interface.
 * 
 * @example
 * ```typescript
 * class MindeeOcrProvider implements IOcrProvider {
 *   readonly name = 'mindee';
 *   
 *   async processDocument(buffer: Buffer, type: DocumentType) {
 *     // Implémentation spécifique Mindee
 *   }
 *   
 *   supportsDocumentType(type: DocumentType): boolean {
 *     return true; // Mindee supporte tous les types
 *   }
 *   
 *   async isAvailable(): Promise<boolean> {
 *     return !!this.apiKey;
 *   }
 * }
 * ```
 */
export interface IOcrProvider {
  /**
   * Nom du provider (utilisé pour identification et logs)
   * Exemples: 'mindee', 'google-vision', 'tesseract'
   */
  readonly name: string;

  /**
   * Traiter un document (ticket ou facture)
   * 
   * @param buffer - Buffer du fichier (image, PDF, HTML)
   * @param type - Type de document à traiter
   * @returns Résultat du traitement avec données extraites
   * 
   * @throws Error si le type de document n'est pas supporté
   * @throws Error si le traitement échoue
   */
  processDocument(
    buffer: Buffer,
    type: DocumentType,
  ): Promise<OcrProcessingResult>;

  /**
   * Vérifier si le provider supporte un type de document spécifique
   * 
   * @param type - Type de document à vérifier
   * @returns true si le provider peut traiter ce type
   * 
   * @example
   * ```typescript
   * if (provider.supportsDocumentType(DocumentType.INVOICE_PDF)) {
   *   await provider.processDocument(buffer, DocumentType.INVOICE_PDF);
   * }
   * ```
   */
  supportsDocumentType(type: DocumentType): boolean;

  /**
   * Vérifier si le provider est disponible et configuré
   * 
   * Cette méthode vérifie généralement :
   * - Présence de la clé API
   * - Disponibilité du service
   * - Configuration correcte
   * 
   * @returns true si le provider peut être utilisé
   * 
   * @example
   * ```typescript
   * if (await provider.isAvailable()) {
   *   const result = await provider.processDocument(buffer, type);
   * } else {
   *   throw new Error('Provider non disponible');
   * }
   * ```
   */
  isAvailable(): Promise<boolean>;
}