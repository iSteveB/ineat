import { Injectable } from '@nestjs/common';
import { AnalyzedInvoiceItem } from './invoice-analysis.service';

export interface ResolvedInvoiceItem extends AnalyzedInvoiceItem {
  productId?: string | null;
}

const AUTO_MATCH_CONFIDENCE_THRESHOLD = 0.85;

@Injectable()
export class InvoiceProductResolverService {
  async resolveItems(
    tx: any,
    items: AnalyzedInvoiceItem[],
  ): Promise<ResolvedInvoiceItem[]> {
    return Promise.all(items.map((item) => this.resolveItem(tx, item)));
  }

  private async resolveItem(
    tx: any,
    item: AnalyzedInvoiceItem,
  ): Promise<ResolvedInvoiceItem> {
    const barcode = this.getValidBarcode(item.selectedEan ?? item.productCode);

    if (barcode) {
      const productByBarcode = await tx.product.findUnique({
        where: { barcode },
      });

      if (productByBarcode) {
        return {
          ...item,
          productId: productByBarcode.id,
          selectedEan: barcode,
          suggestedEans: this.mergeSuggestedEans(item.suggestedEans, [barcode]),
        };
      }
    }

    const candidates = await this.findNameCandidates(tx, item);
    const suggestedEans = this.mergeSuggestedEans(
      item.suggestedEans,
      candidates.map((candidate: any) => candidate.barcode),
    );

    if (
      candidates.length === 1 &&
      item.confidence >= AUTO_MATCH_CONFIDENCE_THRESHOLD
    ) {
      const [candidate] = candidates;

      return {
        ...item,
        productId: candidate.id,
        selectedEan: candidate.barcode ?? item.selectedEan,
        suggestedEans,
      };
    }

    return {
      ...item,
      suggestedEans,
    };
  }

  private async findNameCandidates(tx: any, item: AnalyzedInvoiceItem) {
    const detectedName = item.detectedName.trim();

    if (detectedName.length < 2) {
      return [];
    }

    const category = item.category
      ? await tx.category.findFirst({
          where: { slug: item.category },
        })
      : null;

    const products = await tx.product.findMany({
      where: {
        ...(category ? { categoryId: category.id } : {}),
        OR: [
          {
            name: {
              equals: detectedName,
              mode: 'insensitive',
            },
          },
          {
            name: {
              startsWith: detectedName,
              mode: 'insensitive',
            },
          },
          {
            name: {
              contains: detectedName,
              mode: 'insensitive',
            },
          },
        ],
      },
      orderBy: [{ name: 'asc' }],
      take: 5,
    });

    return products.filter(
      (product: any) => this.scoreProduct(product, item) >= 0.75,
    );
  }

  private scoreProduct(product: any, item: AnalyzedInvoiceItem): number {
    const productName = product.name.toLowerCase();
    const detectedName = item.detectedName.trim().toLowerCase();

    if (productName === detectedName) {
      return 0.95;
    }

    if (productName.startsWith(detectedName)) {
      return 0.85;
    }

    if (productName.includes(detectedName)) {
      return 0.75;
    }

    return 0;
  }

  private mergeSuggestedEans(
    current: string[] | undefined,
    candidates: Array<string | null | undefined>,
  ): string[] {
    return Array.from(
      new Set([
        ...(current ?? []),
        ...candidates.filter((candidate): candidate is string =>
          this.isValidBarcode(candidate),
        ),
      ]),
    );
  }

  private getValidBarcode(value?: string | null): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return this.isValidBarcode(trimmed) ? trimmed : null;
  }

  private isValidBarcode(value?: string | null): value is string {
    return Boolean(value && /^\d{8,13}$/.test(value));
  }
}
