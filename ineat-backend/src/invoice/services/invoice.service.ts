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
import { InvoiceProductResolverService } from './invoice-product-resolver.service';
import { InvoiceUploadService } from './invoice-upload.service';
import { UpdateInvoiceItemDto } from '../dto/update-invoice-item.dto';
import { ValidateInvoiceDto } from '../dto/validate-invoice.dto';

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
    private readonly invoiceProductResolverService: InvoiceProductResolverService,
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
          include: {
            Product: {
              include: {
                Category: true,
              },
            },
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
          include: {
            Product: {
              include: {
                Category: true,
              },
            },
          },
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
      include: {
        Product: {
          include: {
            Category: true,
          },
        },
      },
    });

    return this.formatInvoiceItem(updatedItem);
  }

  async validateInvoiceForUser(
    userId: string,
    invoiceId: string,
    validateDto: ValidateInvoiceDto,
  ) {
    const uniqueItemIds = Array.from(new Set(validateDto.invoiceItemIds));
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
      include: {
        InvoiceItem: {
          where: {
            id: {
              in: uniqueItemIds,
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Facture non trouvée');
    }

    if (invoice.status === InvoiceStatus.PROCESSING) {
      throw new BadRequestException(
        "La facture est encore en cours d'analyse",
      );
    }

    if (invoice.status === InvoiceStatus.FAILED) {
      throw new BadRequestException(
        "Une facture en échec d'analyse ne peut pas être validée",
      );
    }

    if (invoice.InvoiceItem.length !== uniqueItemIds.length) {
      throw new NotFoundException('Une ou plusieurs lignes sont introuvables');
    }

    const purchaseDate = invoice.purchaseDate ?? invoice.createdAt;

    return this.prisma.$transaction(async (tx) => {
      const summary = {
        success: true,
        invoiceId,
        validatedItemCount: 0,
        skippedItemCount: 0,
        inventoryItemCount: 0,
        expenseCount: 0,
        totalBudgetAmount: 0,
        message: 'Lignes de facture validées avec succès',
      };

      for (const item of invoice.InvoiceItem) {
        if (item.validated) {
          summary.skippedItemCount += 1;
          continue;
        }

        const product = await this.resolveProductForInvoiceItem(tx, item);
        const now = new Date();

        await tx.inventoryItem.create({
          data: {
            id: randomUUID(),
            userId,
            productId: product.id,
            quantity: item.quantity,
            purchaseDate,
            expiryDate: item.expiryDate,
            purchasePrice: item.totalPrice,
            storageLocation: item.storageLocation,
            notes: item.notes,
            updatedAt: now,
          },
        });
        summary.inventoryItemCount += 1;

        const expense = await this.createExpenseForInvoiceItem(
          tx,
          userId,
          invoiceId,
          item,
          purchaseDate,
        );

        if (expense) {
          summary.expenseCount += 1;
          summary.totalBudgetAmount += expense.amount;
        }

        await tx.invoiceItem.update({
          where: { id: item.id },
          data: {
            productId: product.id,
            validated: true,
            updatedAt: now,
          },
        });
        summary.validatedItemCount += 1;
      }

      const [totalItemCount, totalValidatedItemCount] = await Promise.all([
        tx.invoiceItem.count({
          where: { invoiceId },
        }),
        tx.invoiceItem.count({
          where: {
            invoiceId,
            validated: true,
          },
        }),
      ]);

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          status:
            totalItemCount > 0 && totalItemCount === totalValidatedItemCount
              ? InvoiceStatus.VALIDATED
              : invoice.status,
          updatedAt: new Date(),
        },
      });

      return summary;
    });
  }

  private async completeInvoiceAnalysis(
    invoiceId: string,
    analysis: AnalyzedInvoice,
    processingTime: number,
  ): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const resolvedItems =
        await this.invoiceProductResolverService.resolveItems(
          tx,
          analysis.items,
        );

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
        data: resolvedItems.map((item) => ({
          id: randomUUID(),
          invoiceId,
          productId: item.productId,
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

  private async resolveProductForInvoiceItem(tx: any, item: any) {
    if (item.productId) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        include: { Category: true },
      });

      if (!product) {
        throw new NotFoundException('Produit associé introuvable');
      }

      return product;
    }

    const barcode = this.getValidBarcode(item.selectedEan ?? item.productCode);

    if (barcode) {
      const productByBarcode = await tx.product.findUnique({
        where: { barcode },
        include: { Category: true },
      });

      if (productByBarcode) {
        return productByBarcode;
      }
    }

    if (!item.category) {
      throw new BadRequestException(
        `La catégorie est requise pour "${item.detectedName}"`,
      );
    }

    const category = await tx.category.findFirst({
      where: { slug: item.category },
    });

    if (!category) {
      throw new BadRequestException(
        `La catégorie "${item.category}" n'existe pas`,
      );
    }

    const existingProduct = await tx.product.findFirst({
      where: {
        name: {
          equals: item.detectedName,
          mode: 'insensitive',
        },
        brand: null,
        categoryId: category.id,
        ...(barcode ? { barcode: null } : {}),
      },
      include: { Category: true },
    });

    if (existingProduct) {
      if (barcode && !existingProduct.barcode) {
        return tx.product.update({
          where: { id: existingProduct.id },
          data: { barcode },
          include: { Category: true },
        });
      }

      return existingProduct;
    }

    return tx.product.create({
      data: {
        id: randomUUID(),
        name: item.detectedName,
        barcode,
        categoryId: category.id,
        unitType: 'UNIT',
        updatedAt: new Date(),
      },
      include: { Category: true },
    });
  }

  private async createExpenseForInvoiceItem(
    tx: any,
    userId: string,
    invoiceId: string,
    item: any,
    purchaseDate: Date,
  ) {
    if (!item.totalPrice || item.totalPrice <= 0) {
      return null;
    }

    const budget = await tx.budget.findFirst({
      where: {
        userId,
        isActive: true,
        periodStart: { lte: purchaseDate },
        periodEnd: { gte: purchaseDate },
      },
    });

    if (!budget) {
      return null;
    }

    return tx.expense.create({
      data: {
        id: randomUUID(),
        userId,
        budgetId: budget.id,
        amount: item.totalPrice,
        date: purchaseDate,
        source: 'Facture Drive',
        category: item.category,
        notes: item.detectedName,
        invoiceId,
        invoiceItemId: item.id,
        updatedAt: new Date(),
      },
    });
  }

  private getValidBarcode(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return /^\d{8,13}$/.test(trimmed) ? trimmed : null;
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
      product: item.Product
        ? {
            id: item.Product.id,
            name: item.Product.name,
            brand: item.Product.brand,
            barcode: item.Product.barcode,
            category: item.Product.Category
              ? {
                  id: item.Product.Category.id,
                  name: item.Product.Category.name,
                  slug: item.Product.Category.slug,
                  icon: item.Product.Category.icon,
                }
              : null,
          }
        : null,
      expiryDate: item.expiryDate?.toISOString() ?? null,
      storageLocation: item.storageLocation,
      notes: item.notes,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
