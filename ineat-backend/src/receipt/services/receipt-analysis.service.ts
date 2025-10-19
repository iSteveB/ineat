/**
 * Service d'analyse de tickets
 * 
 * Service responsable de l'analyse et du parsing des données OCR brutes
 * pour extraire les informations structurées des tickets de caisse
 * 
 * @module receipt/services/receipt-analysis.service
 */

import { Injectable, Logger } from '@nestjs/common';
import { 
  OcrReceiptData, 
  OcrLineItem 
} from '../interfaces/ocr-provider.interface';

/**
 * Résultat d'analyse enrichi avec des métadonnées
 */
export interface AnalysisResult {
  /** Données structurées du ticket */
  receiptData: OcrReceiptData;
  
  /** Métadonnées d'analyse */
  metadata: {
    /** Nombre total d'items détectés */
    itemCount: number;
    
    /** Score de confiance global */
    overallConfidence: number;
    
    /** Items avec faible confiance (< 0.7) */
    lowConfidenceItems: OcrLineItem[];
    
    /** Items avec prix incohérents */
    suspiciousItems: OcrLineItem[];
    
    /** Format de ticket détecté */
    receiptFormat: 'SUPERMARKET' | 'GROCERY' | 'RESTAURANT' | 'UNKNOWN';
    
    /** Cohérence des données (0-1) */
    dataConsistency: number;
  };
}

/**
 * Pattern de regex pour différents formats de tickets
 */
interface ReceiptPatterns {
  /** Patterns de magasins */
  merchants: {
    supermarkets: RegExp[];
    groceries: RegExp[];
    restaurants: RegExp[];
  };
  
  /** Patterns de produits */
  products: {
    /** Détection de quantité dans le nom */
    quantityInName: RegExp;
    
    /** Détection d'unité de mesure */
    unitMeasure: RegExp;
    
    /** Détection de code produit */
    productCode: RegExp;
  };
  
  /** Patterns de prix */
  prices: {
    /** Prix en euros */
    euroPrice: RegExp;
    
    /** Remise/réduction */
    discount: RegExp;
  };
}

/**
 * Service d'analyse de tickets
 * 
 * Ce service analyse les données OCR brutes pour :
 * - Détecter le format du ticket (supermarché, épicerie, restaurant)
 * - Valider la cohérence des données
 * - Identifier les items suspects ou avec faible confiance
 * - Extraire des métadonnées d'analyse
 * - Nettoyer et normaliser les données
 * 
 * @example
 * ```typescript
 * const result = await analysisService.analyzeReceipt(ocrData);
 * 
 * if (result.metadata.overallConfidence > 0.8) {
 *   console.log('Analyse de haute qualité');
 * }
 * 
 * // Vérifier les items suspects
 * for (const item of result.metadata.suspiciousItems) {
 *   console.log(`Item suspect: ${item.description}`);
 * }
 * ```
 */
@Injectable()
export class ReceiptAnalysisService {
  private readonly logger = new Logger(ReceiptAnalysisService.name);
  
  /** Patterns de reconnaissance de tickets */
  private readonly patterns: ReceiptPatterns = {
    merchants: {
      supermarkets: [
        /carrefour/i,
        /leclerc/i,
        /auchan/i,
        /intermarché/i,
        /super\s*u/i,
        /casino/i,
        /monoprix/i,
        /franprix/i,
        /système\s*u/i,
      ],
      groceries: [
        /épicerie/i,
        /alimentation/i,
        /primeur/i,
        /bio\s*c/i,
        /naturalia/i,
      ],
      restaurants: [
        /restaurant/i,
        /brasserie/i,
        /café/i,
        /bistrot/i,
        /mcdonald/i,
        /kfc/i,
        /burger\s*king/i,
      ],
    },
    products: {
      quantityInName: /(\d+(?:[.,]\d+)?)\s*x\s*/i,
      unitMeasure: /(kg|g|l|ml|cl|pièces?|pc|unité?s?|u)\s*$/i,
      productCode: /^\d{8,13}$/,
    },
    prices: {
      euroPrice: /(\d+(?:[.,]\d{2})?)\s*€?/,
      discount: /-(\d+(?:[.,]\d{2})?)\s*€?/,
    },
  };

