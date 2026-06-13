import { Prisma } from '../../../../prisma/generated/prisma/client';
import {
  AnalyzedInvoice,
  AnalyzedInvoiceItem,
} from './invoice-analysis-provider';

export type OpenAIInvoiceLineType =
  | 'product'
  | 'fee'
  | 'discount'
  | 'total'
  | 'payment'
  | 'unknown';

export interface OpenAIExtractedInvoiceLine {
  rawLabel: string | null;
  detectedName: string | null;
  lineType: OpenAIInvoiceLineType;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  discount: number | null;
  ean: string | null;
  categoryHint: string | null;
  confidence: number;
}

export interface OpenAIExtractedInvoicePayload {
  merchantName: string | null;
  totalAmount: number | null;
  currency: string | null;
  purchaseDate: string | null;
  invoiceNumber: string | null;
  orderNumber: string | null;
  confidence: number;
  lines: OpenAIExtractedInvoiceLine[];
}

export const KNOWN_INVOICE_CATEGORY_SLUGS = [
  'fruits-et-legumes',
  'viandes-et-poissons',
  'produits-laitiers',
  'epicerie-salee',
  'epicerie-sucree',
  'surgeles',
  'boissons',
  'autres',
] as const;

const CATEGORY_ALIASES: Record<string, string> = {
  fruit: 'fruits-et-legumes',
  fruits: 'fruits-et-legumes',
  legumes: 'fruits-et-legumes',
  'fruits legumes': 'fruits-et-legumes',
  'fruits et legumes': 'fruits-et-legumes',
  'fruits-et-legumes': 'fruits-et-legumes',
  viande: 'viandes-et-poissons',
  viandes: 'viandes-et-poissons',
  poisson: 'viandes-et-poissons',
  poissons: 'viandes-et-poissons',
  'viandes poissons': 'viandes-et-poissons',
  'viandes-et-poissons': 'viandes-et-poissons',
  lait: 'produits-laitiers',
  laitage: 'produits-laitiers',
  laitages: 'produits-laitiers',
  'produits laitiers': 'produits-laitiers',
  'produits-laitiers': 'produits-laitiers',
  epicerie: 'epicerie-salee',
  'epicerie salee': 'epicerie-salee',
  'epicerie-salee': 'epicerie-salee',
  'epicerie sucree': 'epicerie-sucree',
  'epicerie-sucree': 'epicerie-sucree',
  sucre: 'epicerie-sucree',
  surgeles: 'surgeles',
  surgele: 'surgeles',
  boissons: 'boissons',
  boisson: 'boissons',
  autres: 'autres',
};

const STORAGE_BY_CATEGORY: Record<string, string | null> = {
  'viandes-et-poissons': 'Réfrigérateur',
  'produits-laitiers': 'Réfrigérateur',
  surgeles: 'Congélateur',
  boissons: 'Placard',
  'epicerie-salee': 'Placard',
  'epicerie-sucree': 'Placard',
  'fruits-et-legumes': null,
  autres: null,
};

const REFRIGERATED_PRODUCE_PATTERNS = [
  /\b(salade|endive|epinard|épinard|champignon|fraise|framboise|myrtille)\b/i,
  /\b(legume|légume|carotte|courgette|poireau|brocoli|chou|tomate)\b/i,
];

const FRUITIER_PRODUCE_PATTERNS = [
  /\b(pomme|pommes|poire|poires|banane|bananes|orange|oranges)\b/i,
  /\b(citron|citrons|mandarine|mandarines|clementine|clementines)\b/i,
  /\b(clémentine|clémentines|avocat|avocats|kiwi|kiwis)\b/i,
  /\b(mangue|mangues|peche|peches|pêche|pêches|nectarine|nectarines)\b/i,
];

