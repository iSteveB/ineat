import {
  OpenAIInvoiceAnalysisProvider,
  normalizeOpenAIInvoiceAnalysis,
} from './openai-invoice-analysis.provider';
import { OpenAIExtractedInvoicePayload } from './openai-invoice-normalizer';

const nominalPayload: OpenAIExtractedInvoicePayload = {
  merchantName: ' Drive Test ',
  totalAmount: 14.84,
  currency: 'EUR',
  purchaseDate: '2026-06-05',
  invoiceNumber: ' FAC-1 ',
  orderNumber: ' CMD-1 ',
  confidence: 1.2,
  lines: [
    {
      rawLabel: 'Pommes Golden vrac',
      detectedName: ' Pommes Golden ',
      lineType: 'product',
      quantity: 2,
      unit: 'kg',
      unitPrice: 1.25,
      totalPrice: 2.5,
      confidence: 0.92,
      ean: '3564700012345',
      categoryHint: 'Fruits et légumes',
      discount: null,
    },
    {
      rawLabel: 'Frais de préparation',
      detectedName: 'Frais de préparation',
      lineType: 'fee',
      quantity: 1,
      unit: null,
      unitPrice: 2.9,
      totalPrice: 2.9,
      confidence: 0.99,
      ean: null,
      categoryHint: null,
      discount: null,
    },
    {
      rawLabel: 'TOTAL TTC',
      detectedName: 'TOTAL TTC',
      lineType: 'total',
      quantity: null,
      unit: null,
      unitPrice: null,
      totalPrice: 14.84,
      confidence: 0.99,
      ean: null,
      categoryHint: null,
      discount: null,
    },
  ],
};

