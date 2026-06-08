import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AnalyzedInvoiceItem,
  InvoiceExternalProductData,
  InvoiceExternalProductStatus,
} from './providers/invoice-analysis-provider';

interface OpenFoodFactsProductResponse {
  status?: number;
  status_verbose?: string;
  product?: OpenFoodFactsProduct;
}

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  product_name_en?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
  image_front_small_url?: string;
  selected_images?: {
    front?: {
      display?: Record<string, string>;
      small?: Record<string, string>;
      thumb?: Record<string, string>;
    };
  };
  categories_tags?: string[];
  categories_tags_fr?: string[];
  categories_tags_en?: string[];
  completeness?: number;
}

export interface OpenFoodFactsInvoiceEnrichmentResult {
  status: InvoiceExternalProductStatus;
  data?: InvoiceExternalProductData | null;
  error?: string | null;
}

const OPENFOODFACTS_PROVIDER = 'openfoodfacts';
const DEFAULT_OPENFOODFACTS_BASE_URL = 'https://world.openfoodfacts.org';
const DEFAULT_OPENFOODFACTS_TIMEOUT_MS = 5000;
const DEFAULT_OPENFOODFACTS_USER_AGENT =
  'Ineat/1.0 (invoice-import; contact=dev@ineat.app)';
const OPENFOODFACTS_FIELDS = [
  'code',
  'product_name',
  'product_name_fr',
  'product_name_en',
  'brands',
  'quantity',
  'image_front_url',
  'image_front_small_url',
  'selected_images',
  'categories_tags',
  'categories_tags_fr',
  'categories_tags_en',
  'completeness',
];

@Injectable()
export class OpenFoodFactsInvoiceEnrichmentService {
  private readonly logger = new Logger(
    OpenFoodFactsInvoiceEnrichmentService.name,
  );

  constructor(private readonly configService: ConfigService) {}

  async enrichItems(
    items: AnalyzedInvoiceItem[],
  ): Promise<AnalyzedInvoiceItem[]> {
    return Promise.all(items.map((item) => this.enrichItem(item)));
  }

  async enrichItem(item: AnalyzedInvoiceItem): Promise<AnalyzedInvoiceItem> {
    const barcode = this.getValidBarcode(item.selectedEan ?? item.productCode);

    if (!barcode) {
      return {
        ...item,
        externalProductProvider: OPENFOODFACTS_PROVIDER,
        externalProductStatus: 'SKIPPED',
        externalProductData: null,
        externalProductError: null,
      };
    }

    const result = await this.lookupBarcode(barcode);

    return {
      ...item,
      selectedEan: barcode,
      suggestedEans: this.mergeSuggestedEans(item.suggestedEans, [barcode]),
      externalProductProvider: OPENFOODFACTS_PROVIDER,
      externalProductStatus: result.status,
      externalProductData: result.data ?? null,
      externalProductError: result.error ?? null,
    };
  }

  async lookupBarcode(
    barcode: string,
  ): Promise<OpenFoodFactsInvoiceEnrichmentResult> {
    if (!this.getValidBarcode(barcode)) {
      return {
        status: 'SKIPPED',
        data: null,
        error: 'INVALID_BARCODE',
      };
    }

    try {
      const response = await this.fetchProduct(barcode);

      if (response.status === 0 || !response.product) {
        this.logLookupEvent({
          event: 'invoice_openfoodfacts_lookup_completed',
          barcode,
          status: 'NOT_FOUND',
        });

        return {
          status: 'NOT_FOUND',
          data: null,
          error: null,
        };
      }

      const data = this.mapProduct(barcode, response.product);
      const status: InvoiceExternalProductStatus = data.name
        ? 'FOUND'
        : 'INCOMPLETE';

      this.logLookupEvent({
        event: 'invoice_openfoodfacts_lookup_completed',
        barcode,
        status,
      });

      return {
        status,
        data,
        error: null,
      };
    } catch (error) {
      const errorCode = this.getErrorCode(error);

      this.logLookupEvent({
        event: 'invoice_openfoodfacts_lookup_failed',
        barcode,
        status: 'ERROR',
        error: errorCode,
      });

      return {
        status: 'ERROR',
        data: null,
        error: errorCode,
      };
    }
  }

  private async fetchProduct(
    barcode: string,
  ): Promise<OpenFoodFactsProductResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.getTimeoutMs(),
    );

    try {
      const response = await fetch(this.buildProductUrl(barcode), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': this.getUserAgent(),
        },
        signal: controller.signal,
      });

      if (response.status === 404) {
        return { status: 0, status_verbose: 'product not found' };
      }

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      return (await response.json()) as OpenFoodFactsProductResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildProductUrl(barcode: string): string {
    const baseUrl =
      this.configService.get<string>('OPENFOODFACTS_BASE_URL')?.trim() ||
      DEFAULT_OPENFOODFACTS_BASE_URL;
    const url = new URL(`/api/v2/product/${barcode}`, baseUrl);

    url.searchParams.set('fields', OPENFOODFACTS_FIELDS.join(','));
    url.searchParams.set('lc', 'fr');

    return url.toString();
  }

  private mapProduct(
    barcode: string,
    product: OpenFoodFactsProduct,
  ): InvoiceExternalProductData {
    const raw = this.pruneUndefined({
      code: product.code,
      product_name: product.product_name,
      product_name_fr: product.product_name_fr,
      product_name_en: product.product_name_en,
      brands: product.brands,
      quantity: product.quantity,
      image_front_url: product.image_front_url,
      image_front_small_url: product.image_front_small_url,
      categories_tags: product.categories_tags,
      categories_tags_fr: product.categories_tags_fr,
      categories_tags_en: product.categories_tags_en,
      completeness: product.completeness,
    });

    return this.pruneUndefined({
      source: OPENFOODFACTS_PROVIDER,
      barcode: product.code ?? barcode,
      name:
        product.product_name_fr ??
        product.product_name ??
        product.product_name_en ??
        null,
      brand: product.brands ?? null,
      quantity: product.quantity ?? null,
      imageUrl: this.selectImageUrl(product),
      categoriesTags:
        product.categories_tags_fr ??
        product.categories_tags ??
        product.categories_tags_en ??
        [],
      completeness: product.completeness ?? null,
      raw,
    }) as InvoiceExternalProductData;
  }

  private selectImageUrl(product: OpenFoodFactsProduct): string | null {
    return (
      product.selected_images?.front?.display?.fr ??
      product.selected_images?.front?.display?.en ??
      product.selected_images?.front?.small?.fr ??
      product.selected_images?.front?.small?.en ??
      product.image_front_url ??
      product.image_front_small_url ??
      null
    );
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

  private getTimeoutMs(): number {
    const configuredTimeout = Number(
      this.configService.get<string>('OPENFOODFACTS_TIMEOUT_MS'),
    );

    return Number.isFinite(configuredTimeout) && configuredTimeout > 0
      ? configuredTimeout
      : DEFAULT_OPENFOODFACTS_TIMEOUT_MS;
  }

  private getUserAgent(): string {
    return (
      this.configService.get<string>('OPENFOODFACTS_USER_AGENT')?.trim() ||
      DEFAULT_OPENFOODFACTS_USER_AGENT
    );
  }

  private getErrorCode(error: unknown): string {
    if (error instanceof Error) {
      return error.name === 'AbortError' ? 'TIMEOUT' : error.message;
    }

    return 'UNKNOWN_ERROR';
  }

  private pruneUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as T;
  }

  private logLookupEvent(event: Record<string, unknown>): void {
    this.logger.log(JSON.stringify(event));
  }
}