const NON_PRODUCT_LABEL_PATTERNS = [
  /\b(total|sous[-\s]?total|montant)\b/i,
  /\b(tva|taxe|eco[-\s]?participation)\b/i,
  /\b(livraison|frais|service|preparation|préparation)\b/i,
  /\b(paiement|carte|cb|visa|mastercard)\b/i,
  /\b(remise globale|bon d'achat|avoir|coupon)\b/i,
];

export function normalizeOpenAIInvoiceAnalysis({
  payload,
  pdfUrl,
  model,
  providerResponse,
}: {
  payload: OpenAIExtractedInvoicePayload;
  pdfUrl: string;
  model: string;
  providerResponse: unknown;
}): AnalyzedInvoice {
  const items = payload.lines
    .map((line) => normalizeInvoiceLine(line))
    .filter((item): item is AnalyzedInvoiceItem => item !== null);

  if (items.length === 0) {
    throw new Error('Invoice analysis returned no product item');
  }

  return {
    provider: 'openai',
    confidence: normalizeConfidence(payload.confidence, 0.5),
    merchantName: cleanString(payload.merchantName),
    totalAmount: normalizeNullableNumber(payload.totalAmount),
    purchaseDate: parseNullableDate(payload.purchaseDate),
    invoiceNumber: cleanString(payload.invoiceNumber),
    orderNumber: cleanString(payload.orderNumber),
    rawData: toPrismaJson({
      provider: 'openai',
      model,
      pdfUrl,
      extractionSchema: 'drive_invoice_v2',
      payload,
      providerResponse,
      normalizedItemCount: items.length,
    }),
    items,
  };
}

function normalizeInvoiceLine(
  line: OpenAIExtractedInvoiceLine,
): AnalyzedInvoiceItem | null {
  const detectedName = cleanString(line.detectedName ?? line.rawLabel);

  if (!detectedName || line.lineType !== 'product') {
    return null;
  }

  if (
    NON_PRODUCT_LABEL_PATTERNS.some((pattern) => pattern.test(detectedName))
  ) {
    return null;
  }

  const quantity = normalizeQuantity({
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    totalPrice: line.totalPrice,
  });
  const prices = normalizeLinePrices({
    quantity,
    unitPrice: line.unitPrice,
    totalPrice: line.totalPrice,
  });
  const { unitPrice, totalPrice } = prices;
  const category = normalizeCategory(line.categoryHint);
  const storageLocation = suggestStorageLocation({
    category,
    name: detectedName,
  });
  const confidence = adjustLineConfidence(line.confidence, {
    hasCategory: Boolean(category),
    hasTotalPrice: totalPrice !== null,
    hasPriceMismatch: prices.hasPriceMismatch,
  });
  const ean = normalizeBarcode(line.ean);

  return {
    detectedName,
    quantity,
    unitPrice,
    totalPrice,
    confidence,
    productCode: ean,
    selectedEan: ean,
    suggestedEans: ean ? [ean] : [],
    category,
    storageLocation,
    discount: normalizeNullableNumber(line.discount),
  };
}

function adjustLineConfidence(
  value: unknown,
  checks: {
    hasCategory: boolean;
    hasTotalPrice: boolean;
    hasPriceMismatch: boolean;
  },
): number {
  let confidence = normalizeConfidence(value, 0.5);

  if (!checks.hasCategory) {
    confidence -= 0.15;
  }

  if (!checks.hasTotalPrice) {
    confidence -= 0.1;
  }

  if (checks.hasPriceMismatch) {
    confidence -= 0.2;
  }

  return Math.max(0.1, roundConfidence(confidence));
}

function normalizeCategory(value: unknown): string | null {
  const cleaned = cleanString(value);

  if (!cleaned) {
    return null;
  }

  const key = stripAccents(cleaned).toLowerCase().replace(/[_-]/g, ' ').trim();
  const slugKey = stripAccents(cleaned).toLowerCase().trim();
  const slug = CATEGORY_ALIASES[key] ?? CATEGORY_ALIASES[slugKey];

  return KNOWN_INVOICE_CATEGORY_SLUGS.includes(slug as any) ? slug : null;
}

function suggestStorageLocation({
  category,
  name,
}: {
  category: string | null;
  name: string;
}): string | null {
  if (!category) {
    return null;
  }

  if (category === 'fruits-et-legumes') {
    if (REFRIGERATED_PRODUCE_PATTERNS.some((pattern) => pattern.test(name))) {
      return 'Réfrigérateur';
    }

    if (FRUITIER_PRODUCE_PATTERNS.some((pattern) => pattern.test(name))) {
      return 'Fruitier';
    }

    return null;
  }

  return STORAGE_BY_CATEGORY[category] ?? null;
}

function normalizeBarcode(value: unknown): string | null {
  const cleaned = cleanString(value);
  return cleaned && /^\d{8,13}$/.test(cleaned) ? cleaned : null;
}

function normalizeConfidence(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value));
}