  /**
   * Analyser un ticket de caisse complet
   * 
   * @param ocrData - Données OCR brutes
   * @returns Résultat d'analyse enrichi
   */
  async analyzeReceipt(ocrData: OcrReceiptData): Promise<AnalysisResult> {
    this.logger.log('Début d\'analyse du ticket');
    
    try {
      // 1. Nettoyer et normaliser les données
      const cleanedData = this.cleanReceiptData(ocrData);
      
      // 2. Détecter le format du ticket
      const receiptFormat = this.detectReceiptFormat(cleanedData);
      
      // 3. Analyser les items individuels
      const analyzedItems = await this.analyzeLineItems(cleanedData.lineItems);
      
      // 4. Valider la cohérence globale
      const consistency = this.validateDataConsistency(cleanedData);
      
      // 5. Identifier les items suspects
      const suspiciousItems = this.identifySuspiciousItems(analyzedItems);
      
      // 6. Calculer les métadonnées
      const metadata = this.calculateMetadata(
        analyzedItems,
        suspiciousItems,
        receiptFormat,
        consistency
      );
      
      // 7. Créer le résultat final
      const result: AnalysisResult = {
        receiptData: {
          ...cleanedData,
          lineItems: analyzedItems,
        },
        metadata,
      };
      
      this.logger.log(
        `Analyse terminée: ${analyzedItems.length} items, confiance: ${metadata.overallConfidence.toFixed(2)}`
      );
      
      return result;
    } catch (error) {
      this.logger.error(`Erreur d'analyse: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Nettoyer et normaliser les données OCR
   */
  private cleanReceiptData(data: OcrReceiptData): OcrReceiptData {
    return {
      ...data,
      merchantName: this.cleanMerchantName(data.merchantName),
      merchantAddress: this.cleanAddress(data.merchantAddress),
      totalAmount: this.normalizeAmount(data.totalAmount),
      taxAmount: this.normalizeAmount(data.taxAmount),
      lineItems: data.lineItems.map(item => this.cleanLineItem(item)),
    };
  }

  /**
   * Nettoyer le nom du magasin
   */
  private cleanMerchantName(name: string | null): string | null {
    if (!name) return null;
    
    return name
      .trim()
      .replace(/\s+/g, ' ') // Normaliser les espaces
      .replace(/[^\w\s\-]/g, '') // Supprimer caractères spéciaux
      .toLowerCase();
  }

  /**
   * Nettoyer l'adresse
   */
  private cleanAddress(address: string | null): string | null {
    if (!address) return null;
    
    return address
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n/g, ', '); // Remplacer sauts de ligne par virgules
  }

  /**
   * Normaliser un montant
   */
  private normalizeAmount(amount: number | null): number | null {
    if (!amount || isNaN(amount)) return null;
    
    // Arrondir à 2 décimales
    return Math.round(amount * 100) / 100;
  }

  /**
   * Nettoyer un item de ligne
   */
  private cleanLineItem(item: OcrLineItem): OcrLineItem {
    return {
      ...item,
      description: this.cleanProductDescription(item.description),
      quantity: this.normalizeQuantity(item.quantity),
      unitPrice: this.normalizeAmount(item.unitPrice),
      totalPrice: this.normalizeAmount(item.totalPrice),
      confidence: Math.max(0, Math.min(1, item.confidence || 0)),
    };
  }

  /**
   * Nettoyer la description d'un produit
   */
  private cleanProductDescription(description: string): string {
    return description
      .trim()
      .replace(/\s+/g, ' ') // Normaliser espaces
      .replace(/[^\w\s\-\(\)]/g, '') // Garder caractères alphanumériques et quelques spéciaux
      .toLowerCase();
  }

  /**
   * Normaliser une quantité
   */
  private normalizeQuantity(quantity: number | null): number | null {
    if (!quantity || isNaN(quantity) || quantity <= 0) return null;
    
    // Si quantité très élevée, probablement une erreur
    if (quantity > 1000) return null;
    
    return Math.round(quantity * 100) / 100;
  }

  /**
   * Détecter le format du ticket
   */
  private detectReceiptFormat(data: OcrReceiptData): AnalysisResult['metadata']['receiptFormat'] {
    const merchantName = data.merchantName?.toLowerCase() || '';
    
    // Vérifier supermarchés
    for (const pattern of this.patterns.merchants.supermarkets) {
      if (pattern.test(merchantName)) {
        return 'SUPERMARKET';
      }
    }
    
    // Vérifier épiceries
    for (const pattern of this.patterns.merchants.groceries) {
      if (pattern.test(merchantName)) {
        return 'GROCERY';
      }
    }
    
    // Vérifier restaurants
    for (const pattern of this.patterns.merchants.restaurants) {
      if (pattern.test(merchantName)) {
        return 'RESTAURANT';
      }
    }
    
    return 'UNKNOWN';
  }

  /**
   * Analyser les items de ligne individuellement
   */
  private async analyzeLineItems(items: OcrLineItem[]): Promise<OcrLineItem[]> {
    return items.map(item => {
      // Extraire quantité du nom si présente
      const quantityFromName = this.extractQuantityFromDescription(item.description);
      
      // Utiliser la quantité extraite si pas déjà définie
      const finalQuantity = item.quantity || quantityFromName || 1;
      
      return {
        ...item,
        quantity: finalQuantity,
        // Recalculer le prix unitaire si possible
        unitPrice: this.calculateUnitPrice(item.totalPrice, finalQuantity) || item.unitPrice,
      };
    });
  }

  /**
   * Extraire la quantité de la description
   */
  private extractQuantityFromDescription(description: string): number | null {
    const match = description.match(this.patterns.products.quantityInName);
    if (match) {
      const quantity = parseFloat(match[1].replace(',', '.'));
      return isNaN(quantity) ? null : quantity;
    }
    return null;
  }

  /**
   * Calculer le prix unitaire
   */
  private calculateUnitPrice(totalPrice: number | null, quantity: number | null): number | null {
    if (!totalPrice || !quantity || quantity === 0) return null;
    
    return Math.round((totalPrice / quantity) * 100) / 100;
  }

  /**
   * Valider la cohérence des données
   */
  private validateDataConsistency(data: OcrReceiptData): number {
    let consistencyScore = 1.0;
    let checks = 0;
    
    // Vérifier cohérence total vs somme des items
    const itemsTotal = data.lineItems.reduce((sum, item) => 
      sum + (item.totalPrice || 0), 0
    );
    
    if (data.totalAmount && itemsTotal > 0) {
      const diff = Math.abs(data.totalAmount - itemsTotal);
      const tolerance = data.totalAmount * 0.05; // 5% de tolérance
      
      if (diff > tolerance) {
        consistencyScore -= 0.3;
      }
      checks++;
    }
    
    // Vérifier cohérence prix unitaire vs total
    for (const item of data.lineItems) {
      if (item.unitPrice && item.quantity && item.totalPrice) {
        const expectedTotal = item.unitPrice * item.quantity;
        const diff = Math.abs(expectedTotal - item.totalPrice);
        
        if (diff > 0.1) { // Tolérance de 10 centimes
          consistencyScore -= 0.1;
        }
        checks++;
      }
    }
    
    // Assurer que le score reste entre 0 et 1
    return Math.max(0, Math.min(1, consistencyScore));
  }

  /**
   * Identifier les items suspects
   */
  private identifySuspiciousItems(items: OcrLineItem[]): OcrLineItem[] {
    return items.filter(item => {
      // Item avec très faible confiance
      if (item.confidence < 0.5) return true;
      
      // Prix suspect (trop élevé ou négatif)
      if (item.totalPrice && (item.totalPrice < 0 || item.totalPrice > 1000)) return true;
      
      // Quantité suspecte
      if (item.quantity && (item.quantity < 0 || item.quantity > 100)) return true;
      
      // Description trop courte ou vide
      if (!item.description || item.description.trim().length < 2) return true;
      
      return false;
    });
  }

  /**
   * Calculer les métadonnées d'analyse
   */
  private calculateMetadata(
    items: OcrLineItem[],
    suspiciousItems: OcrLineItem[],
    receiptFormat: AnalysisResult['metadata']['receiptFormat'],
    consistency: number
  ): AnalysisResult['metadata'] {
    const lowConfidenceItems = items.filter(item => item.confidence < 0.7);
    
    // Calculer la confiance globale
    const totalConfidence = items.reduce((sum, item) => sum + item.confidence, 0);
    const overallConfidence = items.length > 0 ? totalConfidence / items.length : 0;
    
    return {
      itemCount: items.length,
      overallConfidence,
      lowConfidenceItems,
      suspiciousItems,
      receiptFormat,
      dataConsistency: consistency,
    };
  }

  /**
   * Obtenir des statistiques d'analyse pour monitoring
   */
  getAnalysisStats(result: AnalysisResult): Record<string, any> {
    return {
      itemCount: result.metadata.itemCount,
      overallConfidence: result.metadata.overallConfidence,
      lowConfidenceCount: result.metadata.lowConfidenceItems.length,
      suspiciousCount: result.metadata.suspiciousItems.length,
      receiptFormat: result.metadata.receiptFormat,
      dataConsistency: result.metadata.dataConsistency,
      totalAmount: result.receiptData.totalAmount,
      merchantName: result.receiptData.merchantName,
    };
  }
}