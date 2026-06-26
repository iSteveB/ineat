import {
	CATEGORY_SHELF_LIFE_RULES,
	PRODUCT_SHELF_LIFE_RULES,
	type ShelfLifeRule,
	STORAGE_ALIASES,
	STORAGE_FALLBACK_DAYS,
	type StorageGroup,
} from '@/constants/expiryRules';
import type {
	PackageStatus,
	PreparationStatus,
} from '@/utils/productStateOptions';

export interface ExpirySuggestionInput {
	productName?: string;
	categorySlug?: string;
	categoryName?: string;
	storageLocation?: string;
	packageStatus?: PackageStatus;
	preparationStatus?: PreparationStatus;
	purchaseDate: string;
}

export interface ExpirySuggestion {
	date: string;
	reason: string;
}

const normalize = (value?: string): string =>
	(value ?? '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/_/g, '-')
		.trim();

const formatDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

const addDays = (date: Date, days: number): Date => {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
};

const resolveStorageGroup = (storageLocation?: string): StorageGroup => {
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
	packageStatus?: PackageStatus;
	preparationStatus?: PreparationStatus;
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

export const getExpirySuggestion = ({
	productName,
	categorySlug,
	categoryName,
	storageLocation,
	packageStatus,
	preparationStatus,
	purchaseDate,
}: ExpirySuggestionInput): ExpirySuggestion | null => {
	if (!purchaseDate) return null;

	const referenceDate = new Date(purchaseDate);
	if (Number.isNaN(referenceDate.getTime())) return null;

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
		date: formatDate(addDays(referenceDate, adjusted.days)),
		reason: matchedRule
			? `${matchedRule.label} + ${storageLocation || 'stockage par défaut'}${stateReason}`
			: `stockage ${storageLocation || 'par défaut'}${stateReason}`,
	};
};
