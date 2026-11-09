import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

export interface LocalOpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  quantity?: string;
  image_front_url?: string;
  categories_tags?: string[];
  nutriscore_grade?: string;
  ecoscore_grade?: string;
  nova_group?: number | string;
  ingredients_text?: string;
  nutriments?: Record<string, unknown>;
  completeness?: number;
  last_modified_t?: number;
}

interface OpenFoodFactsRow {
  barcode: string;
  product_name: string | null;
  brands: string | null;
  quantity: string | null;
  image_url: string | null;
  categories_tags: string[] | null;
  nutriscore_grade: string | null;
  ecoscore_grade: string | null;
  nova_group: number | null;
  ingredients_text: string | null;
  nutrients: Record<string, unknown> | null;
  completeness: number | null;
  off_last_modified_at: Date | null;
}

@Injectable()
export class OpenFoodFactsLocalRepository implements OnModuleDestroy {
  private readonly logger = new Logger(OpenFoodFactsLocalRepository.name);
  private pool?: Pool;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('OPENFOODFACTS_DATABASE_URL')?.trim(),
    );
  }

  async findByBarcode(
    barcode: string,
  ): Promise<LocalOpenFoodFactsProduct | null> {
    const pool = this.getPool();
    if (!pool) return null;

    try {
      const result = await pool.query<OpenFoodFactsRow>(
        `SELECT barcode, product_name, brands, quantity, image_url,
                categories_tags, nutriscore_grade, ecoscore_grade, nova_group,
                ingredients_text, nutrients, completeness, off_last_modified_at
           FROM off_products
          WHERE barcode = $1
          LIMIT 1`,
        [barcode],
      );
      const row = result.rows[0];
      if (!row) return null;

      return {
        code: row.barcode,
        product_name: row.product_name ?? undefined,
        brands: row.brands ?? undefined,
        quantity: row.quantity ?? undefined,
        image_front_url: row.image_url ?? undefined,
        categories_tags: row.categories_tags ?? undefined,
        nutriscore_grade: row.nutriscore_grade ?? undefined,
        ecoscore_grade: row.ecoscore_grade ?? undefined,
        nova_group: row.nova_group ?? undefined,
        ingredients_text: row.ingredients_text ?? undefined,
        nutriments: row.nutrients ?? undefined,
        completeness: row.completeness ?? undefined,
        last_modified_t: row.off_last_modified_at
          ? Math.floor(row.off_last_modified_at.getTime() / 1000)
          : undefined,
      };
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: 'openfoodfacts_local_lookup_failed',
          error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        }),
      );
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }

  private getPool(): Pool | null {
    const connectionString = this.config
      .get<string>('OPENFOODFACTS_DATABASE_URL')
      ?.trim();
    if (!connectionString) return null;

    this.pool ??= new Pool({
      connectionString,
      max: this.getPoolSize(),
      connectionTimeoutMillis: 2_000,
      idleTimeoutMillis: 30_000,
      application_name: 'ineat-openfoodfacts-reader',
    });
    return this.pool;
  }

  private getPoolSize(): number {
    const configured = Number(
      this.config.get<string>('OPENFOODFACTS_DATABASE_POOL_SIZE'),
    );
    return Number.isInteger(configured) && configured > 0
      ? Math.min(configured, 20)
      : 5;
  }
}
