import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import {
	AddManualProductInput,
	UnitType,
	InventoryFilters,
} from '@/schemas/inventorySchema';
import { useCallback } from 'react';
import {
	inventoryService,
	InventoryItemResponse,
	UpdateInventoryItemInput,
} from '@/services/inventoryService';

// Types pour l'état du store
interface InventoryFormState {
	// État du formulaire d'ajout manuel
	draftProduct: Partial<AddManualProductInput>;

	// Préférences utilisateur pour les valeurs par défaut
	defaultValues: {
		unitType: UnitType;
		storageLocation: string;
		purchaseDate: string; // Toujours aujourd'hui par défaut
	};

	// Dernières valeurs utilisées (pour faciliter la saisie)
	recentValues: {
		brands: string[];
		categories: string[];
		storageLocations: string[];
	};

	// Filtres de l'inventaire
	inventoryFilters: InventoryFilters;

	// Actions
	updateDraftProduct: (updates: Partial<AddManualProductInput>) => void;
	clearDraftProduct: () => void;
	saveDraftProduct: (product: Partial<AddManualProductInput>) => void;

	updateDefaultValues: (
		defaults: Partial<InventoryFormState['defaultValues']>
	) => void;
	addRecentValue: (
		type: keyof InventoryFormState['recentValues'],
		value: string
	) => void;

	setInventoryFilters: (filters: InventoryFilters) => void;
	clearInventoryFilters: () => void;
}

// État pour la gestion des items d'inventaire
interface InventoryDataState {
	// Données
	items: InventoryItemResponse[];
	isLoading: boolean;
	error: string | null;

	// Actions
	fetchInventoryItems: (filters?: InventoryFilters) => Promise<void>;
	addInventoryItem: (productData: AddManualProductInput) => Promise<void>;
	updateInventoryItem: (
		id: string,
		updates: UpdateInventoryItemInput
	) => Promise<void>;
	removeInventoryItem: (id: string) => Promise<void>;
	clearError: () => void;
}

// Type combiné pour le store complet
type InventoryState = InventoryFormState & InventoryDataState;

// Type pour l'état persisté (seulement certaines parties)
interface PersistedInventoryState {
	defaultValues: InventoryFormState['defaultValues'];
	recentValues: InventoryFormState['recentValues'];
	inventoryFilters: InventoryFilters;
}

// Type pour les versions antérieures (migration)
interface LegacyPersistedState {
	defaultValues?: InventoryFormState['defaultValues'];
	recentValues?: Partial<InventoryFormState['recentValues']>;
	inventoryFilters?: InventoryFilters;
}

// Type pour les actions du store
type InventoryActions = Pick<
	InventoryState,
	| 'updateDraftProduct'
	| 'clearDraftProduct'
	| 'saveDraftProduct'
	| 'updateDefaultValues'
	| 'addRecentValue'
	| 'setInventoryFilters'
	| 'clearInventoryFilters'
	| 'fetchInventoryItems'
	| 'addInventoryItem'
	| 'updateInventoryItem'
	| 'removeInventoryItem'
	| 'clearError'
>;

// État initial du formulaire
const initialFormState: Partial<AddManualProductInput> = {
	name: '',
	brand: '',
	category: '',
	quantity: 1,
	unitType: 'UNIT',
	purchaseDate: new Date().toISOString().split('T')[0],
	expiryDate: '',
	purchasePrice: undefined,
	storageLocation: '',
	notes: '',
	nutriscore: undefined,
	ecoscore: undefined,
	nutritionalInfo: {
		carbohydrates: undefined,
		proteins: undefined,
		fats: undefined,
		salt: undefined,
	},
};

