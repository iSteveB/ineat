import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  InvoiceProcessingEventStatus,
  InvoiceProcessingStage,
} from '../../../prisma/generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const ALLOWED_TRANSITIONS: Record<
  InvoiceProcessingStage,
  readonly InvoiceProcessingStage[]
> = {
  UPLOADED: ['QUEUED', 'ANALYZING', 'FAILED'],
  QUEUED: ['EXTRACTING', 'ANALYZING', 'FAILED'],
  EXTRACTING: ['ANALYZING', 'FAILED'],
  ANALYZING: ['NORMALIZING', 'ENRICHING', 'FAILED'],
  NORMALIZING: ['ENRICHING', 'READY_FOR_REVIEW', 'FAILED'],
  ENRICHING: ['READY_FOR_REVIEW', 'FAILED'],
  READY_FOR_REVIEW: ['QUEUED', 'ANALYZING', 'VALIDATED', 'FAILED'],
  FAILED: ['QUEUED', 'ANALYZING'],
  VALIDATED: [],
};

const STAGE_PROGRESS: Record<InvoiceProcessingStage, number> = {
  UPLOADED: 10,
  QUEUED: 20,
  EXTRACTING: 35,
  ANALYZING: 50,
  NORMALIZING: 65,
  ENRICHING: 80,
  READY_FOR_REVIEW: 100,
  FAILED: 0,
  VALIDATED: 100,
};

interface TransitionOptions {
  attempt?: number;
  errorCode?: string | null;
}

@Injectable()
export class InvoiceProcessingStateService {
  constructor(private readonly prisma: PrismaService) {}

  async transition(
    invoiceId: string,
    targetStage: InvoiceProcessingStage,
    options: TransitionOptions = {},
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        processingStage: true,
        processingAttempt: true,
        stageStartedAt: true,
        updatedAt: true,
      },
    });

    if (!invoice) {
      throw new BadRequestException(
        'Facture introuvable pendant le traitement',
      );
    }

    if (invoice.processingStage === targetStage) {
      return invoice;
    }

    if (!ALLOWED_TRANSITIONS[invoice.processingStage].includes(targetStage)) {
      throw new BadRequestException(
        `Transition de facture invalide: ${invoice.processingStage} -> ${targetStage}`,
      );
    }

    const now = new Date();
    const startedAt = invoice.stageStartedAt ?? invoice.updatedAt;
    const durationMs = Math.max(0, now.getTime() - startedAt.getTime());
    const attempt = options.attempt ?? invoice.processingAttempt;
    const targetStatus = this.eventStatus(targetStage);
    const isTerminal = targetStatus !== InvoiceProcessingEventStatus.STARTED;

    return this.prisma.$transaction(async (tx) => {
      await tx.invoiceProcessingEvent.updateMany({
        where: {
          invoiceId,
          stage: invoice.processingStage,
          status: InvoiceProcessingEventStatus.STARTED,
        },
        data: {
          status:
            targetStage === InvoiceProcessingStage.FAILED
              ? InvoiceProcessingEventStatus.FAILED
              : InvoiceProcessingEventStatus.COMPLETED,
          completedAt: now,
          durationMs,
          errorCode: options.errorCode ?? null,
        },
      });

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          processingStage: targetStage,
          processingProgress: STAGE_PROGRESS[targetStage],
          processingAttempt: attempt,
          stageStartedAt: now,
          stageCompletedAt: isTerminal ? now : null,
          processingErrorCode: options.errorCode ?? null,
          updatedAt: now,
        },
      });

      await tx.invoiceProcessingEvent.create({
        data: {
          id: randomUUID(),
          invoiceId,
          stage: targetStage,
          status: targetStatus,
          attempt,
          startedAt: now,
          completedAt: isTerminal ? now : null,
          durationMs: isTerminal ? 0 : null,
          errorCode: options.errorCode ?? null,
        },
      });

      return updatedInvoice;
    });
  }

  private eventStatus(
    stage: InvoiceProcessingStage,
  ): InvoiceProcessingEventStatus {
    if (stage === InvoiceProcessingStage.FAILED) {
      return InvoiceProcessingEventStatus.FAILED;
    }

    if (
      stage === InvoiceProcessingStage.READY_FOR_REVIEW ||
      stage === InvoiceProcessingStage.VALIDATED
    ) {
      return InvoiceProcessingEventStatus.COMPLETED;
    }

    return InvoiceProcessingEventStatus.STARTED;
  }
}