describe('normalizeOpenAIInvoiceAnalysis', () => {
  it('normalise une extraction OpenAI de facture Drive anonymisée', () => {
    const result = normalizeOpenAIInvoiceAnalysis({
      pdfUrl: 'https://res.cloudinary.com/demo/raw/upload/invoice.pdf',
      model: 'gpt-5.5',
      providerResponse: {
        id: 'resp_123',
      },
      payload: nominalPayload,
    });

    expect(result).toMatchObject({
      provider: 'openai',
      confidence: 1,
      merchantName: 'Drive Test',
      totalAmount: 14.84,
      invoiceNumber: 'FAC-1',
      orderNumber: 'CMD-1',
      items: [
        {
          detectedName: 'Pommes Golden',
          quantity: 2,
          unitPrice: 1.25,
          totalPrice: 2.5,
          confidence: 0.92,
          productCode: '3564700012345',
          selectedEan: '3564700012345',
          category: 'fruits-et-legumes',
          storageLocation: 'Fruitier',
          suggestedEans: ['3564700012345'],
        },
      ],
    });
    expect(result.purchaseDate?.toISOString()).toBe('2026-06-05T00:00:00.000Z');
    expect(result.rawData).toMatchObject({
      provider: 'openai',
      model: 'gpt-5.5',
      extractionSchema: 'drive_invoice_v2',
      normalizedItemCount: 1,
      payload: {
        merchantName: ' Drive Test ',
      },
      providerResponse: {
        id: 'resp_123',
      },
    });
  });

  it('filtre les frais, remises globales et totaux', () => {
    const result = normalizeOpenAIInvoiceAnalysis({
      pdfUrl: 'https://example.com/invoice.pdf',
      model: 'gpt-5.5',
      providerResponse: {},
      payload: {
        ...nominalPayload,
        lines: [
          ...nominalPayload.lines,
          {
            rawLabel: 'Remise globale fidélité',
            detectedName: 'Remise globale fidélité',
            lineType: 'discount',
            quantity: 1,
            unit: null,
            unitPrice: -1,
            totalPrice: -1,
            confidence: 0.9,
            ean: null,
            categoryHint: null,
            discount: 1,
          },
        ],
      },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].detectedName).toBe('Pommes Golden');
  });

  it('gère quantité multiple, remise ligne et total recalculé', () => {
    const result = normalizeOpenAIInvoiceAnalysis({
      pdfUrl: 'https://example.com/invoice.pdf',
      model: 'gpt-5.5',
      providerResponse: {},
      payload: {
        ...nominalPayload,
        lines: [
          {
            rawLabel: 'Yaourt nature x6 remise immédiate',
            detectedName: 'Yaourt nature',
            lineType: 'product',
            quantity: 6,
            unit: 'piece',
            unitPrice: 0.55,
            totalPrice: null,
            confidence: 0.88,
            ean: null,
            categoryHint: 'produits-laitiers',
            discount: 0.4,
          },
        ],
      },
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        detectedName: 'Yaourt nature',
        quantity: 6,
        unitPrice: 0.55,
        totalPrice: 3.3,
        discount: 0.4,
        category: 'produits-laitiers',
        storageLocation: 'Réfrigérateur',
      }),
    ]);
  });

  it('force une quantité entière et déduit le prix unitaire TTC depuis le total', () => {
    const result = normalizeOpenAIInvoiceAnalysis({
      pdfUrl: 'https://example.com/invoice.pdf',
      model: 'gpt-5.5',
      providerResponse: {},
      payload: {
        ...nominalPayload,
        lines: [
          {
            rawLabel: 'Compotes pomme x3',
            detectedName: 'Compotes pomme',
            lineType: 'product',
            quantity: 2.8,
            unit: 'piece',
            unitPrice: null,
            totalPrice: 5.97,
            confidence: 0.9,
            ean: null,
            categoryHint: 'epicerie sucree',
            discount: null,
          },
        ],
      },
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        detectedName: 'Compotes pomme',
        quantity: 3,
        unitPrice: 1.99,
        totalPrice: 5.97,
        category: 'epicerie-sucree',
        storageLocation: 'Placard',
      }),
    ]);
  });

  it('déduit la quantité depuis le ratio prix total / prix unitaire si la colonne Qté est manquante', () => {
    const result = normalizeOpenAIInvoiceAnalysis({
      pdfUrl: 'https://example.com/invoice.pdf',
      model: 'gpt-5.5',
      providerResponse: {},
      payload: {
        ...nominalPayload,
        lines: [
          {
            rawLabel: 'CRISTALINE Eau de source plate 6x1,5l',
            detectedName: 'CRISTALINE Eau de source plate 6x1,5l',
            lineType: 'product',
            quantity: null,
            unit: 'piece',
            unitPrice: 1.14,
            totalPrice: 3.42,
            confidence: 0.86,
            ean: null,
            categoryHint: 'boissons',
            discount: null,
          },
        ],
      },
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        detectedName: 'CRISTALINE Eau de source plate 6x1,5l',
        quantity: 3,
        unitPrice: 1.14,
        totalPrice: 3.42,
        category: 'boissons',
        storageLocation: 'Placard',
      }),
    ]);
  });

  it('laisse le stockage vide pour un fruit ou légume ambigu', () => {
    const result = normalizeOpenAIInvoiceAnalysis({
      pdfUrl: 'https://example.com/invoice.pdf',
      model: 'gpt-5.5',
      providerResponse: {},
      payload: {
        ...nominalPayload,
        lines: [
          {
            rawLabel: 'Panier primeur de saison',
            detectedName: 'Panier primeur de saison',
            lineType: 'product',
            quantity: 1,
            unit: 'piece',
            unitPrice: 8,
            totalPrice: 8,
            confidence: 0.82,
            ean: null,
            categoryHint: 'fruits-et-legumes',
            discount: null,
          },
        ],
      },
    });

    expect(result.items).toEqual([
      expect.objectContaining({
        category: 'fruits-et-legumes',
        storageLocation: null,
      }),
    ]);
  });

  it('baisse la confiance si catégorie inconnue ou prix incohérent', () => {
    const result = normalizeOpenAIInvoiceAnalysis({
      pdfUrl: 'https://example.com/invoice.pdf',
      model: 'gpt-5.5',
      providerResponse: {},
      payload: {
        ...nominalPayload,
        lines: [
          {
            rawLabel: 'Produit mystère',
            detectedName: 'Produit mystère',
            lineType: 'product',
            quantity: 2,
            unit: 'piece',
            unitPrice: 2,
            totalPrice: 7,
            confidence: 0.9,
            ean: null,
            categoryHint: 'categorie inventee',
            discount: null,
          },
        ],
      },
    });

    expect(result.items[0]).toMatchObject({
      category: null,
      unitPrice: 3.5,
      totalPrice: 7,
      confidence: 0.55,
    });
  });

  it('échoue si aucune ligne produit exploitable ne ressort', () => {
    expect(() =>
      normalizeOpenAIInvoiceAnalysis({
        pdfUrl: 'https://example.com/invoice.pdf',
        model: 'gpt-5.5',
        providerResponse: {},
        payload: {
          ...nominalPayload,
          lines: [
            {
              rawLabel: 'TOTAL TTC',
              detectedName: 'TOTAL TTC',
              lineType: 'total',
              quantity: null,
              unit: null,
              unitPrice: null,
              totalPrice: 10,
              confidence: 0.9,
              ean: null,
              categoryHint: null,
              discount: null,
            },
          ],
        },
      }),
    ).toThrow('Invoice analysis returned no product item');
  });
});

