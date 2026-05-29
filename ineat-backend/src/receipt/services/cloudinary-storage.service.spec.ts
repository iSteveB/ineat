import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CloudinaryStorageService,
  OPTIMIZED_RECEIPT_IMAGE_MAX_WIDTH,
  RECEIPT_UPLOAD_ERROR_CODE,
  RECEIPT_UPLOAD_ERROR_MESSAGE,
} from './cloudinary-storage.service';
import { DocumentType } from '../interfaces/ocr-provider.interface';

const SENSITIVE_TERMS = [
  'api_key',
  'Invalid Signature',
  'CLOUDINARY_API_SECRET',
  'stack',
  'Cloudinary',
  '738474456436988',
];

const expectNoSensitiveTerms = (value: unknown) => {
  const serialized = JSON.stringify(value);

  SENSITIVE_TERMS.forEach((term) => {
    expect(serialized).not.toContain(term);
  });
};

describe('CloudinaryStorageService', () => {
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        CLOUDINARY_CLOUD_NAME: 'test-cloud',
        CLOUDINARY_API_KEY: 'test-api-key',
        CLOUDINARY_API_SECRET: 'test-api-secret',
      };

      return values[key];
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('utilise CLOUDINARY_UPLOAD_PRESET comme fallback pour les receipts', () => {
    const fallbackConfigService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string> = {
          CLOUDINARY_CLOUD_NAME: 'test-cloud',
          CLOUDINARY_API_KEY: 'test-api-key',
          CLOUDINARY_API_SECRET: 'test-api-secret',
          CLOUDINARY_UPLOAD_PRESET: 'legacy-receipt-preset',
        };

        return values[key];
      }),
    } as unknown as ConfigService;

    const service = new CloudinaryStorageService(fallbackConfigService);

    expect((service as any).receiptPreset).toBe('legacy-receipt-preset');
  });

  it("télécharge une image optimisée pour l'OCR depuis Cloudinary", async () => {
    const service = new CloudinaryStorageService(configService);
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        ok: true,
        arrayBuffer: async () => Buffer.from('optimized-image'),
      } as unknown as Response);

    await expect(
      service.downloadOptimizedReceiptImage({
        url: 'http://res.cloudinary.com/test/image/upload/receipt.jpg',
        secureUrl: 'https://res.cloudinary.com/test/image/upload/receipt.jpg',
        publicId: 'receipts/user-123/receipt',
        format: 'jpg',
        resourceType: 'image',
        bytes: 5_000_000,
      }),
    ).resolves.toEqual(Buffer.from('optimized-image'));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        `w_${OPTIMIZED_RECEIPT_IMAGE_MAX_WIDTH}`,
      ),
    );
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('f_jpg'));

    fetchMock.mockRestore();
  });

  it.each([
    'Invalid api_key 738474456436988',
    'Invalid Signature abc123 for Cloudinary upload',
    'Missing CLOUDINARY_API_SECRET in environment',
    'Cloudinary stack trace at upload_stream',
  ])(
    'masque les détails Cloudinary dans la réponse HTTP: %s',
    async (message) => {
      const service = new CloudinaryStorageService(configService);
      const cloudinaryError = Object.assign(new Error(message), {
        stack: 'Cloudinary stack trace',
      });

      jest
        .spyOn(service as any, 'uploadToCloudinary')
        .mockRejectedValue(cloudinaryError);

      try {
        await service.uploadReceipt(
          Buffer.from('receipt-image'),
          'user-123',
          DocumentType.RECEIPT_IMAGE,
        );
        throw new Error('Expected uploadReceipt to reject');
      } catch (error) {
        expect(error).toBeInstanceOf(InternalServerErrorException);
        expect(error).toMatchObject({
          response: {
            code: RECEIPT_UPLOAD_ERROR_CODE,
            message: RECEIPT_UPLOAD_ERROR_MESSAGE,
          },
        });

        const response = JSON.stringify(
          (error as InternalServerErrorException).getResponse(),
        );
        expectNoSensitiveTerms(response);
      }
    },
  );
});
