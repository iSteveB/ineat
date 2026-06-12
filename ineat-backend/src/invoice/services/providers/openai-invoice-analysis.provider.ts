import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnalyzedInvoice,
  InvoiceAnalysisProvider,
} from './invoice-analysis-provider';
import {
  KNOWN_INVOICE_CATEGORY_SLUGS,
  OpenAIExtractedInvoicePayload,
  normalizeOpenAIInvoiceAnalysis,
} from './openai-invoice-normalizer';

const INVOICE_EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'merchantName',
    'totalAmount',
    'currency',
    'purchaseDate',
    'invoiceNumber',
    'orderNumber',
    'confidence',
    'lines',
  ],
  properties: {
    merchantName: { type: ['string', 'null'] },
    totalAmount: { type: ['number', 'null'] },
    currency: {
      type: ['string', 'null'],
      description: 'Code devise ISO 4217, par exemple EUR.',
    },
    purchaseDate: {
      type: ['string', 'null'],
      description: 'Date ISO 8601 YYYY-MM-DD si visible, null sinon.',
    },
    invoiceNumber: { type: ['string', 'null'] },
    orderNumber: { type: ['string', 'null'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    lines: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'rawLabel',
          'detectedName',
          'lineType',
          'quantity',
          'unit',
          'unitPrice',
          'totalPrice',
          'discount',
          'ean',
          'categoryHint',
          'confidence',
        ],
        properties: {
          rawLabel: {
            type: ['string', 'null'],
            description: 'Libellé exact visible sur la ligne facture.',
          },
          detectedName: {
            type: ['string', 'null'],
            description: 'Nom produit nettoyé si la ligne est un produit.',
          },
          lineType: {
            type: 'string',
            enum: ['product', 'fee', 'discount', 'total', 'payment', 'unknown'],
          },
          quantity: { type: ['number', 'null'] },
          unit: { type: ['string', 'null'] },
          unitPrice: { type: ['number', 'null'] },
          totalPrice: { type: ['number', 'null'] },
          discount: { type: ['number', 'null'] },
          ean: {
            type: ['string', 'null'],
            description: 'Code EAN visible, 8 à 13 chiffres, null sinon.',
          },
          categoryHint: {
            type: ['string', 'null'],
            description: `Indice de catégorie. Préférer un de ces slugs si évident: ${KNOWN_INVOICE_CATEGORY_SLUGS.join(', ')}.`,
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  },
};

const INVOICE_ANALYSIS_PROMPT = [
  'Analyse cette facture Drive PDF française.',
  'Extrais les métadonnées et toutes les lignes visibles.',
  'Classe chaque ligne avec lineType: product, fee, discount, total, payment ou unknown.',
  'Ne transforme pas les frais, totaux, moyens de paiement ou remises globales en produits.',
  'Les prix sont en euros TTC sauf mention contraire.',
  'Pour chaque produit, quantity est un entier positif correspondant au nombre d’articles.',
  'Pour chaque produit, unitPrice est le prix unitaire TTC. Si seule une ligne totale est visible, calcule unitPrice = totalPrice / quantity.',
  'Pour categoryHint, utilise un slug connu seulement si la catégorie est évidente.',
  'Si une information est absente ou incertaine, utilise null et baisse la confidence.',
].join(' ');

@Injectable()
export class OpenAIInvoiceAnalysisProvider implements InvoiceAnalysisProvider {
  readonly providerName = 'openai';

  constructor(private readonly configService: ConfigService) {}

  async analyzePdf(
    pdfUrl: string,
    pdfBuffer?: Buffer,
  ): Promise<AnalyzedInvoice> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for invoice analysis');
    }

    const model =
      this.configService.get<string>('OPENAI_INVOICE_MODEL') ?? 'gpt-5.5';
    const fileInput = createPdfFileInput(pdfUrl, pdfBuffer);

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
              fileInput,
            ],
          },
        ],
        text: {
          format: {
            type: 'json_schema',
            name: 'drive_invoice_extraction',
            strict: true,
            schema: INVOICE_EXTRACTION_SCHEMA,
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

function createPdfFileInput(pdfUrl: string, pdfBuffer?: Buffer) {
  if (pdfBuffer?.length) {
    return {
      type: 'input_file',
      filename: 'facture-drive.pdf',
      file_data: `data:application/pdf;base64,${pdfBuffer.toString('base64')}`,
    };
  }

  return {
    type: 'input_file',
    file_url: pdfUrl,
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

function parseOpenAIPayload(outputText: string): OpenAIExtractedInvoicePayload {
  const parsed = JSON.parse(outputText) as OpenAIExtractedInvoicePayload;

  if (!parsed || !Array.isArray(parsed.lines)) {
    throw new Error('OpenAI invoice analysis returned invalid JSON');
  }

  return parsed;
}

export { normalizeOpenAIInvoiceAnalysis } from './openai-invoice-normalizer';
