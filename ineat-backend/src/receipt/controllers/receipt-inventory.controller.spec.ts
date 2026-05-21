import { ReceiptInventoryController } from './receipt-inventory.controller';

describe('ReceiptInventoryController', () => {
  const prisma = {
    product: {
      findUnique: jest.fn(),
    },
    receiptItem: {
      updateMany: jest.fn(),
    },
  };

  const receiptToInventoryService = {
    addReceiptItemsToInventory: jest.fn(),
  };

  let controller: ReceiptInventoryController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ReceiptInventoryController(
      prisma as any,
      receiptToInventoryService as any,
    );
  });

  it('persists submitted frontend validations before inventory conversion', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 'product-1',
      barcode: '3017624010701',
    });
    prisma.receiptItem.updateMany.mockResolvedValue({ count: 1 });

    await (controller as any).applySubmittedProductValidations('receipt-1', [
      {
        productId: 'receipt-item-1',
        eanCode: '3017624010701',
        quantity: 2,
      },
    ]);

    expect(prisma.product.findUnique).toHaveBeenCalledWith({
      where: { barcode: '3017624010701' },
    });
    expect(prisma.receiptItem.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'receipt-item-1',
        receiptId: 'receipt-1',
      },
      data: expect.objectContaining({
        validated: true,
        selectedEan: '3017624010701',
        productId: 'product-1',
        quantity: 2,
        updatedAt: expect.any(Date),
      }),
    });
  });
});
