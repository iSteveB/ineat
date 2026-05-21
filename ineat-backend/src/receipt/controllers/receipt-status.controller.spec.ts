import { NotFoundException } from '@nestjs/common';
import { ReceiptStatusController } from './receipt-status.controller';

describe('ReceiptStatusController', () => {
  const prisma = {
    receipt: {
      findFirst: jest.fn(),
    },
  };

  let controller: ReceiptStatusController;

  const request = {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      role: 'PREMIUM',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReceiptStatusController(prisma as any);
  });

  it('returns processing status with progress metrics and estimated time', async () => {
    const now = new Date();
    prisma.receipt.findFirst.mockResolvedValue({
      id: 'receipt-1',
      status: 'PROCESSING',
      imageUrl: 'https://example.com/receipt.jpg',
      totalAmount: null,
      purchaseDate: null,
      merchantName: null,
      merchantAddress: null,
      ReceiptItem: [{ validated: true }, { validated: false }],
      createdAt: now,
      updatedAt: now,
    });

    const response = await controller.getReceiptStatus(
      request as any,
      'receipt-1',
    );

    expect(prisma.receipt.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'receipt-1',
        userId: 'user-1',
      },
      include: {
        ReceiptItem: true,
      },
    });
    expect(response).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          id: 'receipt-1',
          status: 'PROCESSING',
          totalItems: 2,
          validatedItems: 1,
          validationProgress: 50,
          readyForInventory: false,
          estimatedTimeRemaining: expect.any(Number),
          errorMessage: null,
        }),
        message: 'Ticket en cours de traitement...',
      }),
    );
  });

  it('returns failed status with stored error message', async () => {
    const now = new Date();
    prisma.receipt.findFirst.mockResolvedValue({
      id: 'receipt-1',
      status: 'FAILED',
      imageUrl: null,
      totalAmount: null,
      purchaseDate: null,
      merchantName: null,
      merchantAddress: null,
      errorMessage: 'OCR failed',
      ReceiptItem: [],
      createdAt: now,
      updatedAt: now,
    });

    const response = await controller.getReceiptStatus(
      request as any,
      'receipt-1',
    );

    expect(response.data.errorMessage).toBe('OCR failed');
    expect(response.message).toBe('Erreur lors du traitement du ticket');
  });

  it('throws when the receipt does not belong to the user', async () => {
    prisma.receipt.findFirst.mockResolvedValue(null);

    await expect(
      controller.getReceiptStatus(request as any, 'receipt-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
