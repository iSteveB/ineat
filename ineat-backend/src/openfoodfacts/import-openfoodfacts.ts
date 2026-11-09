import 'dotenv/config';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import { createGunzip } from 'node:zlib';
import { once } from 'node:events';
import { parse } from 'csv-parse';
import { Pool, PoolClient } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';

const DEFAULT_SOURCE_URL =
  'https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz';
const COPY_COLUMNS = [
  'barcode',
  'product_name',
  'brands',
  'quantity',
  'image_url',
  'categories_tags',
  'nutriscore_grade',
  'ecoscore_grade',
  'nova_group',
  'ingredients_text',
  'nutrients',
  'completeness',
  'off_last_modified_at',
  'imported_at',
] as const;

interface SourceMetadata {
  etag: string | null;
  lastModified: string | null;
  contentLength: number | null;
}

interface CsvRecord {
  [key: string]: string | undefined;
}

const pool = new Pool({
  connectionString: requiredEnv('OPENFOODFACTS_DATABASE_URL'),
  max: 2,
  application_name: 'ineat-openfoodfacts-importer',
});

async function main(): Promise<void> {
  const source =
    process.env.OPENFOODFACTS_IMPORT_SOURCE?.trim() || DEFAULT_SOURCE_URL;
  const metadata = await readSourceMetadata(source);
  validateSourceSize(metadata);

  const client = await pool.connect();
  let runId: string | null = null;

  try {
    await ensureMetadataTable(client);
    runId = await startImportRun(client, source, metadata);
    await prepareNextTable(client);

    const rowCount = await copyProducts(client, source);
    const minimumRows = positiveInteger(
      process.env.OPENFOODFACTS_IMPORT_MIN_ROWS,
      1_000_000,
    );
    if (rowCount < minimumRows) {
      throw new Error(
        `OFF_IMPORT_TOO_SMALL: ${rowCount} rows, expected at least ${minimumRows}`,
      );
    }

    await finalizeNextTable(client, runId);
    await activateNextTable(client);
    await client.query('ANALYZE off_products');
    await finishImportRun(client, runId, 'SUCCEEDED', rowCount, null);

    console.log(
      JSON.stringify({
        event: 'openfoodfacts_import_succeeded',
        runId,
        rowCount,
        source,
        sourceBytes: metadata.contentLength,
      }),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    if (runId) {
      await finishImportRun(client, runId, 'FAILED', null, message).catch(
        () => undefined,
      );
    }
    console.error(
      JSON.stringify({
        event: 'openfoodfacts_import_failed',
        runId,
        error: message,
      }),
    );
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

async function readSourceMetadata(source: string): Promise<SourceMetadata> {
  if (!isHttpUrl(source)) {
    return { etag: null, lastModified: null, contentLength: null };
  }

  const response = await fetch(source, { method: 'HEAD', redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`OFF_SOURCE_HEAD_HTTP_${response.status}`);
  }
  const length = Number(response.headers.get('content-length'));
  return {
    etag: response.headers.get('etag'),
    lastModified: response.headers.get('last-modified'),
    contentLength: Number.isFinite(length) && length > 0 ? length : null,
  };
}

function validateSourceSize(metadata: SourceMetadata): void {
  const minimumBytes = positiveInteger(
    process.env.OPENFOODFACTS_IMPORT_MIN_BYTES,
    100_000_000,
  );
  if (
    metadata.contentLength !== null &&
    metadata.contentLength < minimumBytes
  ) {
    throw new Error(
      `OFF_SOURCE_TOO_SMALL: ${metadata.contentLength} bytes, expected at least ${minimumBytes}`,
    );
  }
}

async function ensureMetadataTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS off_import_runs (
      id uuid PRIMARY KEY,
      status text NOT NULL,
      source_url text NOT NULL,
      source_etag text,
      source_last_modified text,
      source_bytes bigint,
      row_count bigint,
      error text,
      started_at timestamptz NOT NULL DEFAULT now(),
      completed_at timestamptz
    )
  `);
}

async function startImportRun(
  client: PoolClient,
  source: string,
  metadata: SourceMetadata,
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO off_import_runs
       (id, status, source_url, source_etag, source_last_modified, source_bytes)
     VALUES (gen_random_uuid(), 'RUNNING', $1, $2, $3, $4)
     RETURNING id`,
    [source, metadata.etag, metadata.lastModified, metadata.contentLength],
  );
  return result.rows[0].id;
}

async function prepareNextTable(client: PoolClient): Promise<void> {
  await client.query('DROP TABLE IF EXISTS off_products_next');
  await client.query(`
    CREATE UNLOGGED TABLE off_products_next (
      barcode text NOT NULL,
      product_name text,
      brands text,
      quantity text,
      image_url text,
      categories_tags jsonb,
      nutriscore_grade text,
      ecoscore_grade text,
      nova_group smallint,
      ingredients_text text,
      nutrients jsonb,
      completeness double precision,
      off_last_modified_at timestamptz,
      imported_at timestamptz NOT NULL
    )
  `);
}

async function copyProducts(
  client: PoolClient,
  source: string,
): Promise<number> {
  const copy = client.query(
    copyFrom(
      `COPY off_products_next (${COPY_COLUMNS.join(', ')}) FROM STDIN WITH (FORMAT text)`,
    ),
  );
  const copyFinished = new Promise<void>((resolve, reject) => {
    copy.once('finish', resolve);
    copy.once('error', reject);
  });
  const input = await openSource(source);
  const decompressed = source.toLowerCase().endsWith('.gz')
    ? input.pipe(createGunzip())
    : input;
  const parser = decompressed.pipe(
    parse({
      bom: true,
      columns: true,
      delimiter: '\t',
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
      max_record_size: 16 * 1024 * 1024,
    }),
  );

  try {
    let rowCount = 0;
    const importedAt = new Date().toISOString();
    for await (const record of parser as AsyncIterable<CsvRecord>) {
      const barcode = normalizeBarcode(record.code);
      if (!barcode) continue;

      const values = projectRecord(record, barcode, importedAt);
      if (!copy.write(`${values.map(escapeCopyValue).join('\t')}\n`)) {
        await once(copy, 'drain');
      }
      rowCount += 1;
      if (rowCount % 250_000 === 0) {
        console.log(
          JSON.stringify({ event: 'openfoodfacts_import_progress', rowCount }),
        );
      }
    }
    copy.end();
    await copyFinished;
    return rowCount;
  } catch (error) {
    copy.destroy(error instanceof Error ? error : new Error('OFF_COPY_FAILED'));
    await copyFinished.catch(() => undefined);
    throw error;
  }
}

function projectRecord(
  record: CsvRecord,
  barcode: string,
  importedAt: string,
): Array<string | number | null> {
  const nutrients = compactObject({
    'energy-kcal_100g': finiteNumber(record['energy-kcal_100g']),
    carbohydrates_100g: finiteNumber(record.carbohydrates_100g),
    sugars_100g: finiteNumber(record.sugars_100g),
    proteins_100g: finiteNumber(record.proteins_100g),
    fat_100g: finiteNumber(record.fat_100g),
    'saturated-fat_100g': finiteNumber(record['saturated-fat_100g']),
    fiber_100g: finiteNumber(record.fiber_100g),
    salt_100g: finiteNumber(record.salt_100g),
  });
  const categories = splitTags(record.categories_tags);

  return [
    barcode,
    cleanText(record.product_name),
    cleanText(record.brands),
    cleanText(record.quantity),
    cleanText(record.image_url),
    categories.length > 0 ? JSON.stringify(categories) : null,
    normalizeGrade(record.nutriscore_grade),
    normalizeGrade(record.ecoscore_grade),
    integerBetween(record.nova_group, 1, 4),
    cleanText(record.ingredients_text),
    Object.keys(nutrients).length > 0 ? JSON.stringify(nutrients) : null,
    finiteNumber(record.completeness),
    epochToIso(record.last_modified_t),
    importedAt,
  ];
}

async function finalizeNextTable(
  client: PoolClient,
  runId: string,
): Promise<void> {
  const suffix = runId.replace(/-/g, '');
  const indexName = `off_products_barcode_${suffix}`;
  const constraintName = `off_products_pk_${suffix}`;
  await client.query('ALTER TABLE off_products_next SET LOGGED');
  await client.query(
    `CREATE UNIQUE INDEX ${indexName} ON off_products_next (barcode)`,
  );
  await client.query(
    `ALTER TABLE off_products_next ADD CONSTRAINT ${constraintName} PRIMARY KEY USING INDEX ${indexName}`,
  );
}

async function activateNextTable(client: PoolClient): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext('ineat_openfoodfacts_import'))`,
    );
    await client.query('DROP TABLE IF EXISTS off_products_old');
    const active = await client.query<{ exists: boolean }>(
      `SELECT to_regclass('public.off_products') IS NOT NULL AS exists`,
    );
    if (active.rows[0].exists) {
      await client.query('ALTER TABLE off_products RENAME TO off_products_old');
    }
    await client.query('ALTER TABLE off_products_next RENAME TO off_products');
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function finishImportRun(
  client: PoolClient,
  runId: string,
  status: 'SUCCEEDED' | 'FAILED',
  rowCount: number | null,
  error: string | null,
): Promise<void> {
  await client.query(
    `UPDATE off_import_runs
        SET status = $2, row_count = $3, error = $4, completed_at = now()
      WHERE id = $1`,
    [runId, status, rowCount, error],
  );
}

async function openSource(source: string): Promise<Readable> {
  if (!isHttpUrl(source)) return createReadStream(source);

  const response = await fetch(source, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`OFF_SOURCE_GET_HTTP_${response.status}`);
  }
  return Readable.fromWeb(response.body as never);
}

function normalizeBarcode(value?: string): string | null {
  const normalized = value?.trim();
  return normalized && /^\d{8,13}$/.test(normalized) ? normalized : null;
}

function cleanText(value?: string): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function splitTags(value?: string): string[] {
  return value
    ? value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
}

function normalizeGrade(value?: string): string | null {
  const grade = value?.trim().toUpperCase();
  return grade && ['A', 'B', 'C', 'D', 'E'].includes(grade) ? grade : null;
}

function finiteNumber(value?: string): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function integerBetween(
  value: string | undefined,
  minimum: number,
  maximum: number,
): number | null {
  const parsed = finiteNumber(value);
  return parsed !== null &&
    Number.isInteger(parsed) &&
    parsed >= minimum &&
    parsed <= maximum
    ? parsed
    : null;
}

function epochToIso(value?: string): string | null {
  const seconds = finiteNumber(value);
  if (seconds === null || seconds <= 0) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function compactObject(
  value: Record<string, number | null>,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] => entry[1] !== null,
    ),
  );
}

function escapeCopyValue(value: string | number | null): string {
  if (value === null) return '\\N';
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function requiredEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

void main();
