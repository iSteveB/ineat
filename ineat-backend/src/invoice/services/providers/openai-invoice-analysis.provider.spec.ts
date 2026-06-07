import {
  OpenAIInvoiceAnalysisProvider,
  normalizeOpenAIInvoiceAnalysis,
} from './openai-invoice-analysis.provider';

describe('normalizeOpenAIInvoiceAnalysis', () => {
  it('normalise une sortie OpenAI de facture Drive anonymisée', () => {
    const result = normalizeOpenAIInvoiceAnalysis({
      pdfUrl: 'https://res.cloudinary.com/demo/raw/upload/invoice.pdf',
      model: 'gpt-5.5',
      providerResponse: {
        id: 'resp_123',
      },
      payload: {
        merchantName: ' Drive Test ',
        totalAmount: 12.34,
        purchaseDate: '2026-06-05',
        invoiceNumber: ' FAC-1 ',
        orderNumber: ' CMD-1 ',
        confidence: 1.2,
        items: [
          {
            detectedName: ' Pommes Golden ',
            quantity: 2,
            unitPrice: 1.25,
            totalPrice: 2.5,
            confidence: 0.92,
            productCode: null,
            category: ' fruits-et-legumes ',
            discount: null,
            selectedEan: null,
            suggestedEans: [' 3564700012345 ', ''],
          },
        ],
      },
    });

    expect(result).toMatchObject({
      provider: 'openai',
      confidence: 1,
      merchantName: 'Drive Test',
      totalAmount: 12.34,
      invoiceNumber: 'FAC-1',
      orderNumber: 'CMD-1',
      items: [
        {
          detectedName: 'Pommes Golden',
          quantity: 2,
          unitPrice: 1.25,
          totalPrice: 2.5,
          confidence: 0.92,
          category: 'fruits-et-legumes',
          suggestedEans: ['3564700012345'],
        },
      ],
    });
    expect(result.purchaseDate?.toISOString()).toBe('2026-06-05T00:00:00.000Z');
    expect(result.rawData).toMatchObject({
      provider: 'openai',
      model: 'gpt-5.5',
      payload: {
        merchantName: ' Drive Test ',
      },
      providerResponse: {
        id: 'resp_123',
      },
    });
  });

  it('échoue si aucune ligne produit exploitable ne ressort', () => {
    expect(() =>
      normalizeOpenAIInvoiceAnalysis({
        pdfUrl: 'https://example.com/invoice.pdf',
        model: 'gpt-5.5',
        providerResponse: {},
        payload: {
          merchantName: null,
          totalAmount: null,
          purchaseDate: null,
          invoiceNumber: null,
          orderNumber: null,
          confidence: 0.5,
          items: [
            {
              detectedName: '   ',
              quantity: 1,
              unitPrice: null,
              totalPrice: null,
              confidence: 0.5,
              productCode: null,
              category: null,
              discount: null,
              selectedEan: null,
              suggestedEans: [],
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

  it('appelle la Responses API avec le PDF en file_url et du JSON schema', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        id: 'resp_123',
        output_text: JSON.stringify({
          merchantName: 'Drive Test',
          totalAmount: 2.5,
          purchaseDate: '2026-06-05',
          invoiceNumber: null,
          orderNumber: null,
          confidence: 0.8,
          items: [
            {
              detectedName: 'Pommes',
              quantity: 1,
              unitPrice: 2.5,
              totalPrice: 2.5,
              confidence: 0.8,
              productCode: null,
              category: 'fruits-et-legumes',
              discount: null,
              selectedEan: null,
              suggestedEans: [],
            },
          ],
        }),
      }),
    } as any);

    const provider = new OpenAIInvoiceAnalysisProvider(configService as any);
    const result = await provider.analyzePdf(
      'https://res.cloudinary.com/demo/raw/upload/invoice.pdf',
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
    expect(
      JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body),
    ).toMatchObject({
      model: 'gpt-5.5',
      input: [
        {
          content: [
            {
              type: 'input_text',
            },
            {
              type: 'input_file',
              file_url:
                'https://res.cloudinary.com/demo/raw/upload/invoice.pdf',
            },
          ],
        },
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'invoice_analysis',
          strict: true,
        },
      },
    });
    expect(result).toMatchObject({
      provider: 'openai',
      items: [
        {
          detectedName: 'Pommes',
        },
      ],
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
});
