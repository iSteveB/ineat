import { EcoScore, NutriScore, UnitType } from '@/schemas/inventorySchema';

// Schémas et types
export {
	AddManualProductSchema,
	ProductCreatedResponseSchema,
	InventoryItemSchema,
	InventoryFiltersSchema,
	InventoryStatsSchema,
	NutritionalInfoSchema,
	UnitTypeSchema,
	NutriScoreSchema,
	EcoScoreSchema,
} from '@/schemas/inventorySchema';

export type {
	AddManualProductInput,
	ProductCreatedResponse,
	InventoryItem,
	InventoryFilters,
	InventoryStats,
	NutritionalInfo,
	UnitType,
	NutriScore,
	EcoScore,
} from '@/schemas/inventorySchema';

// Service API
export {
	inventoryService,
	type InventoryItemResponse,
	type InventoryStatsResponse,
	type UpdateInventoryItemInput,
} from '@/services/inventoryService';

// Hooks TanStack Query
export {
	useInventory,
	useInventoryStats,
	useAddManualProduct,
	useUpdateInventoryItem,
	useRemoveInventoryItem,
	useInventoryMutationsStatus,
	usePrefetchInventory,
	inventoryKeys,
} from '@/hooks/useInventory';

// Store Zustand et hooks personnalisés
export {
	useInventoryStore,
	useInventoryItems,
	useInventoryLoading,
	useInventoryError,
	useInventoryFormState,
	useInventoryDefaultValues,
	useInventoryRecentValues,
	useInventoryFilters,
	useInventoryActions,
	useResetFormWithDefaults,
	useSaveRecentValues,
	useInventoryUIStore,
} from '@/stores/inventoryStore';

// Constantes utiles
export const INVENTORY_CATEGORIES = [
	{ value: 'fruits-legumes', label: 'Fruits & Légumes' },
	{ value: 'viandes-et-poissons', label: 'Viandes & Poissons' },
	{ value: 'produits-laitiers', label: 'Produits laitiers' },
	{ value: 'epicerie-salee', label: 'Épicerie salée' },
	{ value: 'epicerie-sucree', label: 'Épicerie sucrée' },
	{ value: 'surgeles', label: 'Surgelés' },
	{ value: 'boissons', label: 'Boissons' },
	{ value: 'autres', label: 'Autres' },
] as const;

export const INVENTORY_UNIT_TYPES = [
	{ value: 'UNIT' as const, label: 'Unité(s)' },
	{ value: 'KG' as const, label: 'Kilogramme(s)' },
	{ value: 'G' as const, label: 'Gramme(s)' },
	{ value: 'L' as const, label: 'Litre(s)' },
	{ value: 'ML' as const, label: 'Millilitre(s)' },
] as const;

export const INVENTORY_STORAGE_LOCATIONS = [
	{ value: 'refrigerateur', label: 'Réfrigérateur' },
	{ value: 'congelateur', label: 'Congélateur' },
	{ value: 'placard', label: 'Placard' },
	{ value: 'cave', label: 'Cave' },
	{ value: 'autres', label: 'Autres' },
] as const;

export const NUTRISCORE_OPTIONS = [
	{ value: 'A' as const, label: 'A - Très bonne qualité nutritionnelle' },
	{ value: 'B' as const, label: 'B - Bonne qualité nutritionnelle' },
	{ value: 'C' as const, label: 'C - Qualité nutritionnelle correcte' },
	{ value: 'D' as const, label: 'D - Qualité nutritionnelle faible' },
	{ value: 'E' as const, label: 'E - Qualité nutritionnelle très faible' },
] as const;

export const ECOSCORE_OPTIONS = [
	{ value: 'A' as const, label: 'A - Très faible impact environnemental' },
	{ value: 'B' as const, label: 'B - Faible impact environnemental' },
	{ value: 'C' as const, label: 'C - Impact environnemental modéré' },
	{ value: 'D' as const, label: 'D - Impact environnemental élevé' },
	{ value: 'E' as const, label: 'E - Impact environnemental très élevé' },
] as const;

// Utilitaires pour l'interface
export const formatUnitType = (unitType: UnitType): string => {
	const unit = INVENTORY_UNIT_TYPES.find((u) => u.value === unitType);
	return unit?.label || unitType;
};

export const formatNutriScore = (score?: NutriScore | null): string => {
	if (!score) return 'Non défini';
	const option = NUTRISCORE_OPTIONS.find((opt) => opt.value === score);
	return option?.label || score;
};

export const formatEcoScore = (score?: EcoScore | null): string => {
	if (!score) return 'Non défini';
	const option = ECOSCORE_OPTIONS.find((opt) => opt.value === score);
	return option?.label || score;
};

export const getCategoryLabel = (categorySlug: string): string => {
	const category = INVENTORY_CATEGORIES.find(
		(cat) => cat.value === categorySlug
	);
	return category?.label || categorySlug;
};

export const getStorageLocationLabel = (location: string): string => {
	const storageLocation = INVENTORY_STORAGE_LOCATIONS.find(
		(loc) => loc.value === location
	);
	return storageLocation?.label || location;
};

// Utilitaires pour les dates
export const formatExpiryDate = (expiryDate?: string | null): string => {
	if (!expiryDate) return 'Aucune date de péremption';

	const expiry = new Date(expiryDate);
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	expiry.setHours(0, 0, 0, 0);
	
	const diffTime = expiry.getTime() - now.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays < 0) {
		return `Périmé depuis ${Math.abs(diffDays)} jour(s)`;
	} else if (diffDays === 0) {
		return "Périme aujourd'hui";
	} else if (diffDays === 1) {
		return 'Périme demain';
	} else if (diffDays <= 7) {
		return `Périme dans ${diffDays} jours`;
	} else {
		return expiry.toLocaleDateString('fr-FR');
	}
};

export const getExpiryStatus = (
	expiryDate?: string | null
): 'fresh' | 'warning' | 'danger' | 'expired' => {
	if (!expiryDate) return 'fresh';

	const expiry = new Date(expiryDate);
	const now = new Date();
	now.setHours(0, 0, 0, 0);
	expiry.setHours(0, 0, 0, 0);
	
	const diffTime = expiry.getTime() - now.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	if (diffDays < 0) return 'expired';
	if (diffDays <= 2) return 'danger';
	if (diffDays <= 7) return 'warning';
	return 'fresh';
};

// Utilitaires pour les prix
export const formatPrice = (price?: number | null): string => {
	if (price === undefined || price === null) return 'Prix non défini';
	return new Intl.NumberFormat('fr-FR', {
		style: 'currency',
		currency: 'EUR',
	}).format(price);
};

// Utilitaires pour les quantités
export const formatQuantity = (
	quantity: number,
	unitType: UnitType
): string => {
	const formattedQuantity =
		quantity % 1 === 0 ? quantity.toString() : quantity.toFixed(1);
	const unit = formatUnitType(unitType);
	return `${formattedQuantity} ${unit.toLowerCase()}`;
};