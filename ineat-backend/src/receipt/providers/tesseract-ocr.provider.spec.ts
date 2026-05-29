import { createWorker } from 'tesseract.js';
import { TesseractOcrProvider } from './tesseract-ocr.provider';
import { DocumentType } from '../interfaces/ocr-provider.interface';

jest.mock('tesseract.js', () => ({
  createWorker: jest.fn(),
}));

const mockedCreateWorker = createWorker as jest.MockedFunction<
  typeof createWorker
>;

describe('TesseractOcrProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initialise Tesseract avec les donnees francaises locales', async () => {
    mockedCreateWorker.mockResolvedValue({
      recognize: jest.fn().mockResolvedValue({
        data: {
          text: 'SUPER MARCHE\nTOTAL 12,34',
        },
      }),
    } as any);

    const provider = new TesseractOcrProvider();

    await provider.processDocument(
      Buffer.from('receipt'),
      DocumentType.RECEIPT_IMAGE,
    );

    expect(mockedCreateWorker).toHaveBeenCalledWith(
      'fra',
      1,
      expect.objectContaining({
        langPath: process.cwd(),
        cachePath: process.cwd(),
        gzip: false,
      }),
    );
  });
});
