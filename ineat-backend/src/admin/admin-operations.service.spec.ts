import { AdminOperationsService } from './admin-operations.service';
import { AdminIncidentType } from './dto/admin-operations-query.dto';

describe('AdminOperationsService', () => {
  let prisma: any;
  let service: AdminOperationsService;

  beforeEach(() => {
    prisma = {
      $transaction: jest.fn((operations) => Promise.all(operations)),
      invoice: { findMany: jest.fn(), count: jest.fn() },
      invoiceProcessingEvent: { findMany: jest.fn() },
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
        processingStage: 'FAILED',
        processingAttempt: 3,
        processingTime: 4200,
        processingErrorCode: 'PROVIDER_TIMEOUT',
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
    expect(result.data.items[0]).toMatchObject({
      stage: 'FAILED',
      attempts: 3,
      durationMs: 4200,
      errorCode: 'PROVIDER_TIMEOUT',
    });
  });

  it('calcule les percentiles et le taux d’échec des factures', async () => {
    prisma.invoiceProcessingEvent.findMany.mockResolvedValue([
      { stage: 'ANALYZING', durationMs: 100, status: 'COMPLETED' },
      { stage: 'ANALYZING', durationMs: 500, status: 'COMPLETED' },
    ]);
    prisma.invoice.findMany.mockResolvedValue([
      {
        status: 'COMPLETED',
        processingAttempt: 1,
        processingTime: 500,
        _count: { InvoiceItem: 4 },
      },
      {
        status: 'FAILED',
        processingAttempt: 2,
        processingTime: 100,
        _count: { InvoiceItem: 0 },
      },
    ]);
    prisma.invoice.count.mockResolvedValueOnce(1).mockResolvedValueOnce(1);

    const result = await service.getInvoiceMetrics();

    expect(result.data).toMatchObject({
      invoices: 2,
      failureRate: 0.5,
      retriedInvoices: 1,
      averageItemCount: 2,
      stages: [{ stage: 'ANALYZING', count: 2, p50Ms: 100, p95Ms: 500 }],
    });
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
