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
  purchaseDate: string | Date;
  manualExpiryDate?: string | null;
}

export interface ExpiryEstimationResult {
  expiryDate: Date | null;
  source: ExpiryDateSource;
  reason?: string;
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
  manualExpiryDate,
}: ExpiryEstimationInput): ExpiryEstimationResult => {
  if (manualExpiryDate) {
    return {
      expiryDate: new Date(manualExpiryDate),
      source: 'MANUAL',
    };
  }

  const referenceDate = new Date(purchaseDate);
  if (Number.isNaN(referenceDate.getTime())) {
    return {
      expiryDate: null,
      source: 'ESTIMATED',
    };
  }

  const storageGroup = resolveStorageGroup(storageLocation);
  const productRule = findRule(PRODUCT_SHELF_LIFE_RULES, productName ?? '');
  const categoryRule = findRule(
    CATEGORY_SHELF_LIFE_RULES,
    `${categorySlug ?? ''} ${categoryName ?? ''}`,
  );
  const matchedRule = productRule ?? categoryRule;
  const days =
    matchedRule?.daysByStorage[storageGroup] ??
    matchedRule?.defaultDays ??
    STORAGE_FALLBACK_DAYS[storageGroup];

  return {
    expiryDate: addDays(referenceDate, days),
    source: 'ESTIMATED',
    reason: matchedRule
      ? `${matchedRule.label} + ${storageLocation || 'stockage par défaut'}`
      : `stockage ${storageLocation || 'par défaut'}`,
  };
};
