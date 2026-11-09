import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import {
  AnalyzedInvoiceItem,
  InvoiceExternalProductData,
  InvoiceExternalProductStatus,
} from './providers/invoice-analysis-provider';
import {
  normalizeInvoiceCategory,
  suggestInvoiceStorageLocation,
} from './invoice-product-classification';
import {
  LocalOpenFoodFactsProduct,
  OpenFoodFactsLocalRepository,
} from '../../openfoodfacts/openfoodfacts-local.repository';

interface OpenFoodFactsProductResponse {
  status?: number;
  status_verbose?: string;
  product?: OpenFoodFactsProduct;
}

interface OpenFoodFactsProduct extends LocalOpenFoodFactsProduct {
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
  nutriscore_grade?: string;
  ecoscore_grade?: string;
  nova_group?: number | string;
  ingredients_text?: string;
  ingredients_text_fr?: string;
  ingredients_text_en?: string;
  nutriments?: Record<string, unknown>;
  completeness?: number;
}

export interface OpenFoodFactsInvoiceEnrichmentResult {
  status: InvoiceExternalProductStatus;
  data?: InvoiceExternalProductData | null;
  error?: string | null;
}

const OPENFOODFACTS_PROVIDER = 'openfoodfacts';
const OPENFOODFACTS_CACHE_SCHEMA = 'v1';
const DEFAULT_OPENFOODFACTS_BASE_URL = 'https://world.openfoodfacts.org';
const DEFAULT_OPENFOODFACTS_TIMEOUT_MS = 5000;
const DEFAULT_OPENFOODFACTS_CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_OPENFOODFACTS_NEGATIVE_CACHE_TTL_SECONDS = 6 * 60 * 60;
const DEFAULT_OPENFOODFACTS_CONCURRENCY = 4;
const DEFAULT_OPENFOODFACTS_USER_AGENT =
  'Ineat/1.0 (invoice-import; contact=dev@ineat.app)';
const DEFAULT_OPENFOODFACTS_REMOTE_INTERVAL_MS = 4200;
const DEFAULT_OPENFOODFACTS_REMOTE_MAX_WAIT_MS = 5000;
const DEFAULT_OPENFOODFACTS_REMOTE_ATTEMPTS = 3;
const OPENFOODFACTS_REMOTE_LIMIT_KEY = 'openfoodfacts:remote-read-slot:v1';
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
  'nutriscore_grade',
  'ecoscore_grade',
  'nova_group',
  'ingredients_text',
  'ingredients_text_fr',
  'ingredients_text_en',
  'nutriments',
  'completeness',
];

@Injectable()
export class OpenFoodFactsInvoiceEnrichmentService {
  private readonly logger = new Logger(
    OpenFoodFactsInvoiceEnrichmentService.name,
  );

