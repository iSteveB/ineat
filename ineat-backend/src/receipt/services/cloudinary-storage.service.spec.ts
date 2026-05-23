import { InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CloudinaryStorageService,
  RECEIPT_UPLOAD_ERROR_CODE,
  RECEIPT_UPLOAD_ERROR_MESSAGE,
} from './cloudinary-storage.service';
import { DocumentType } from '../interfaces/ocr-provider.interface';

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

  it('masque les détails Cloudinary dans la réponse HTTP', async () => {
    const service = new CloudinaryStorageService(configService);
    const cloudinaryError = Object.assign(
      new Error('Invalid api_key 738474456436988'),
      { stack: 'Cloudinary stack trace' },
    );

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
      expect(response).not.toContain('Invalid api_key');
      expect(response).not.toContain('738474456436988');
    }
  });
});
