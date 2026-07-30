import { AdminOperationsService } from './admin-operations.service';
import { AdminIncidentType } from './dto/admin-operations-query.dto';

describe('AdminOperationsService', () => {
  let prisma: any;
  let service: AdminOperationsService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((operations) => Promise.all(operations)),
      invoice: { findMany: jest.fn(), count: jest.fn() },
      notificationDelivery: { findMany: jest.fn(), count: jest.fn() },
      stripeWebhookEvent: { findMany: jest.fn(), count: jest.fn() },
      resendWebhookEvent: { findMany: jest.fn(), count: jest.fn() },
    };
    service = new AdminOperationsService(prisma);
  });

  it('pagine les analyses de facture échouées sans données métier', async () => {
    prisma.invoice.findMany.mockResolvedValue([
      {
        id: 'invoice-1',
        status: 'FAILED',
        analysisProvider: 'OPENAI',
        errorMessage: 'Bearer private-token\nProvider failed',
        createdAt: new Date('2026-07-30T10:00:00.000Z'),
        updatedAt: new Date('2026-07-30T10:01:00.000Z'),
      },
    ]);
    prisma.invoice.count.mockResolvedValue(26);

    const result = await service.listIncidents({
      type: AdminIncidentType.INVOICE,
      page: 2,
      pageSize: 10,
    });

    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'FAILED' },
        skip: 10,
        take: 10,
        select: expect.not.objectContaining({
          pdfUrl: true,
          rawAnalysisData: true,
          userId: true,
        }),
      }),
    );
    expect(result.data.pagination.totalPages).toBe(3);
    expect(result.data.items[0].error).toBe(
      'Bearer [redacted] Provider failed',
    );
  });

  it('liste uniquement les rebonds et plaintes Resend', async () => {
    prisma.resendWebhookEvent.findMany.mockResolvedValue([]);
    prisma.resendWebhookEvent.count.mockResolvedValue(0);

    await service.listIncidents({ type: AdminIncidentType.RESEND });

    expect(prisma.resendWebhookEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          type: { in: ['email.bounced', 'email.complained'] },
        },
      }),
    );
  });
});