  private readonly inFlightLookups = new Map<
    string,
    Promise<OpenFoodFactsInvoiceEnrichmentResult>
  >();

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly localRepository: OpenFoodFactsLocalRepository,
  ) {}

  async enrichItems(
    items: AnalyzedInvoiceItem[],
  ): Promise<AnalyzedInvoiceItem[]> {
    const results = new Array<AnalyzedInvoiceItem>(items.length);
    const concurrency = this.getConcurrency();
    let cursor = 0;

    const worker = async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await this.enrichItem(items[index]);
      }
    };

    await Promise.all(
      Array.from({ length: Math.min(concurrency, items.length) }, worker),
    );
    return results;
  }

  async enrichItem(item: AnalyzedInvoiceItem): Promise<AnalyzedInvoiceItem> {
    const barcode = this.getFirstValidBarcode(
      item.selectedEan,
      item.productCode,
    );

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
    const category = normalizeInvoiceCategory(
      item.category,
      ...(result.data?.categoriesTags ?? []),
      result.data?.name,
      item.detectedName,
    );

    return {
      ...item,
      category,
      storageLocation:
        item.storageLocation ??
        suggestInvoiceStorageLocation({
          category,
          name: result.data?.name ?? item.detectedName,
        }),
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

    const cached = await this.readCache(barcode);
    if (cached) {
      this.logLookupEvent({
        event: 'invoice_openfoodfacts_cache_hit',
        barcode,
        status: cached.status,
      });
      return cached;
    }

    const inFlight = this.inFlightLookups.get(barcode);
    if (inFlight) return inFlight;

    const lookup = this.lookupAndCache(barcode).finally(() => {
      this.inFlightLookups.delete(barcode);
    });
    this.inFlightLookups.set(barcode, lookup);
    return lookup;
  }

  private async lookupAndCache(
    barcode: string,
  ): Promise<OpenFoodFactsInvoiceEnrichmentResult> {
    try {
      const startedAt = Date.now();
      const localProduct = await this.localRepository.findByBarcode(barcode);
      if (localProduct) {
        const result = this.createFoundResult(barcode, localProduct);
        this.logLookupEvent({
          event: 'invoice_openfoodfacts_local_lookup_completed',
          barcode,
          status: result.status,
          durationMs: Date.now() - startedAt,
        });
        await this.writeCache(barcode, result, false);
        return result;
      }

      const response = await this.fetchProduct(barcode);

      if (response.status === 0 || !response.product) {
        this.logLookupEvent({
          event: 'invoice_openfoodfacts_lookup_completed',
          barcode,
          status: 'NOT_FOUND',
        });

        const result: OpenFoodFactsInvoiceEnrichmentResult = {
          status: 'NOT_FOUND',
          data: null,
          error: null,
        };
        await this.writeCache(barcode, result, true);
        return result;
      }

      const result = this.createFoundResult(barcode, response.product);

      this.logLookupEvent({
        event: 'invoice_openfoodfacts_lookup_completed',
        barcode,
        status: result.status,
        durationMs: Date.now() - startedAt,
      });

      await this.writeCache(barcode, result, false);
      return result;
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

  private createFoundResult(
    barcode: string,
    product: OpenFoodFactsProduct,
  ): OpenFoodFactsInvoiceEnrichmentResult {
    const data = this.mapProduct(barcode, product);
    return {
      status: data.name ? 'FOUND' : 'INCOMPLETE',
      data,
      error: null,
    };
  }

  private async readCache(
    barcode: string,
  ): Promise<OpenFoodFactsInvoiceEnrichmentResult | null> {
    try {
      const value = await this.redis
        .producerConnection()
        .get(this.cacheKey(barcode));
      return value
        ? (JSON.parse(value) as OpenFoodFactsInvoiceEnrichmentResult)
        : null;
    } catch {
      this.logLookupEvent({ event: 'invoice_openfoodfacts_cache_error' });
      return null;
    }
  }

  private async writeCache(
    barcode: string,
    result: OpenFoodFactsInvoiceEnrichmentResult,
    negative: boolean,
  ): Promise<void> {
    try {
      await this.redis
        .producerConnection()
        .set(
          this.cacheKey(barcode),
          JSON.stringify(result),
          'EX',
          negative ? this.getNegativeCacheTtl() : this.getCacheTtl(),
        );
    } catch {
      this.logLookupEvent({ event: 'invoice_openfoodfacts_cache_error' });
    }
  }

  private cacheKey(barcode: string): string {
    return `invoice:openfoodfacts:${OPENFOODFACTS_CACHE_SCHEMA}:${barcode}`;
  }

  private async fetchProduct(
    barcode: string,
  ): Promise<OpenFoodFactsProductResponse> {
    const attempts = Math.min(
      3,
      this.getPositiveConfig(
        'OPENFOODFACTS_REMOTE_ATTEMPTS',
        DEFAULT_OPENFOODFACTS_REMOTE_ATTEMPTS,
      ),
    );

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      if (this.localRepository.isConfigured()) {
        await this.acquireRemoteReadSlot();
      }

      const response = await this.performProductFetch(barcode);
      if (response.status === 404) {
        return { status: 0, status_verbose: 'product not found' };
      }
      if (response.ok) {
        return (await response.json()) as OpenFoodFactsProductResponse;
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === attempts) {
        throw new Error(`HTTP_${response.status}`);
      }
      await this.waitBeforeRetry(response, attempt);
    }

    throw new Error('OFF_REMOTE_RETRY_EXHAUSTED');
  }

  private async performProductFetch(barcode: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.getTimeoutMs());

    try {
      return await fetch(this.buildProductUrl(barcode), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': this.getUserAgent(),
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async waitBeforeRetry(
    response: Response,
    attempt: number,
  ): Promise<void> {
    const retryAfter = response.headers?.get?.('retry-after');
    const retryAfterSeconds = retryAfter === null ? NaN : Number(retryAfter);
    const delayMs = Number.isFinite(retryAfterSeconds)
      ? Math.max(0, retryAfterSeconds * 1000)
      : Math.min(
          5000,
          250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 150),
        );
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  private buildProductUrl(barcode: string): string {
    const baseUrl =
      this.configService.get<string>('OPENFOODFACTS_BASE_URL')?.trim() ||
      DEFAULT_OPENFOODFACTS_BASE_URL;
    const url = new URL(`/api/v3.6/product/${barcode}.json`, baseUrl);

    url.searchParams.set('fields', OPENFOODFACTS_FIELDS.join(','));
    url.searchParams.set('lc', 'fr');

    return url.toString();
  }

  private async acquireRemoteReadSlot(): Promise<void> {
    const connection = this.redis.producerConnection();
    const intervalMs = this.getPositiveConfig(
      'OPENFOODFACTS_REMOTE_INTERVAL_MS',
      DEFAULT_OPENFOODFACTS_REMOTE_INTERVAL_MS,
    );
    const maxWaitMs = this.getPositiveConfig(
      'OPENFOODFACTS_REMOTE_MAX_WAIT_MS',
      DEFAULT_OPENFOODFACTS_REMOTE_MAX_WAIT_MS,
    );
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() <= deadline) {
      const acquired = await connection.set(
        OPENFOODFACTS_REMOTE_LIMIT_KEY,
        String(Date.now()),
        'PX',
        intervalMs,
        'NX',
      );
      if (acquired === 'OK') return;

      const remaining = await connection.pttl(OPENFOODFACTS_REMOTE_LIMIT_KEY);
      const waitMs = Math.max(
        50,
        Math.min(remaining > 0 ? remaining : 250, deadline - Date.now()),
      );
      if (waitMs <= 0) break;
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    throw new Error('OFF_REMOTE_RATE_LIMITED');
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
      selected_images: product.selected_images,
      categories_tags: product.categories_tags,
      categories_tags_fr: product.categories_tags_fr,
      categories_tags_en: product.categories_tags_en,
      nutriscore_grade: product.nutriscore_grade,
      ecoscore_grade: product.ecoscore_grade,
      nova_group: product.nova_group,
      ingredients_text: product.ingredients_text,
      ingredients_text_fr: product.ingredients_text_fr,
      ingredients_text_en: product.ingredients_text_en,
      nutriments: product.nutriments,
      completeness: product.completeness,
      last_modified_t: product.last_modified_t,
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
      nutriscore: this.normalizeScore(product.nutriscore_grade),
      ecoscore: this.normalizeScore(product.ecoscore_grade),
      novascore: this.normalizeNovaScore(product.nova_group),
      ingredients:
        product.ingredients_text_fr ??
        product.ingredients_text ??
        product.ingredients_text_en ??
        null,
      nutrients: this.mapNutrients(product.nutriments),
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

  private normalizeScore(value?: string): 'A' | 'B' | 'C' | 'D' | 'E' | null {
    const score = value?.trim().toUpperCase();

    return score && ['A', 'B', 'C', 'D', 'E'].includes(score)
      ? (score as 'A' | 'B' | 'C' | 'D' | 'E')
      : null;
  }

  private normalizeNovaScore(
    value?: number | string,
  ): 'GROUP_1' | 'GROUP_2' | 'GROUP_3' | 'GROUP_4' | null {
    const normalizedValue = String(value ?? '').trim();

    return ['1', '2', '3', '4'].includes(normalizedValue)
      ? (`GROUP_${normalizedValue}` as
          | 'GROUP_1'
          | 'GROUP_2'
          | 'GROUP_3'
          | 'GROUP_4')
      : null;
  }

  private mapNutrients(
    nutriments?: Record<string, unknown>,
  ): InvoiceExternalProductData['nutrients'] {
    if (!nutriments) {
      return null;
    }

    const nutrients = this.pruneUndefined({
      energy: this.getNutrient(nutriments, [
        'energy-kcal_100g',
        'energy_kcal_100g',
      ]),
      carbohydrates: this.getNutrient(nutriments, ['carbohydrates_100g']),
      sugars: this.getNutrient(nutriments, ['sugars_100g']),
      proteins: this.getNutrient(nutriments, ['proteins_100g']),
      fats: this.getNutrient(nutriments, ['fat_100g']),
      saturatedFats: this.getNutrient(nutriments, ['saturated-fat_100g']),
      fiber: this.getNutrient(nutriments, ['fiber_100g']),
      salt: this.getNutrient(nutriments, ['salt_100g']),
    }) as NonNullable<InvoiceExternalProductData['nutrients']>;

    return Object.keys(nutrients).length > 0 ? nutrients : null;
  }

  private getNutrient(
    nutriments: Record<string, unknown>,
    keys: string[],
  ): number | undefined {
    for (const key of keys) {
      const value = nutriments[key];
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

  private getFirstValidBarcode(
    ...values: Array<string | null | undefined>
  ): string | null {
    for (const value of values) {
      const barcode = this.getValidBarcode(value);

      if (barcode) {
        return barcode;
      }
    }

    return null;
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

  private getCacheTtl(): number {
    return this.getPositiveConfig(
      'OPENFOODFACTS_CACHE_TTL_SECONDS',
      DEFAULT_OPENFOODFACTS_CACHE_TTL_SECONDS,
    );
  }

  private getNegativeCacheTtl(): number {
    return this.getPositiveConfig(
      'OPENFOODFACTS_NEGATIVE_CACHE_TTL_SECONDS',
      DEFAULT_OPENFOODFACTS_NEGATIVE_CACHE_TTL_SECONDS,
    );
  }

  private getConcurrency(): number {
    return Math.min(
      10,
      this.getPositiveConfig(
        'OPENFOODFACTS_CONCURRENCY',
        DEFAULT_OPENFOODFACTS_CONCURRENCY,
      ),
    );
  }

  private getPositiveConfig(key: string, fallback: number): number {
    const value = Number(this.configService.get<string>(key));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
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
