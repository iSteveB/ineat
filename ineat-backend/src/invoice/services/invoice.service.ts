import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InvoiceStatus } from '../../../prisma/generated/prisma/client';
import { UsageQuotaService } from '../../auth/services/usage-quota.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyzedInvoice,
  InvoiceAnalysisService,
} from './invoice-analysis.service';
import { InvoiceUploadService } from './invoice-upload.service';
import { UpdateInvoiceItemDto } from '../dto/update-invoice-item.dto';

export interface InvoiceUser {
  id: string;
  role?: string | null;
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  trialStartedAt?: Date | string | null;
  trialEndsAt?: Date | string | null;
  currentPeriodStartedAt?: Date | string | null;
  currentPeriodEndsAt?: Date | string | null;
}

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceUploadService: InvoiceUploadService,
    private readonly invoiceAnalysisService: InvoiceAnalysisService,
    private readonly usageQuotaService: UsageQuotaService,
  ) {}

  async importDriveInvoice(user: InvoiceUser, file: Express.Multer.File) {
    await this.usageQuotaService.assertCanConsume(user, 'DRIVE_IMPORT');

    const pdfUrl = await this.invoiceUploadService.uploadInvoicePdf(
      user.id,
      file,
    );
    const now = new Date();

    const invoice = await this.prisma.invoice.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        pdfUrl,
        status: InvoiceStatus.PROCESSING,
        updatedAt: now,
      },
    });

    try {
      const startedAt = Date.now();
      const analysis = await this.invoiceAnalysisService.analyzePdf(pdfUrl);
      const processingTime = Date.now() - startedAt;

      await this.completeInvoiceAnalysis(
        invoice.id,
        analysis,
        processingTime,
      );
      await this.usageQuotaService.recordSuccessfulUsage(
        user,
        'DRIVE_IMPORT',
      );

      return this.getInvoiceForUser(user.id, invoice.id);
    } catch (error) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.FAILED,
          errorMessage: "La facture n'a pas pu être analysée",
          updatedAt: new Date(),
        },
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException("La facture n'a pas pu être analysée");
    }
  }

  async getInvoiceForUser(userId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
      include: {
        InvoiceItem: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Facture non trouvée');
    }

    return this.formatInvoice(invoice);
  }

  async updateInvoiceItemForUser(
    userId: string,
    invoiceId: string,
    itemId: string,
    updateDto: UpdateInvoiceItemDto,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
      include: {
        InvoiceItem: {
          where: {
            id: itemId,
          },
          take: 1,
        },
      },
    });

    if (!invoice || invoice.InvoiceItem.length === 0) {
      throw new NotFoundException('Ligne de facture non trouvée');
    }

    const [invoiceItem] = invoice.InvoiceItem;

    if (invoiceItem.validated) {
      throw new BadRequestException(
        'Une ligne déjà validée ne peut plus être corrigée',
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (updateDto.detectedName !== undefined) {
      const detectedName = updateDto.detectedName.trim();

      if (!detectedName) {
        throw new BadRequestException('Le nom détecté est obligatoire');
      }

      updateData.detectedName = detectedName;
    }

    if (updateDto.quantity !== undefined) {
      updateData.quantity = updateDto.quantity;
    }

    if (updateDto.unitPrice !== undefined) {
      updateData.unitPrice = updateDto.unitPrice;
    }

    if (updateDto.totalPrice !== undefined) {
      updateData.totalPrice = updateDto.totalPrice;
    }

    if (updateDto.category !== undefined) {
      updateData.category = updateDto.category.trim() || null;
    }

    if (updateDto.productId !== undefined) {
      updateData.productId = updateDto.productId;
    }

    if (updateDto.expiryDate !== undefined) {
      updateData.expiryDate = new Date(updateDto.expiryDate);
    }

    if (updateDto.storageLocation !== undefined) {
      updateData.storageLocation = updateDto.storageLocation.trim() || null;
    }

    if (updateDto.notes !== undefined) {
      updateData.notes = updateDto.notes.trim() || null;
    }

    if (updateDto.selectedEan !== undefined) {
      updateData.selectedEan = updateDto.selectedEan;
    }

    const updatedItem = await this.prisma.invoiceItem.update({
      where: { id: itemId },
      data: updateData,
    });

    return this.formatInvoiceItem(updatedItem);
  }

  private async completeInvoiceAnalysis(
    invoiceId: string,
    analysis: AnalyzedInvoice,
    processingTime: number,
  ): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.COMPLETED,
          rawAnalysisData: analysis.rawData,
          merchantName: analysis.merchantName,
          totalAmount: analysis.totalAmount,
          purchaseDate: analysis.purchaseDate,
          invoiceNumber: analysis.invoiceNumber,
          orderNumber: analysis.orderNumber,
          analysisProvider: analysis.provider,
          analysisConfidence: analysis.confidence,
          processingTime,
          errorMessage: null,
          updatedAt: now,
        },
      });

      await tx.invoiceItem.createMany({
        data: analysis.items.map((item) => ({
          id: randomUUID(),
          invoiceId,
          detectedName: item.detectedName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          confidence: item.confidence,
          productCode: item.productCode,
          category: item.category,
          discount: item.discount,
          selectedEan: item.selectedEan,
          suggestedEans: item.suggestedEans ?? [],
          updatedAt: now,
        })),
      });
    });
  }

  private formatInvoice(invoice: any) {
    return {
      id: invoice.id,
      userId: invoice.userId,
      pdfUrl: invoice.pdfUrl,
      status: invoice.status,
      merchantName: invoice.merchantName,
      totalAmount: invoice.totalAmount,
      purchaseDate: invoice.purchaseDate?.toISOString() ?? null,
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: invoice.orderNumber,
      analysisProvider: invoice.analysisProvider,
      analysisConfidence: invoice.analysisConfidence,
      processingTime: invoice.processingTime,
      errorMessage: invoice.errorMessage,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      items: (invoice.InvoiceItem ?? []).map((item: any) =>
        this.formatInvoiceItem(item),
      ),
    };
  }

  private formatInvoiceItem(item: any) {
    return {
      id: item.id,
      invoiceId: item.invoiceId,
      productId: item.productId,
      detectedName: item.detectedName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      confidence: item.confidence,
      validated: item.validated,
      productCode: item.productCode,
      category: item.category,
      discount: item.discount,
      selectedEan: item.selectedEan,
      suggestedEans: item.suggestedEans,
      expiryDate: item.expiryDate?.toISOString() ?? null,
      storageLocation: item.storageLocation,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
