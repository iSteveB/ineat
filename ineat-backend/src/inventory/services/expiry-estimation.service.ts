import {
  CATEGORY_SHELF_LIFE_RULES,
  PRODUCT_SHELF_LIFE_RULES,
  ShelfLifeRule,
  STORAGE_ALIASES,
  STORAGE_FALLBACK_DAYS,
  StorageGroup,
} from '../constants/expiry-rules';

export type ExpiryDateSource = 'MANUAL' | 'ESTIMATED';
export type PackageStatus = 'UNOPENED' | 'OPENED';
export type PreparationStatus = 'RAW' | 'COOKED';

export interface ExpiryEstimationInput {
  productName?: string | null;
  categorySlug?: string | null;
  categoryName?: string | null;
  storageLocation?: string | null;
  packageStatus?: PackageStatus | null;
  preparationStatus?: PreparationStatus | null;
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

const COOKED_DURATION_DAYS: Record<StorageGroup, number> = {
  fridge: 3,
  freezer: 60,
  pantry: 1,
  cellar: 1,
  ambient: 1,
  other: 3,
};

const OPENED_DURATION_CAPS: Record<
  string,
  Partial<Record<StorageGroup, number>>
> = {
  'produits-laitiers': { fridge: 5, freezer: 30, pantry: 7, ambient: 2 },
  condiments: { fridge: 30, pantry: 30, ambient: 7 },
  conserves: { fridge: 5, pantry: 5, cellar: 5, ambient: 2 },
  boissons: { fridge: 5, pantry: 3, cellar: 3, ambient: 1 },
  'epicerie-sucree': { pantry: 30, cellar: 30, ambient: 14 },
  'epicerie-salee': { pantry: 30, cellar: 30, ambient: 14 },
};

const applyStateAdjustments = ({
  days,
  storageGroup,
  ruleId,
  packageStatus,
  preparationStatus,
}: {
  days: number;
  storageGroup: StorageGroup;
  ruleId?: string;
  packageStatus?: PackageStatus | null;
  preparationStatus?: PreparationStatus | null;
}): { days: number; labels: string[] } => {
  let adjustedDays = days;
  const labels: string[] = [];

  if (preparationStatus === 'COOKED') {
    adjustedDays = COOKED_DURATION_DAYS[storageGroup];
    labels.push('cuit');
  }

  if (packageStatus === 'OPENED') {
    const cap = ruleId
      ? OPENED_DURATION_CAPS[ruleId]?.[storageGroup]
      : undefined;
    adjustedDays = Math.min(adjustedDays, cap ?? 7);
    labels.push('ouvert');
  }

  return { days: adjustedDays, labels };
};

export const estimateExpiryDate = ({
  productName,
  categorySlug,
  categoryName,
  storageLocation,
  packageStatus,
  preparationStatus,
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
  const adjusted = applyStateAdjustments({
    days,
    storageGroup,
    ruleId: matchedRule?.id,
    packageStatus,
    preparationStatus,
  });
  const stateReason =
    adjusted.labels.length > 0 ? ` + ${adjusted.labels.join(' + ')}` : '';

  return {
    expiryDate: addDays(referenceDate, adjusted.days),
    source: 'ESTIMATED',
    ruleId: matchedRule?.id,
    ruleLevel,
    storageGroup,
    durationDays: adjusted.days,
    referenceDate,
    reason: matchedRule
      ? `${matchedRule.label} + ${storageLocation || 'stockage par défaut'}${stateReason}`
      : `stockage ${storageLocation || 'par défaut'}${stateReason}`,
  };
};
