import { Prisma } from '../../prisma/generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CiqualReferenceService } from './ciqual-reference.service';

const CIQUAL_CATEGORIES = ['fruits-et-legumes', 'viandes-et-poissons'];

interface BackfillResult {
  scanned: number;
  matched: number;
  updated: number;
}

export async function backfillCiqualProducts(
  prisma: Pick<PrismaService, 'product'>,
  ciqual = new CiqualReferenceService(),
): Promise<BackfillResult> {
  const products = await prisma.product.findMany({
    where: {
      barcode: null,
      Category: { slug: { in: CIQUAL_CATEGORIES } },
    },
    include: { Category: true },
  });
  const source = ciqual.source();
  let matched = 0;
  let updated = 0;

  for (const product of products) {
    // Une saisie manuelle existante reste prioritaire sur les moyennes CIQUAL.
    if (product.nutrients !== null) continue;

    const match = ciqual.matchInvoiceItem({
      detectedName: product.name,
      category: product.Category.slug,
      quantity: 1,
      confidence: 1,
    });
    if (!match) continue;
    matched += 1;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        ciqualCode: match.code,
        ciqualName: match.name,
        nutritionSource: source.name,
        nutritionSourceVersion: source.version,
        nutrients: match.nutrients as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
    updated += 1;
  }

  return { scanned: products.length, matched, updated };
}

async function main(): Promise<void> {
  const prisma = new PrismaService();
  try {
    await prisma.$connect();
    const result = await backfillCiqualProducts(prisma);
    console.log(JSON.stringify({ event: 'ciqual_backfill_completed', ...result }));
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main().catch((error) => {
    console.error(
      JSON.stringify({
        event: 'ciqual_backfill_failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    process.exitCode = 1;
  });
}
