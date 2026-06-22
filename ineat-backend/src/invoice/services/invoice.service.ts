import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { InvoiceStatus, Prisma } from '../../../prisma/generated/prisma/client';
import { UsageQuotaService } from '../../auth/services/usage-quota.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyzedInvoice,
  InvoiceAnalysisService,
} from './invoice-analysis.service';
import { InvoiceProductResolverService } from './invoice-product-resolver.service';
import { InvoiceUploadService } from './invoice-upload.service';
import { OpenFoodFactsInvoiceEnrichmentService } from './openfoodfacts-invoice-enrichment.service';
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
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceUploadService: InvoiceUploadService,
    private readonly invoiceAnalysisService: InvoiceAnalysisService,
    private readonly invoiceProductResolverService: InvoiceProductResolverService,
    private readonly openFoodFactsInvoiceEnrichmentService: OpenFoodFactsInvoiceEnrichmentService,
    private readonly usageQuotaService: UsageQuotaService,
  ) {}

  async importDriveInvoice(user: InvoiceUser, file: Express.Multer.File) {
    await this.usageQuotaService.assertCanConsume(user, 'DRIVE_IMPORT');

    let pdfUrl: string;

    try {
      pdfUrl = await this.invoiceUploadService.uploadInvoicePdf(user.id, file);
    } catch (error) {
      this.logInvoiceEvent({
        event: 'invoice_import_upload_failed',
        userId: user.id,
        status: InvoiceStatus.FAILED,
        error: error instanceof Error ? error.name : 'UnknownError',
      });

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException("La facture n'a pas pu être chargée");
    }

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
      const analysis = await this.invoiceAnalysisService.analyzePdf(
        pdfUrl,
        file.buffer,
      );
      const processingTime = Date.now() - startedAt;

      await this.completeInvoiceAnalysis(invoice.id, analysis, processingTime);
      await this.usageQuotaService.recordSuccessfulUsage(user, 'DRIVE_IMPORT');

      this.logInvoiceEvent({
        event: 'invoice_analysis_completed',
        invoiceId: invoice.id,
        userId: user.id,
        provider: analysis.provider,
        durationMs: processingTime,
        status: InvoiceStatus.COMPLETED,
        itemCount: analysis.items.length,
      });

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

      this.logInvoiceEvent({
        event: 'invoice_analysis_failed',
        invoiceId: invoice.id,
        userId: user.id,
        status: InvoiceStatus.FAILED,
        error: error instanceof Error ? error.name : 'UnknownError',
      });

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
    } else if (
      updateDto.quantity !== undefined ||
      updateDto.unitPrice !== undefined
    ) {
      const quantity = updateDto.quantity ?? invoiceItem.quantity;
      const unitPrice = updateDto.unitPrice ?? invoiceItem.unitPrice;

      if (typeof unitPrice === 'number') {
        updateData.totalPrice = Math.round(quantity * unitPrice * 100) / 100;
      }
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
      throw new BadRequestException("La facture est encore en cours d'analyse");
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
          const existingExpense = await tx.expense.findUnique({
            where: { invoiceItemId: item.id },
          });

          if (!existingExpense) {
            const repairedExpense = await this.createExpenseForInvoiceItem(
              tx,
              userId,
              invoiceId,
              item,
              purchaseDate,
            );

            if (repairedExpense) {
              summary.expenseCount += 1;
              summary.totalBudgetAmount += repairedExpense.amount;
            }
          }

          summary.skippedItemCount += 1;
          continue;
        }

        const product = await this.resolveProductForInvoiceItem(tx, item);
        const now = new Date();
        const existingExpense = await tx.expense.findUnique({
          where: { invoiceItemId: item.id },
        });

        if (existingExpense) {
          await tx.invoiceItem.update({
            where: { id: item.id },
            data: {
              productId: product.id,
              validated: true,
              updatedAt: now,
            },
          });
          summary.skippedItemCount += 1;
          continue;
        }

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
    const enrichedItems =
      await this.openFoodFactsInvoiceEnrichmentService.enrichItems(
        analysis.items,
      );

    await this.prisma.$transaction(async (tx) => {
      const resolvedItems =
        await this.invoiceProductResolverService.resolveItems(
          tx,
          enrichedItems,
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
          storageLocation: item.storageLocation,
          discount: item.discount,
          selectedEan: item.selectedEan,
          suggestedEans: item.suggestedEans ?? [],
          externalProductProvider: item.externalProductProvider,
          externalProductStatus: item.externalProductStatus,
          externalProductData: item.externalProductData
            ? (item.externalProductData as unknown as Prisma.InputJsonValue)
            : undefined,
          externalProductError: item.externalProductError,
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

      return this.enrichExistingProductFromInvoiceItem(tx, product, item);
    }

    const barcode = this.getValidBarcode(item.selectedEan ?? item.productCode);

    if (barcode) {
      const productByBarcode = await tx.product.findUnique({
        where: { barcode },
        include: { Category: true },
      });

      if (productByBarcode) {
        return this.enrichExistingProductFromInvoiceItem(
          tx,
          productByBarcode,
          item,
        );
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
      return this.enrichExistingProductFromInvoiceItem(
        tx,
        existingProduct,
        item,
      );
    }

    const externalProductData = this.getInvoiceExternalProductData(item);
    const productName =
      this.getNonEmptyString(externalProductData?.name) ?? item.detectedName;

    return tx.product.create({
      data: {
        id: randomUUID(),
        name: productName,
        brand: this.getNonEmptyString(externalProductData?.brand),
        barcode,
        categoryId: category.id,
        unitType: 'UNIT',
        nutriscore: this.normalizeScore(externalProductData?.nutriscore),
        ecoscore: this.normalizeScore(externalProductData?.ecoscore),
        novascore: this.normalizeNovaScore(externalProductData?.novascore),
        ingredients: this.getNonEmptyString(externalProductData?.ingredients),
        imageUrl: this.getNonEmptyString(externalProductData?.imageUrl),
        externalId:
          this.getNonEmptyString(externalProductData?.barcode) ?? barcode,
        nutrients: externalProductData?.nutrients
          ? (externalProductData.nutrients as Prisma.InputJsonValue)
          : undefined,
        updatedAt: new Date(),
      },
      include: { Category: true },
    });
  }

  private async enrichExistingProductFromInvoiceItem(
    tx: any,
    product: any,
    item: any,
  ) {
    const externalProductData = this.getInvoiceExternalProductData(item);
    const barcode = this.getValidBarcode(
      externalProductData?.barcode ?? item.selectedEan ?? item.productCode,
    );
    const updateData: Record<string, unknown> = {};

    this.setIfPresent(updateData, 'barcode', barcode);
    this.setIfPresent(
      updateData,
      'name',
      this.getNonEmptyString(externalProductData?.name),
    );
    this.setIfPresent(
      updateData,
      'brand',
      this.getNonEmptyString(externalProductData?.brand),
    );
    this.setIfPresent(
      updateData,
      'nutriscore',
      this.normalizeScore(externalProductData?.nutriscore),
    );
    this.setIfPresent(
      updateData,
      'ecoscore',
      this.normalizeScore(externalProductData?.ecoscore),
    );
    this.setIfPresent(
      updateData,
      'novascore',
      this.normalizeNovaScore(externalProductData?.novascore),
    );
    this.setIfPresent(
      updateData,
      'ingredients',
      this.getNonEmptyString(externalProductData?.ingredients),
    );
    this.setIfPresent(
      updateData,
      'imageUrl',
      this.getNonEmptyString(externalProductData?.imageUrl),
    );
    this.setIfPresent(
      updateData,
      'externalId',
      this.getNonEmptyString(externalProductData?.barcode) ?? barcode,
    );

    if (externalProductData?.nutrients) {
      updateData.nutrients =
        externalProductData.nutrients as Prisma.InputJsonValue;
    }

    if (Object.keys(updateData).length === 0) {
      return product;
    }

    return tx.product.update({
      where: { id: product.id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      include: { Category: true },
    });
  }

  private setIfPresent(
    updateData: Record<string, unknown>,
    key: string,
    value: unknown,
  ): void {
    if (value !== null && value !== undefined && value !== '') {
      updateData[key] = value;
    }
  }

  private getInvoiceExternalProductData(item: any): Record<string, any> | null {
    const externalProductData = item.externalProductData;

    if (!externalProductData || typeof externalProductData !== 'object') {
      return null;
    }

    const data = externalProductData as Record<string, any>;
    const raw =
      data.raw && typeof data.raw === 'object'
        ? (data.raw as Record<string, any>)
        : {};
    const barcode =
      this.getNonEmptyString(data.barcode) ?? this.getNonEmptyString(raw.code);
    const name =
      this.getNonEmptyString(data.name) ??
      this.getNonEmptyString(raw.product_name_fr) ??
      this.getNonEmptyString(raw.product_name) ??
      this.getNonEmptyString(raw.product_name_en);
    const brand =
      this.getNonEmptyString(data.brand) ?? this.getNonEmptyString(raw.brands);
    const imageUrl =
      this.getNonEmptyString(data.imageUrl) ??
      this.getNonEmptyString(raw.image_front_url) ??
      this.getNonEmptyString(raw.image_front_small_url);
    const ingredients =
      this.getNonEmptyString(data.ingredients) ??
      this.getNonEmptyString(raw.ingredients_text_fr) ??
      this.getNonEmptyString(raw.ingredients_text) ??
      this.getNonEmptyString(raw.ingredients_text_en);
    const nutrients =
      data.nutrients && typeof data.nutrients === 'object'
        ? data.nutrients
        : this.mapOpenFoodFactsNutrients(raw.nutriments);

    const normalizedData = {
      barcode,
      name,
      brand,
      imageUrl,
      nutriscore: this.normalizeScore(
        data.nutriscore ?? raw.nutriscore_grade,
      ),
      ecoscore: this.normalizeScore(data.ecoscore ?? raw.ecoscore_grade),
      novascore: this.normalizeNovaScore(data.novascore ?? raw.nova_group),
      ingredients,
      nutrients,
    };

    return Object.values(normalizedData).some(
      (value) => value !== null && value !== undefined && value !== '',
    )
      ? normalizedData
      : null;
  }

  private getNonEmptyString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private normalizeScore(
    value: unknown,
  ): 'A' | 'B' | 'C' | 'D' | 'E' | undefined {
    const score = typeof value === 'string' ? value.trim().toUpperCase() : '';

    return ['A', 'B', 'C', 'D', 'E'].includes(score)
      ? (score as 'A' | 'B' | 'C' | 'D' | 'E')
      : undefined;
  }

  private normalizeNovaScore(
    value: unknown,
  ): 'GROUP_1' | 'GROUP_2' | 'GROUP_3' | 'GROUP_4' | undefined {
    const score =
      typeof value === 'number'
        ? `GROUP_${value}`
        : typeof value === 'string'
          ? value.trim().toUpperCase()
          : '';
    const normalizedScore = ['1', '2', '3', '4'].includes(score)
      ? `GROUP_${score}`
      : score;

    return ['GROUP_1', 'GROUP_2', 'GROUP_3', 'GROUP_4'].includes(
      normalizedScore,
    )
      ? (normalizedScore as 'GROUP_1' | 'GROUP_2' | 'GROUP_3' | 'GROUP_4')
      : undefined;
  }

  private mapOpenFoodFactsNutrients(
    nutriments: unknown,
  ): Record<string, number> | undefined {
    if (!nutriments || typeof nutriments !== 'object') {
      return undefined;
    }

    const source = nutriments as Record<string, unknown>;
    const nutrients = this.pruneUndefined({
      energy: this.getNumericField(source, [
        'energy-kcal_100g',
        'energy_kcal_100g',
      ]),
      carbohydrates: this.getNumericField(source, ['carbohydrates_100g']),
      sugars: this.getNumericField(source, ['sugars_100g']),
      proteins: this.getNumericField(source, ['proteins_100g']),
      fats: this.getNumericField(source, ['fat_100g']),
      saturatedFats: this.getNumericField(source, ['saturated-fat_100g']),
      fiber: this.getNumericField(source, ['fiber_100g']),
      salt: this.getNumericField(source, ['salt_100g']),
    });

    return Object.keys(nutrients).length > 0
      ? (nutrients as Record<string, number>)
      : undefined;
  }

  private getNumericField(
    source: Record<string, unknown>,
    keys: string[],
  ): number | undefined {
    for (const key of keys) {
      const value = source[key];
      const numericValue =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number(value)
            : NaN;

      if (Number.isFinite(numericValue)) {
        return numericValue;
      }
    }

    return undefined;
  }

  private pruneUndefined(value: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
    );
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

    const budget = await this.findOrCreateBudgetForInvoiceExpense(
      tx,
      userId,
      purchaseDate,
    );

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

  private async findOrCreateBudgetForInvoiceExpense(
    tx: any,
    userId: string,
    purchaseDate: Date,
  ) {
    const existingBudget = await tx.budget.findFirst({
      where: {
        userId,
        isActive: true,
        periodStart: { lte: purchaseDate },
        periodEnd: { gte: purchaseDate },
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    if (existingBudget) {
      return existingBudget;
    }

    const lastActiveBudget = await tx.budget.findFirst({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        periodStart: 'desc',
      },
    });

    if (!lastActiveBudget) {
      return null;
    }

    const periodStart = new Date(
      purchaseDate.getFullYear(),
      purchaseDate.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const periodEnd = new Date(
      purchaseDate.getFullYear(),
      purchaseDate.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    await tx.budget.updateMany({
      where: {
        userId,
        OR: [
          {
            periodStart: { gte: periodStart, lte: periodEnd },
          },
          {
            periodEnd: { gte: periodStart, lte: periodEnd },
          },
          {
            AND: [
              { periodStart: { lte: periodStart } },
              { periodEnd: { gte: periodEnd } },
            ],
          },
        ],
      },
      data: {
        isActive: false,
      },
    });

    return tx.budget.create({
      data: {
        id: randomUUID(),
        userId,
        amount: lastActiveBudget.amount,
        periodStart,
        periodEnd,
        isActive: true,
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
      externalProductProvider: item.externalProductProvider,
      externalProductStatus: item.externalProductStatus,
      externalProductData: item.externalProductData,
      externalProductError: item.externalProductError,
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

  private logInvoiceEvent(event: Record<string, unknown>) {
    this.logger.log(JSON.stringify(event));
  }
}
