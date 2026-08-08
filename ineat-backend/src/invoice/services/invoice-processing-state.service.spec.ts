import { BadRequestException } from '@nestjs/common';
import {
  InvoiceProcessingEventStatus,
  InvoiceProcessingStage,
} from '../../../prisma/generated/prisma/client';
import { InvoiceProcessingStateService } from './invoice-processing-state.service';

describe('InvoiceProcessingStateService', () => {
  const tx = {
    invoice: { update: jest.fn() },
    invoiceProcessingEvent: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const prisma = {
    invoice: { findUnique: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: InvoiceProcessingStateService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvoiceProcessingStateService(prisma as any);
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    prisma.invoice.findUnique.mockResolvedValue({
      id: 'invoice-1',
      processingStage: InvoiceProcessingStage.UPLOADED,
      processingAttempt: 1,
      stageStartedAt: new Date('2026-08-09T00:00:00.000Z'),
      updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    });
    tx.invoice.update.mockResolvedValue({
      id: 'invoice-1',
      processingStage: InvoiceProcessingStage.ANALYZING,
    });
  });

  it('persiste une transition autorisée et clôture l’étape précédente', async () => {
    await service.transition('invoice-1', InvoiceProcessingStage.ANALYZING);

    expect(tx.invoiceProcessingEvent.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          invoiceId: 'invoice-1',
          stage: InvoiceProcessingStage.UPLOADED,
          status: InvoiceProcessingEventStatus.STARTED,
        },
        data: expect.objectContaining({
          status: InvoiceProcessingEventStatus.COMPLETED,
        }),
      }),
    );
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: expect.objectContaining({
        processingStage: InvoiceProcessingStage.ANALYZING,
        processingProgress: 50,
        processingAttempt: 1,
        stageCompletedAt: null,
        processingErrorCode: null,
      }),
    });
    expect(tx.invoiceProcessingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        invoiceId: 'invoice-1',
        stage: InvoiceProcessingStage.ANALYZING,
        status: InvoiceProcessingEventStatus.STARTED,
        attempt: 1,
      }),
    });
  });

  it('est idempotent lorsque la cible est déjà l’étape courante', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: 'invoice-1',
      processingStage: InvoiceProcessingStage.ANALYZING,
      processingAttempt: 1,
      stageStartedAt: new Date(),
      updatedAt: new Date(),
    });

    await service.transition('invoice-1', InvoiceProcessingStage.ANALYZING);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('refuse une transition qui revient vers une étape antérieure', async () => {
    prisma.invoice.findUnique.mockResolvedValue({
      id: 'invoice-1',
      processingStage: InvoiceProcessingStage.ENRICHING,
      processingAttempt: 1,
      stageStartedAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      service.transition('invoice-1', InvoiceProcessingStage.UPLOADED),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('enregistre le code d’erreur et autorise la reprise', async () => {
    prisma.invoice.findUnique.mockResolvedValueOnce({
      id: 'invoice-1',
      processingStage: InvoiceProcessingStage.ANALYZING,
      processingAttempt: 1,
      stageStartedAt: new Date('2026-08-09T00:00:00.000Z'),
      updatedAt: new Date('2026-08-09T00:00:00.000Z'),
    });

    await service.transition('invoice-1', InvoiceProcessingStage.FAILED, {
      errorCode: 'PROVIDER_TIMEOUT',
    });

    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice-1' },
      data: expect.objectContaining({
        processingStage: InvoiceProcessingStage.FAILED,
        processingProgress: 0,
        processingErrorCode: 'PROVIDER_TIMEOUT',
        stageCompletedAt: expect.any(Date),
      }),
    });
    expect(tx.invoiceProcessingEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        stage: InvoiceProcessingStage.FAILED,
        status: InvoiceProcessingEventStatus.FAILED,
        errorCode: 'PROVIDER_TIMEOUT',
      }),
    });
  });
});
