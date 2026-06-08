import { InvoiceAnalysisService } from './invoice-analysis.service';

describe('InvoiceAnalysisService', () => {
  const configService = {
    get: jest.fn(),
  };
  const mockProvider = {
    providerName: 'mock',
    analyzePdf: jest.fn(),
  };
  const openAIProvider = {
    providerName: 'openai',
    analyzePdf: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("utilise OpenAI par défaut quand une clé d'API existe", async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'OPENAI_API_KEY' ? 'test-key' : undefined,
    );
    openAIProvider.analyzePdf.mockResolvedValue({
      provider: 'openai',
      confidence: 0.8,
      rawData: {},
      items: [],
    });

    const service = new InvoiceAnalysisService(
      configService as any,
      mockProvider as any,
      openAIProvider as any,
    );

    const pdfBuffer = Buffer.from('%PDF-1.4');
    await service.analyzePdf('https://example.com/invoice.pdf', pdfBuffer);

    expect(openAIProvider.analyzePdf).toHaveBeenCalledWith(
      'https://example.com/invoice.pdf',
      pdfBuffer,
    );
    expect(mockProvider.analyzePdf).not.toHaveBeenCalled();
  });

  it("utilise le provider mock par défaut quand aucune clé OpenAI n'est disponible", async () => {
    configService.get.mockReturnValue(undefined);
    mockProvider.analyzePdf.mockResolvedValue({
      provider: 'mock',
      confidence: 0.9,
      rawData: {},
      items: [],
    });

    const service = new InvoiceAnalysisService(
      configService as any,
      mockProvider as any,
      openAIProvider as any,
    );

    const pdfBuffer = Buffer.from('%PDF-1.4');
    await service.analyzePdf('https://example.com/invoice.pdf', pdfBuffer);

    expect(mockProvider.analyzePdf).toHaveBeenCalledWith(
      'https://example.com/invoice.pdf',
      pdfBuffer,
    );
    expect(openAIProvider.analyzePdf).not.toHaveBeenCalled();
  });

  it('force le provider mock quand il est configuré explicitement', async () => {
    configService.get.mockImplementation((key: string) => {
      if (key === 'INVOICE_ANALYSIS_PROVIDER') {
        return 'mock';
      }

      if (key === 'OPENAI_API_KEY') {
        return 'test-key';
      }

      return undefined;
    });
    mockProvider.analyzePdf.mockResolvedValue({
      provider: 'mock',
      confidence: 0.9,
      rawData: {},
      items: [],
    });

    const service = new InvoiceAnalysisService(
      configService as any,
      mockProvider as any,
      openAIProvider as any,
    );

    await service.analyzePdf('https://example.com/invoice.pdf');

    expect(mockProvider.analyzePdf).toHaveBeenCalled();
    expect(openAIProvider.analyzePdf).not.toHaveBeenCalled();
  });

  it('utilise le provider OpenAI quand il est configuré', async () => {
    configService.get.mockReturnValue('openai');
    openAIProvider.analyzePdf.mockResolvedValue({
      provider: 'openai',
      confidence: 0.8,
      rawData: {},
      items: [],
    });

    const service = new InvoiceAnalysisService(
      configService as any,
      mockProvider as any,
      openAIProvider as any,
    );

    const pdfBuffer = Buffer.from('%PDF-1.4');
    await service.analyzePdf('https://example.com/invoice.pdf', pdfBuffer);

    expect(openAIProvider.analyzePdf).toHaveBeenCalledWith(
      'https://example.com/invoice.pdf',
      pdfBuffer,
    );
    expect(mockProvider.analyzePdf).not.toHaveBeenCalled();
  });

  it('refuse un provider inconnu', async () => {
    configService.get.mockReturnValue('unknown');
    const service = new InvoiceAnalysisService(
      configService as any,
      mockProvider as any,
      openAIProvider as any,
    );

    await expect(
      service.analyzePdf('https://example.com/invoice.pdf'),
    ).rejects.toThrow('Unsupported invoice analysis provider');
  });
});