function normalizeQuantity({
  quantity,
  unitPrice,
  totalPrice,
}: {
  quantity: unknown;
  unitPrice: unknown;
  totalPrice: unknown;
}): number {
  const extractedQuantity = normalizePositiveIntegerOrNull(quantity);

  if (extractedQuantity !== null) {
    return extractedQuantity;
  }

  return inferQuantityFromPrices({ unitPrice, totalPrice }) ?? 1;
}

function normalizePositiveIntegerOrNull(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return null;
  }

  return Math.max(1, Math.round(value));
}

function inferQuantityFromPrices({
  unitPrice,
  totalPrice,
}: {
  unitPrice: unknown;
  totalPrice: unknown;
}): number | null {
  const rawUnitPrice = normalizeNullablePositiveNumber(unitPrice);
  const rawTotalPrice = normalizeNullablePositiveNumber(totalPrice);

  if (rawUnitPrice === null || rawUnitPrice <= 0 || rawTotalPrice === null) {
    return null;
  }

  const ratio = rawTotalPrice / rawUnitPrice;
  const roundedRatio = Math.round(ratio);

  if (roundedRatio < 1) {
    return null;
  }

  return Math.abs(ratio - roundedRatio) <= 0.05 ? roundedRatio : null;
}

function normalizeLinePrices({
  quantity,
  unitPrice,
  totalPrice,
}: {
  quantity: number;
  unitPrice: unknown;
  totalPrice: unknown;
}): {
  unitPrice: number | null;
  totalPrice: number | null;
  hasPriceMismatch: boolean;
} {
  const rawUnitPrice = normalizeNullablePositiveNumber(unitPrice);
  const rawTotalPrice = normalizeNullablePositiveNumber(totalPrice);

  if (rawTotalPrice !== null) {
    if (rawUnitPrice === null) {
      return {
        unitPrice: roundCurrency(rawTotalPrice / quantity),
        totalPrice: rawTotalPrice,
        hasPriceMismatch: false,
      };
    }

    const inferredTotalPrice = roundCurrency(quantity * rawUnitPrice);
    const hasPriceMismatch =
      Math.abs(inferredTotalPrice - rawTotalPrice) > 0.03;

    return {
      unitPrice: hasPriceMismatch
        ? roundCurrency(rawTotalPrice / quantity)
        : rawUnitPrice,
      totalPrice: rawTotalPrice,
      hasPriceMismatch,
    };
  }

  return {
    unitPrice: rawUnitPrice,
    totalPrice:
      rawUnitPrice !== null ? roundCurrency(quantity * rawUnitPrice) : null,
    hasPriceMismatch: false,
  };
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return value;
}

function normalizeNullablePositiveNumber(value: unknown): number | null {
  const numberValue = normalizeNullableNumber(value);

  return numberValue !== null && numberValue >= 0 ? numberValue : null;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function parseNullableDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundConfidence(value: number): number {
  return Math.round(value * 100) / 100;
}

function stripAccents(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
