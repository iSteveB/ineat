import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '../../../../prisma/generated/prisma/client';
import {
  AnalyzedInvoice,
  AnalyzedInvoiceItem,
  InvoiceAnalysisProvider,
} from './invoice-analysis-provider';

interface OpenAIInvoiceAnalysisPayload {
  merchantName: string | null;
  totalAmount: number | null;
  purchaseDate: string | null;
  invoiceNumber: string | null;
  orderNumber: string | null;
  confidence: number;
  items: Array<{
    detectedName: string;
    quantity: number;
    unitPrice: number | null;
    totalPrice: number | null;
    confidence: number;
    productCode: string | null;
    category: string | null;
    discount: number | null;
    selectedEan: string | null;
    suggestedEans: string[];
  }>;
}

const INVOICE_ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'merchantName',
    'totalAmount',
    'purchaseDate',
    'invoiceNumber',
    'orderNumber',
    'confidence',
    'items',
  ],
  properties: {
    merchantName: { type: ['string', 'null'] },
    totalAmount: { type: ['number', 'null'] },
    purchaseDate: {
      type: ['string', 'null'],
      description: 'Date ISO 8601 YYYY-MM-DD si visible, null sinon.',
    },
    invoiceNumber: { type: ['string', 'null'] },
    orderNumber: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    items: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'detectedName',
          'quantity',
          'unitPrice',
          'totalPrice',
          'confidence',
          'productCode',
          'category',
          'discount',
          'selectedEan',
          'suggestedEans',
        ],
        properties: {
          detectedName: { type: 'string' },
          quantity: { type: 'number' },
          unitPrice: { type: ['number', 'null'] },
          totalPrice: { type: ['number', 'null'] },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          productCode: { type: ['string', 'null'] },
          category: {
            type: ['string', 'null'],
            description:
              'Slug de catégorie probable, par exemple fruits-et-legumes ou epicerie.',
          },
          discount: { type: ['number', 'null'] },
          selectedEan: { type: ['string', 'null'] },
          suggestedEans: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
  },
};

const INVOICE_ANALYSIS_PROMPT = [
  'Analyse cette facture Drive PDF française.',
  'Retourne uniquement les métadonnées et lignes produits réellement visibles.',
  'Les prix sont en euros. Les quantités peuvent être décimales.',
  'Ne crée pas de lignes pour les totaux, sous-totaux, frais de service, livraison ou moyens de paiement.',
  'Si une information est absente ou incertaine, utilise null et baisse la confiance.',
].join(' ');

@Injectable()
export class OpenAIInvoiceAnalysisProvider implements InvoiceAnalysisProvider {
  readonly providerName = 'openai';

  constructor(private readonly configService: ConfigService) {}

  async analyzePdf(pdfUrl: string): Promise<AnalyzedInvoice> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for invoice analysis');
    }

    const model =
      this.configService.get<string>('OPENAI_INVOICE_MODEL') ?? 'gpt-5.5';

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: INVOICE_ANALYSIS_PROMPT,
              },
              {
                type: 'input_file',
                file_url: pdfUrl,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'invoice_analysis',
            strict: true,
            schema: INVOICE_ANALYSIS_SCHEMA,
          },
        },
      }),
    });

    const responseBody = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error('OpenAI invoice analysis failed');
    }

    const outputText = extractResponseOutputText(responseBody);
    const parsedPayload = parseOpenAIPayload(outputText);

    return normalizeOpenAIInvoiceAnalysis({
      payload: parsedPayload,
      pdfUrl,
      model,
      providerResponse: responseBody,
    });
  }
}

export function normalizeOpenAIInvoiceAnalysis({
  payload,
  pdfUrl,
  model,
  providerResponse,
}: {
  payload: OpenAIInvoiceAnalysisPayload;
  pdfUrl: string;
  model: string;
  providerResponse: unknown;
}): AnalyzedInvoice {
  const items = payload.items
    .map((item) => normalizeInvoiceItem(item))
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
      payload,
      providerResponse,
    }),
    items,
  };
}

function normalizeInvoiceItem(
  item: OpenAIInvoiceAnalysisPayload['items'][number],
): AnalyzedInvoiceItem | null {
  const detectedName = cleanString(item.detectedName);

  if (!detectedName) {
    return null;
  }

  return {
    detectedName,
    quantity: normalizePositiveNumber(item.quantity, 1),
    unitPrice: normalizeNullableNumber(item.unitPrice),
    totalPrice: normalizeNullableNumber(item.totalPrice),
    confidence: normalizeConfidence(item.confidence, 0.5),
    productCode: cleanString(item.productCode),
    category: cleanString(item.category),
    discount: normalizeNullableNumber(item.discount),
    selectedEan: cleanString(item.selectedEan),
    suggestedEans: Array.isArray(item.suggestedEans)
      ? item.suggestedEans.map(cleanString).filter(Boolean)
      : [],
  };
}

function extractResponseOutputText(responseBody: any): string {
  if (typeof responseBody?.output_text === 'string') {
    return responseBody.output_text;
  }

  const content = responseBody?.output
    ?.flatMap((outputItem: any) => outputItem?.content ?? [])
    ?.find((contentItem: any) => typeof contentItem?.text === 'string');

  if (content?.text) {
    return content.text;
  }

  throw new Error('OpenAI invoice analysis returned no text output');
}

function parseOpenAIPayload(outputText: string): OpenAIInvoiceAnalysisPayload {
  const parsed = JSON.parse(outputText) as OpenAIInvoiceAnalysisPayload;

  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error('OpenAI invoice analysis returned invalid JSON');
  }

  return parsed;
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

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
