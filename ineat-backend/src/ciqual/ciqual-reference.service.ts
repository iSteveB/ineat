import { Injectable } from '@nestjs/common';
import reference from './data/ciqual-2025-fresh-foods.json';
import { AnalyzedInvoiceItem } from '../invoice/services/providers/invoice-analysis-provider';

type Nutrients = (typeof reference.foods)[number]['nutrients'];

export interface CiqualMatch {
  code: string;
  name: string;
  confidence: number;
  nutrients: Nutrients;
  source: string;
  version: string;
}

const STOP_WORDS = new Set([
  'affine', 'affinee', 'bateau', 'bio', 'calibre', 'cat', 'categorie',
  'air', 'filet', 'frai', 'france', 'frais', 'fraiche', 'kg', 'lot', 'origine', 'piece',
  'pieces', 'plein', 'sachet', 'vrac', 'unite', 'unites',
]);
const MATCH_THRESHOLD = 0.78;
const MINIMUM_MARGIN = 0.02;

@Injectable()
export class CiqualReferenceService {
  matchInvoiceItem(item: AnalyzedInvoiceItem): CiqualMatch | null {
    if (
      !['fruits-et-legumes', 'viandes-et-poissons'].includes(
        item.category ?? '',
      ) || this.hasBarcode(item)
    ) {
      return null;
    }

    const queryTokens = this.tokens(item.detectedName);
    if (!queryTokens.length) return null;

    const candidates = reference.foods
      .filter((food) => food.category === item.category)
      .map((food) => ({ food, score: this.score(queryTokens, this.tokens(food.normalizedName)) }))
      .filter(({ score }) => score >= MATCH_THRESHOLD)
      .sort((left, right) => right.score - left.score || left.food.name.length - right.food.name.length);

    const best = candidates[0];
    if (!best) return null;
    if (candidates[1] && best.score - candidates[1].score < MINIMUM_MARGIN) {
      return null;
    }

    return {
      code: best.food.code,
      name: best.food.name,
      confidence: Math.round(best.score * 100) / 100,
      nutrients: best.food.nutrients,
      source: reference.source,
      version: reference.version,
    };
  }

  enrichItem(item: AnalyzedInvoiceItem): AnalyzedInvoiceItem {
    const match = this.matchInvoiceItem(item);
    if (!match) return item;

    return {
      ...item,
      ciqualCode: match.code,
      ciqualName: match.name,
      ciqualMatchConfidence: match.confidence,
      ciqualNutrients: match.nutrients,
    };
  }

  source(): { name: string; version: string } {
    return { name: reference.source, version: reference.version };
  }

  private score(query: string[], candidate: string[]): number {
    const querySet = new Set(query);
    const candidateSet = new Set(candidate);
    const common = [...querySet].filter((token) => candidateSet.has(token)).length;
    if (!common) return 0;

    const queryCoverage = common / querySet.size;
    const extraCandidateTokens = Math.max(0, candidateSet.size - common);
    const startsWithBonus = candidate[0] === query[0] ? 0.08 : 0;
    const rawBonus = candidateSet.has('cru') ? 0.08 : 0;
    return Math.min(
      1,
      queryCoverage * 0.85 +
        startsWithBonus +
        rawBonus -
        Math.min(0.2, extraCandidateTokens * 0.025),
    );
  }

  private tokens(value: string): string[] {
    return this.normalize(value)
      .split(' ')
      .map((token) => token.replace(/^([a-z]{3,})s$/, '$1'))
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token) && !/^\d+$/.test(token));
  }

  private normalize(value: string): string {
    return value
      .replace(/œ/g, 'oe')
      .replace(/Œ/g, 'oe')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private hasBarcode(item: AnalyzedInvoiceItem): boolean {
    return [item.selectedEan, item.productCode].some((value) => value && /^\d{8,13}$/.test(value.trim()));
  }
}
