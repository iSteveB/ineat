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

  const quantity = normalizePositiveNumber(line.quantity, 1);
  const unitPrice = normalizeNullableNumber(line.unitPrice);
  const inferredTotalPrice =
    unitPrice !== null ? roundCurrency(quantity * unitPrice) : null;
  const totalPrice =
    normalizeNullableNumber(line.totalPrice) ?? inferredTotalPrice;
  const category = normalizeCategory(line.categoryHint);
  const hasPriceMismatch =
    inferredTotalPrice !== null &&
    totalPrice !== null &&
    Math.abs(inferredTotalPrice - totalPrice) > 0.03;
  const confidence = adjustLineConfidence(line.confidence, {
    hasCategory: Boolean(category),
    hasTotalPrice: totalPrice !== null,
    hasPriceMismatch,
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

function normalizePositiveNumber(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return value;
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