describe('OpenAIInvoiceAnalysisProvider', () => {
  const originalFetch = global.fetch;
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'OPENAI_API_KEY') {
        return 'test-key';
      }

      if (key === 'OPENAI_INVOICE_MODEL') {
        return 'gpt-5.5';
      }

      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('appelle la Responses API avec le PDF en file_data et du JSON schema', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'resp_123',
        output_text: JSON.stringify(nominalPayload),
      }),
    } as any);

    const provider = new OpenAIInvoiceAnalysisProvider(configService as any);
    const result = await provider.analyzePdf(
      'https://res.cloudinary.com/demo/raw/upload/invoice.pdf',
      Buffer.from('%PDF-1.4'),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/responses',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body).toMatchObject({
      model: 'gpt-5.5',
      input: [
        {
          content: [
            {
              type: 'input_text',
            },
            {
              type: 'input_file',
              filename: 'facture-drive.pdf',
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'drive_invoice_extraction',
          strict: true,
        },
      },
    });
    expect(body.input[0].content[1].file_data).toContain(
      'data:application/pdf;base64,',
    );
    expect(result).toMatchObject({
      provider: 'openai',
      items: [
        {
          detectedName: 'Pommes Golden',
        },
      ],
    });
  });

  it("garde file_url en fallback si le buffer n'est pas disponible", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'resp_123',
        output_text: JSON.stringify(nominalPayload),
      }),
    } as any);

    const provider = new OpenAIInvoiceAnalysisProvider(configService as any);
    await provider.analyzePdf('https://example.com/invoice.pdf');

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.input[0].content[1]).toMatchObject({
      type: 'input_file',
      file_url: 'https://example.com/invoice.pdf',
    });
  });

  it("échoue sans exposer le détail d'erreur provider", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: {
          message: 'private provider detail',
        },
      }),
    } as any);

    const provider = new OpenAIInvoiceAnalysisProvider(configService as any);

    await expect(
      provider.analyzePdf('https://example.com/invoice.pdf'),
    ).rejects.toThrow('OpenAI invoice analysis failed');
  });

  it('échoue sur une réponse OpenAI invalide', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'resp_123',
        output_text: JSON.stringify({ items: [] }),
      }),
    } as any);

    const provider = new OpenAIInvoiceAnalysisProvider(configService as any);

    await expect(
      provider.analyzePdf('https://example.com/invoice.pdf'),
    ).rejects.toThrow('OpenAI invoice analysis returned invalid JSON');
  });
});
