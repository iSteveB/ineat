import { ReceiptProcessor } from './receipt.processor';
import { DocumentType } from '../interfaces/ocr-provider.interface';

describe('ReceiptProcessor', () => {
  const receiptService = {
    processReceiptOcrAndLlm: jest.fn(),
    markReceiptAsFailed: jest.fn(),
  };

  let processor: ReceiptProcessor;

  const makeJob = (overrides: Record<string, unknown> = {}) =>
    ({
      data: {
        receiptId: 'receipt-1',
        userId: 'user-1',
        documentType: DocumentType.RECEIPT_IMAGE,
        fileBuffer: Buffer.from('receipt'),
      },
      progress: jest.fn(),
      attemptsMade: 3,
      opts: { attempts: 3 },
      ...overrides,
    }) as any;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new ReceiptProcessor(receiptService as any);
  });

  it('delegates processing to the receipt service through the job payload', async () => {
    const job = makeJob();
    receiptService.processReceiptOcrAndLlm.mockResolvedValue(undefined);

    await expect(processor.processReceipt(job)).resolves.toMatchObject({
      success: true,
      receiptId: 'receipt-1',
    });

    expect(receiptService.processReceiptOcrAndLlm).toHaveBeenCalledWith(
      'receipt-1',
      job.data.fileBuffer,
      DocumentType.RECEIPT_IMAGE,
      { throwOnError: true },
    );
    expect(job.progress).toHaveBeenCalledWith(10);
    expect(job.progress).toHaveBeenCalledWith(100);
  });

  it('rethrows processing errors so Bull can retry', async () => {
    const job = makeJob({ attemptsMade: 1, opts: { attempts: 3 } });
    const error = new Error('OCR failed');
    receiptService.processReceiptOcrAndLlm.mockRejectedValue(error);

    await expect(processor.processReceipt(job)).rejects.toThrow('OCR failed');
    expect(receiptService.markReceiptAsFailed).not.toHaveBeenCalled();
  });

  it('marks the receipt as failed when the last retry is exhausted', async () => {
    const job = makeJob();

    await processor.handleFailedJob(job, new Error('OCR failed'));

    expect(receiptService.markReceiptAsFailed).toHaveBeenCalledWith(
      'receipt-1',
      'Échec définitif après 3 tentatives: OCR failed',
    );
  });
});