// Store principal pour l'inventaire
export const useInventoryStore = create<InventoryState>()(
	subscribeWithSelector(
		persist(
			(set, get) => ({
				// État initial - Formulaire
				draftProduct: { ...initialFormState },

				defaultValues: {
					unitType: 'UNIT',
					storageLocation: '',
					purchaseDate: new Date().toISOString().split('T')[0],
				},

				recentValues: {
					brands: [],
					categories: [],
					storageLocations: [],
				},

				inventoryFilters: {},

				// État initial - Données
				items: [],
				isLoading: false,
				error: null,

				// Actions pour le formulaire
				updateDraftProduct: (updates) =>
					set((state) => ({
						draftProduct: { ...state.draftProduct, ...updates },
					})),

				clearDraftProduct: () =>
					set(() => ({
						draftProduct: {
							...initialFormState,
							purchaseDate: new Date()
								.toISOString()
								.split('T')[0], // Toujours la date actuelle
						},
					})),

				saveDraftProduct: (product) =>
					set(() => ({
						draftProduct: product,
					})),

				// Actions pour les valeurs par défaut
				updateDefaultValues: (defaults) =>
					set((state) => ({
						defaultValues: { ...state.defaultValues, ...defaults },
					})),

				// Actions pour les valeurs récentes
				addRecentValue: (type, value) =>
					set((state) => {
						const currentValues = state.recentValues[type];
						const trimmedValue = value.trim();

						if (
							!trimmedValue ||
							currentValues.includes(trimmedValue)
						) {
							return state;
						}

						// Garder seulement les 10 dernières valeurs
						const newValues = [
							trimmedValue,
							...currentValues,
						].slice(0, 10);

						return {
							recentValues: {
								...state.recentValues,
								[type]: newValues,
							},
						};
					}),

				// Actions pour les filtres
				setInventoryFilters: (filters) =>
					set(() => ({ inventoryFilters: filters })),

				clearInventoryFilters: () =>
					set(() => ({ inventoryFilters: {} })),

				// Actions pour les données d'inventaire
				fetchInventoryItems: async (filters) => {
					set({ isLoading: true, error: null });
					try {
						const items = await inventoryService.getInventory(
							filters || get().inventoryFilters
						);
						set({ items, isLoading: false });
					} catch (error) {
						set({
							error:
								error instanceof Error
									? error.message
									: "Erreur lors du chargement de l'inventaire",
							isLoading: false,
						});
					}
				},

				addInventoryItem: async (productData) => {
					set({ isLoading: true, error: null });
					try {
						const response =
							await inventoryService.addManualProduct(
								productData
							);
						console.log(response);
						// Ajouter les valeurs récentes
						const { addRecentValue } = get();
						if (productData.brand)
							addRecentValue('brands', productData.brand);
						if (productData.category)
							addRecentValue('categories', productData.category);
						if (productData.storageLocation)
							addRecentValue(
								'storageLocations',
								productData.storageLocation
							);

						// Recharger l'inventaire pour avoir la structure complète
						// Car la réponse de création ne contient pas toutes les infos du produit
						await get().fetchInventoryItems();

						// Réinitialiser le formulaire
						get().clearDraftProduct();
					} catch (error) {
						set({
							error:
								error instanceof Error
									? error.message
									: "Erreur lors de l'ajout du produit",
							isLoading: false,
						});
						throw error; // Re-throw pour que le composant puisse gérer l'erreur
					}
				},

				updateInventoryItem: async (id, updates) => {
					set({ isLoading: true, error: null });
					try {
						const updatedItem =
							await inventoryService.updateInventoryItem(
								id,
								updates
							);
						set((state) => ({
							items: state.items.map((item) =>
								item.id === id ? updatedItem : item
							),
							isLoading: false,
						}));
					} catch (error) {
						set({
							error:
								error instanceof Error
									? error.message
									: 'Erreur lors de la mise à jour du produit',
							isLoading: false,
						});
						throw error;
					}
				},

				removeInventoryItem: async (id) => {
					set({ isLoading: true, error: null });
					try {
						await inventoryService.removeInventoryItem(id);
						set((state) => ({
							items: state.items.filter((item) => item.id !== id),
							isLoading: false,
						}));
					} catch (error) {
						set({
							error:
								error instanceof Error
									? error.message
									: 'Erreur lors de la suppression du produit',
							isLoading: false,
						});
						throw error;
					}
				},

				clearError: () => set({ error: null }),
			}),
			{
				name: 'ineat-inventory-store',
				partialize: (state): PersistedInventoryState => ({
					// Persister seulement certaines parties de l'état
					defaultValues: state.defaultValues,
					recentValues: state.recentValues,
					inventoryFilters: state.inventoryFilters,
					// Ne pas persister le draftProduct, les items ou les états de chargement
				}),
				version: 1,
				migrate: (
					persistedState: unknown,
					version: number
				): PersistedInventoryState => {
					// Vérifier que l'état persisté est un objet valide
					const state = persistedState as LegacyPersistedState | null;

					// Migration des données si nécessaire lors des mises à jour
					if (version === 0) {
						// Migration depuis la version 0 vers 1
						return {
							defaultValues: state?.defaultValues || {
								unitType: 'UNIT',
								storageLocation: '',
								purchaseDate: new Date()
									.toISOString()
									.split('T')[0],
							},
							recentValues: {
								brands: state?.recentValues?.brands || [],
								categories:
									state?.recentValues?.categories || [],
								storageLocations:
									state?.recentValues?.storageLocations || [],
							},
							inventoryFilters: state?.inventoryFilters || {},
						};
					}

					// Pour les versions futures, retourner l'état tel quel (en le castant au bon type)
					return state as PersistedInventoryState;
				},
			}
		)
	)
);

// Sélecteurs stables pour les données d'inventaire
export const useInventoryItems = () =>
	useInventoryStore(useCallback((state) => state.items, []));

export const useInventoryLoading = () =>
	useInventoryStore(useCallback((state) => state.isLoading, []));

export const useInventoryError = () =>
	useInventoryStore(useCallback((state) => state.error, []));

// Sélecteur pour l'état du formulaire - STABLE
export const useInventoryFormState = () =>
	useInventoryStore(useCallback((state) => state.draftProduct, []));

