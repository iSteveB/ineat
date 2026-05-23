import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EanSuggestion } from './llm.service';

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  image_front_small_url?: string;
  image_url?: string;
  countries_tags?: string[];
}

interface OpenFoodFactsSearchResponse {
  products?: OpenFoodFactsProduct[];
}

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);
  private readonly enabled: boolean;
  private readonly timeoutMs: number;
  private readonly maxSuggestions: number;
  private readonly cache = new Map<string, Promise<EanSuggestion[]>>();

  constructor(private readonly configService: ConfigService) {
    this.enabled =
      this.configService.get<string>('RECEIPT_EAN_LOOKUP_ENABLED') !== 'false';
    this.timeoutMs =
      Number(this.configService.get<string>('OPENFOODFACTS_TIMEOUT_MS')) ||
      2500;
    this.maxSuggestions =
      Number(this.configService.get<string>('OPENFOODFACTS_MAX_SUGGESTIONS')) ||
      2;
  }

  isAvailable(): boolean {
    return this.enabled;
  }

  async searchProduct(productName: string): Promise<EanSuggestion[]> {
    const normalizedName = this.normalizeSearchTerm(productName);

    if (!this.enabled || normalizedName.length < 3) {
      return [];
    }

    const cached = this.cache.get(normalizedName);
    if (cached) {
      return cached;
    }

    const lookupPromise = this.fetchSuggestions(normalizedName).catch(
      (error) => {
        this.logger.debug(
          `OpenFoodFacts ignoré pour "${productName}": ${
            error instanceof Error ? error.message : 'erreur inconnue'
          }`,
        );
        return [];
      },
    );

    this.cache.set(normalizedName, lookupPromise);
    return lookupPromise;
  }

  async enrichProducts<
    T extends { name: string; suggestedEans: EanSuggestion[] },
  >(products: T[]): Promise<T[]> {
    if (!this.enabled || products.length === 0) {
      return products;
    }

    return Promise.all(
      products.map(async (product) => {
        if (product.suggestedEans?.length > 0) {
          return product;
        }

        const suggestions = await this.searchProduct(product.name);
        return {
          ...product,
          suggestedEans: suggestions,
        };
      }),
    );
  }

  private async fetchSuggestions(searchTerm: string): Promise<EanSuggestion[]> {
    const params = new URLSearchParams({
      search_terms: searchTerm,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: String(Math.max(this.maxSuggestions * 3, 6)),
      fields:
        'code,product_name,brands,image_front_small_url,image_url,countries_tags',
      lc: 'fr',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`,
        {
          signal: controller.signal,
          headers: {
            Accept: 'application/json',
            'User-Agent': 'ineat-backend/1.0 (receipt ean lookup)',
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as OpenFoodFactsSearchResponse;
      return (data.products || [])
        .filter((product) => product.code && /^\d{13}$/.test(product.code))
        .slice(0, this.maxSuggestions)
        .map((product, index) => ({
          ean: product.code,
          confidence: this.scoreProduct(product, searchTerm, index),
          brand: product.brands || '-',
          productName: product.product_name || searchTerm,
          image: product.image_front_small_url || product.image_url || null,
        }));
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeSearchTerm(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\b(lot|promo|remise|article|ticket)\b/g, ' ')
      .replace(/[^\w\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private scoreProduct(
    product: OpenFoodFactsProduct,
    searchTerm: string,
    index: number,
  ): number {
    const productName = this.normalizeSearchTerm(product.product_name || '');
    const brand = this.normalizeSearchTerm(product.brands || '');
    const searchWords = searchTerm.split(' ').filter((word) => word.length > 2);
    const haystack = `${productName} ${brand}`;
    const matchedWords = searchWords.filter((word) => haystack.includes(word));
    const lexicalScore =
      searchWords.length > 0 ? matchedWords.length / searchWords.length : 0;
    const countryBoost = product.countries_tags?.includes('en:france')
      ? 0.08
      : 0;
    const rankPenalty = index * 0.08;

    return Math.max(
      0.35,
      Math.min(0.95, 0.55 + lexicalScore * 0.3 + countryBoost - rankPenalty),
    );
  }
}
