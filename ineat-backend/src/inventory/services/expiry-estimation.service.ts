import {
  CATEGORY_SHELF_LIFE_RULES,
  PRODUCT_SHELF_LIFE_RULES,
  ShelfLifeRule,
  STORAGE_ALIASES,
  STORAGE_FALLBACK_DAYS,
  StorageGroup,
} from '../constants/expiry-rules';

export type ExpiryDateSource = 'MANUAL' | 'ESTIMATED';

export interface ExpiryEstimationInput {
  productName?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  storageLocation?: string | null;
  purchaseDate?: string | Date | null;
  addedAt?: string | Date | null;
  manualExpiryDate?: string | null;
}

export type ExpiryRuleLevel = 'manual' | 'product' | 'category' | 'storage';

export interface ExpiryEstimationResult {
  expiryDate: Date | null;
  source: ExpiryDateSource;
  reason?: string;
  ruleId?: string;
  ruleLevel: ExpiryRuleLevel;
  storageGroup?: StorageGroup;
  durationDays?: number;
  referenceDate?: Date;
}

const normalize = (value?: string | null): string =>
  (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/_/g, '-')
    .trim();

const resolveStorageGroup = (storageLocation?: string | null): StorageGroup => {
  const normalized = normalize(storageLocation);

  for (const [group, aliases] of Object.entries(STORAGE_ALIASES)) {
    if (aliases.some((alias) => normalized.includes(normalize(alias)))) {
      return group as StorageGroup;
    }
  }

  return 'other';
};

const findRule = (rules: ShelfLifeRule[], text: string) => {
  const normalizedText = normalize(text);

  return rules.find((rule) =>
    rule.keywords.some((keyword) =>
      normalizedText.includes(normalize(keyword)),
    ),
  );
};

const addDays = (date: Date, days: number): Date => {
  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days,
    ),
  );
};

export const estimateExpiryDate = ({
  productName,
  categorySlug,
  categoryName,
  storageLocation,
  purchaseDate,
  addedAt,
  manualExpiryDate,
}: ExpiryEstimationInput): ExpiryEstimationResult => {
  if (manualExpiryDate) {
    return {
      expiryDate: new Date(manualExpiryDate),
      source: 'MANUAL',
      ruleLevel: 'manual',
    };
  }

  const referenceDate = new Date(purchaseDate ?? addedAt ?? new Date());
  if (Number.isNaN(referenceDate.getTime())) {
    return {
      expiryDate: null,
      source: 'ESTIMATED',
      ruleLevel: 'storage',
    };
  }

  const storageGroup = resolveStorageGroup(storageLocation);
  const productRule = findRule(PRODUCT_SHELF_LIFE_RULES, productName ?? '');
  const categoryRule = findRule(
    CATEGORY_SHELF_LIFE_RULES,
    `${categorySlug ?? ''} ${categoryName ?? ''}`,
  );
  const matchedRule = productRule ?? categoryRule;
  const ruleLevel: ExpiryRuleLevel = productRule
    ? 'product'
    : categoryRule
      ? 'category'
      : 'storage';
  const days =
    matchedRule?.daysByStorage[storageGroup] ??
    matchedRule?.defaultDays ??
    STORAGE_FALLBACK_DAYS[storageGroup];

  return {
    expiryDate: addDays(referenceDate, days),
    source: 'ESTIMATED',
    ruleId: matchedRule?.id,
    ruleLevel,
    storageGroup,
    durationDays: days,
    referenceDate,
    reason: matchedRule
      ? `${matchedRule.label} + ${storageLocation || 'stockage par défaut'}`
      : `stockage ${storageLocation || 'par défaut'}`,
  };
};