// Sélecteur pour les valeurs par défaut - STABLE
export const useInventoryDefaultValues = () =>
	useInventoryStore(useCallback((state) => state.defaultValues, []));

// Sélecteur pour les valeurs récentes - STABLE
export const useInventoryRecentValues = () =>
	useInventoryStore(useCallback((state) => state.recentValues, []));

// Sélecteur pour les filtres - STABLE
export const useInventoryFilters = () =>
	useInventoryStore(useCallback((state) => state.inventoryFilters, []));

// Actions stables avec des références fixes
const stableActions: InventoryActions = {
	updateDraftProduct: null as unknown as (
		updates: Partial<AddManualProductInput>
	) => void,
	clearDraftProduct: null as unknown as () => void,
	saveDraftProduct: null as unknown as (
		product: Partial<AddManualProductInput>
	) => void,
	updateDefaultValues: null as unknown as (
		defaults: Partial<InventoryFormState['defaultValues']>
	) => void,
	addRecentValue: null as unknown as (
		type: keyof InventoryFormState['recentValues'],
		value: string
	) => void,
	setInventoryFilters: null as unknown as (filters: InventoryFilters) => void,
	clearInventoryFilters: null as unknown as () => void,
	fetchInventoryItems: null as unknown as (
		filters?: InventoryFilters
	) => Promise<void>,
	addInventoryItem: null as unknown as (
		productData: AddManualProductInput
	) => Promise<void>,
	updateInventoryItem: null as unknown as (
		id: string,
		updates: UpdateInventoryItemInput
	) => Promise<void>,
	removeInventoryItem: null as unknown as (id: string) => Promise<void>,
	clearError: null as unknown as () => void,
};

// Initialiser les actions stables une seule fois
let actionsInitialized = false;

export const useInventoryActions = () => {
	if (!actionsInitialized) {
		const store = useInventoryStore.getState();
		stableActions.updateDraftProduct = store.updateDraftProduct;
		stableActions.clearDraftProduct = store.clearDraftProduct;
		stableActions.saveDraftProduct = store.saveDraftProduct;
		stableActions.updateDefaultValues = store.updateDefaultValues;
		stableActions.addRecentValue = store.addRecentValue;
		stableActions.setInventoryFilters = store.setInventoryFilters;
		stableActions.clearInventoryFilters = store.clearInventoryFilters;
		stableActions.fetchInventoryItems = store.fetchInventoryItems;
		stableActions.addInventoryItem = store.addInventoryItem;
		stableActions.updateInventoryItem = store.updateInventoryItem;
		stableActions.removeInventoryItem = store.removeInventoryItem;
		stableActions.clearError = store.clearError;
		actionsInitialized = true;
	}

	return stableActions;
};

// Hook utilitaire pour réinitialiser le formulaire avec les valeurs par défaut
export const useResetFormWithDefaults = () => {
	const defaultValues = useInventoryDefaultValues();
	const { clearDraftProduct, updateDraftProduct } = useInventoryActions();

	return useCallback(() => {
		clearDraftProduct();
		updateDraftProduct({
			unitType: defaultValues.unitType,
			storageLocation: defaultValues.storageLocation,
			purchaseDate: new Date().toISOString().split('T')[0], // Toujours aujourd'hui
		});
	}, [
		defaultValues.unitType,
		defaultValues.storageLocation,
		clearDraftProduct,
		updateDraftProduct,
	]);
};

// Hook pour sauvegarder automatiquement les valeurs récentes après une saisie réussie
export const useSaveRecentValues = () => {
	const { addRecentValue } = useInventoryActions();

	return useCallback(
		(product: AddManualProductInput) => {
			if (product.brand) {
				addRecentValue('brands', product.brand);
			}
			if (product.category) {
				addRecentValue('categories', product.category);
			}
			if (product.storageLocation) {
				addRecentValue('storageLocations', product.storageLocation);
			}
		},
		[addRecentValue]
	);
};

// Store séparé pour l'état de l'interface utilisateur (non persisté)
interface InventoryUIState {
	// État de l'interface
	isFormExpanded: boolean;
	activeSection: 'basic' | 'quantity' | 'dates' | 'nutrition' | 'notes';
	showAdvancedOptions: boolean;

	// Actions
	setFormExpanded: (expanded: boolean) => void;
	setActiveSection: (section: InventoryUIState['activeSection']) => void;
	toggleAdvancedOptions: () => void;
}

export const useInventoryUIStore = create<InventoryUIState>((set) => ({
	isFormExpanded: false,
	activeSection: 'basic',
	showAdvancedOptions: false,

	setFormExpanded: (expanded) => set({ isFormExpanded: expanded }),
	setActiveSection: (section) => set({ activeSection: section }),
	toggleAdvancedOptions: () =>
		set((state) => ({
			showAdvancedOptions: !state.showAdvancedOptions,
		})),
}));
