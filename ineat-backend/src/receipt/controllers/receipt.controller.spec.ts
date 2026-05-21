import { BadRequestException } from '@nestjs/common';
import {
  ProfileType,
  ReceiptStatus,
  Subscription,
} from '../../../prisma/generated/prisma/client';
import { DocumentType } from '../interfaces/ocr-provider.interface';
import { ReceiptController } from './receipt.controller';

describe('ReceiptController', () => {
  const receiptService = {
    createReceipt: jest.fn(),
  };

  const user = {
    id: 'user-1',
    email: 'camille@example.com',
    passwordHash: 'hash',
    firstName: 'Camille',
    lastName: 'Martin',
    profileType: ProfileType.SINGLE,
    preferences: {},
    subscription: Subscription.PREMIUM,
    avatarUrl: null,
    createdAt: new Date('2026-05-01T00:00:00.000Z'),
    updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  };

  let controller: ReceiptController;

  const makeFile = (
    overrides: Partial<Express.Multer.File> = {},
  ): Express.Multer.File =>
    ({
      fieldname: 'file',
      originalname: 'ticket.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('file'),
      ...overrides,
    }) as Express.Multer.File;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReceiptController(receiptService as any);
    receiptService.createReceipt.mockResolvedValue({
      id: 'receipt-1',
      status: ReceiptStatus.PROCESSING,
      documentType: DocumentType.RECEIPT_IMAGE,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    });
  });

  it('accepts a valid receipt image upload', async () => {
    await expect(
      controller.uploadReceipt(
        user,
        DocumentType.RECEIPT_IMAGE,
        makeFile(),
      ),
    ).resolves.toMatchObject({
      success: true,
      data: {
        receiptId: 'receipt-1',
        status: ReceiptStatus.PROCESSING,
      },
    });

    expect(receiptService.createReceipt).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        documentType: DocumentType.RECEIPT_IMAGE,
        fileName: 'ticket.png',
      }),
    );
  });

  it('rejects missing or invalid document types', async () => {
    await expect(
      controller.uploadReceipt(user, '', makeFile()),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      controller.uploadReceipt(user, 'unknown', makeFile()),
    ).rejects.toThrow('Type de document invalide');
  });

  it('rejects files that do not match the requested document type', async () => {
    await expect(
      controller.uploadReceipt(
        user,
        DocumentType.RECEIPT_IMAGE,
        makeFile({
          originalname: 'invoice.pdf',
          mimetype: 'application/pdf',
        }),
      ),
    ).rejects.toThrow('Format de fichier invalide pour image de ticket');

    await expect(
      controller.uploadReceipt(
        user,
        DocumentType.INVOICE_PDF,
        makeFile({
          originalname: 'ticket.png',
          mimetype: 'image/png',
        }),
      ),
    ).rejects.toThrow('Format de fichier invalide pour facture PDF');
  });

  it('rejects oversized receipt files', async () => {
    await expect(
      controller.uploadReceipt(
        user,
        DocumentType.RECEIPT_IMAGE,
        makeFile({ size: 11 * 1024 * 1024 }),
      ),
    ).rejects.toThrow('Le fichier est trop volumineux');
  });
});
