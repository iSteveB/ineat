import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { useCallback } from 'react';

// ===== IMPORTS SCHÉMAS ZOD =====
import {
	AddInventoryItemData,
	UnitType,
	InventoryFilters,
	InventoryItem,
	InventoryItemWithStatus,
	UpdateInventoryItemData,
	validateSchema,
	AddInventoryItemSchema,
	InventoryFiltersSchema,
	addExpiryStatusToItem,
} from '@/schemas';

// ===== IMPORTS SERVICES =====
import { inventoryService } from '@/services/inventoryService';

// ===== INTERFACES DU STORE =====

// Types pour l'état du formulaire d'inventaire
interface InventoryFormState {
	// État du formulaire d'ajout manuel
	draftProduct: Partial<AddInventoryItemData>;

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

	// Actions du formulaire
	updateDraftProduct: (updates: Partial<AddInventoryItemData>) => void;
	clearDraftProduct: () => void;
	saveDraftProduct: (product: Partial<AddInventoryItemData>) => void;
	validateDraftProduct: () => { isValid: boolean; errors: string[] };

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
	items: InventoryItemWithStatus[];
	isLoading: boolean;
	error: string | null;

	// Actions des données
	fetchInventoryItems: (filters?: InventoryFilters) => Promise<void>;
	addInventoryItem: (productData: AddInventoryItemData) => Promise<void>;
	updateInventoryItem: (
		id: string,
		updates: UpdateInventoryItemData
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
	| 'validateDraftProduct'
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

// ===== ÉTAT INITIAL =====

// État initial du formulaire (conforme au schéma AddInventoryItemData)
const initialFormState: Partial<AddInventoryItemData> = {
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
	barcode: '',
};

// ===== UTILITAIRES DE VALIDATION =====

/**
 * Valide les données du produit avec le schéma Zod
 */
const validateProductData = (
	data: Partial<AddInventoryItemData>
): { isValid: boolean; errors: string[] } => {
	const validation = validateSchema(AddInventoryItemSchema, data);
	if (validation.success) {
		return { isValid: true, errors: [] };
	}
	return { isValid: false, errors: [validation.error] };
};

/**
 * Valide les filtres d'inventaire
 */
const validateInventoryFilters = (
	filters: unknown
): filters is InventoryFilters => {
	const validation = validateSchema(InventoryFiltersSchema, filters);
	return validation.success;
};

/**
 * Nettoie et valide une valeur récente
 */
const sanitizeRecentValue = (value: string): string | null => {
	const trimmed = value.trim();
	return trimmed.length > 0 && trimmed.length <= 100 ? trimmed : null;
};

// ===== STORE PRINCIPAL =====

export const useInventoryStore = create<InventoryState>()(
	subscribeWithSelector(
		persist(
			(set, get) => ({
				// ===== ÉTAT INITIAL - FORMULAIRE =====
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

				// ===== ÉTAT INITIAL - DONNÉES =====
				items: [],
				isLoading: false,
				error: null,

				// ===== ACTIONS POUR LE FORMULAIRE =====

				/**
				 * Met à jour le produit en cours d'édition
				 */
				updateDraftProduct: (updates) => {
					set((state) => ({
						draftProduct: { ...state.draftProduct, ...updates },
					}));
				},

				/**
				 * Réinitialise le formulaire
				 */
				clearDraftProduct: () => {
					set(() => ({
						draftProduct: {
							...initialFormState,
							purchaseDate: new Date()
								.toISOString()
								.split('T')[0],
						},
					}));
				},

				/**
				 * Sauvegarde le brouillon
				 */
				saveDraftProduct: (product) => {
					set(() => ({
						draftProduct: product,
					}));
				},

				/**
				 * Valide le produit en cours d'édition
				 */
				validateDraftProduct: () => {
					const { draftProduct } = get();
					return validateProductData(draftProduct);
				},

				// ===== ACTIONS POUR LES VALEURS PAR DÉFAUT =====

				/**
				 * Met à jour les valeurs par défaut
				 */
				updateDefaultValues: (defaults) => {
					set((state) => ({
						defaultValues: { ...state.defaultValues, ...defaults },
					}));
				},

				// ===== ACTIONS POUR LES VALEURS RÉCENTES =====

				/**
				 * Ajoute une valeur récente (marque, catégorie, lieu de stockage)
				 */
				addRecentValue: (type, value) => {
					const sanitizedValue = sanitizeRecentValue(value);
					if (!sanitizedValue) return;

					set((state) => {
						const currentValues = state.recentValues[type];

						// Éviter les doublons
						if (currentValues.includes(sanitizedValue)) {
							return state;
						}

						// Garder seulement les 10 dernières valeurs
						const newValues = [
							sanitizedValue,
							...currentValues,
						].slice(0, 10);

						return {
							recentValues: {
								...state.recentValues,
								[type]: newValues,
							},
						};
					});
				},

				// ===== ACTIONS POUR LES FILTRES =====

				/**
				 * Définit les filtres d'inventaire
				 */
				setInventoryFilters: (filters) => {
					// Validation des filtres avant sauvegarde
					if (validateInventoryFilters(filters)) {
						set(() => ({ inventoryFilters: filters }));
					} else {
						console.warn(
							"Filtres d'inventaire invalides:",
							filters
						);
					}
				},

				/**
				 * Efface tous les filtres
				 */
				clearInventoryFilters: () => {
					set(() => ({ inventoryFilters: {} }));
				},

				// ===== ACTIONS POUR LES DONNÉES D'INVENTAIRE =====

				/**
				 * Récupère les items d'inventaire
				 */
				fetchInventoryItems: async (filters) => {
					set({ isLoading: true, error: null });
					try {
						const appliedFilters =
							filters || get().inventoryFilters;
						const rawItems = await inventoryService.getInventory(
							appliedFilters
						);

						// Validation que les items sont bien conformes
						if (Array.isArray(rawItems)) {
							// Enrichir chaque item avec le statut d'expiration
							const enrichedItems: InventoryItemWithStatus[] =
								rawItems.map((item: InventoryItem) =>
									addExpiryStatusToItem(item)
								);

							set({ items: enrichedItems, isLoading: false });
						} else {
							throw new Error('Format de réponse invalide');
						}
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

				/**
				 * Ajoute un nouveau produit à l'inventaire
				 */
				addInventoryItem: async (productData) => {
					// Validation des données avant envoi
					const validation = validateProductData(productData);
					if (!validation.isValid) {
						const errorMessage = `Données invalides: ${validation.errors.join(
							', '
						)}`;
						set({ error: errorMessage });
						throw new Error(errorMessage);
					}

					set({ isLoading: true, error: null });
					try {
						const response =
							await inventoryService.addManualProduct(
								productData
							);
						console.log('Produit ajouté:', response);

						// Ajouter les valeurs récentes
						const { addRecentValue } = get();
						if (productData.brand) {
							addRecentValue('brands', productData.brand);
						}
						if (productData.category) {
							addRecentValue('categories', productData.category);
						}
						if (productData.storageLocation) {
							addRecentValue(
								'storageLocations',
								productData.storageLocation
							);
						}

						// Recharger l'inventaire pour avoir la structure complète
						await get().fetchInventoryItems();

						// Réinitialiser le formulaire
						get().clearDraftProduct();
					} catch (error) {
						const errorMessage =
							error instanceof Error
								? error.message
								: "Erreur lors de l'ajout du produit";

						set({
							error: errorMessage,
							isLoading: false,
						});
						throw new Error(errorMessage);
					}
				},

				/**
				 * Met à jour un item d'inventaire
				 */
				updateInventoryItem: async (id, updates) => {
					if (!id || typeof id !== 'string') {
						throw new Error("ID d'item invalide");
					}

					set({ isLoading: true, error: null });
					try {
						const updatedRawItem =
							await inventoryService.updateInventoryItem(
								id,
								updates
							);

						// Enrichir l'item mis à jour avec le statut d'expiration
						const updatedItem =
							addExpiryStatusToItem(updatedRawItem);

						set((state) => ({
							items: state.items.map((item) =>
								item.id === id ? updatedItem : item
							),
							isLoading: false,
						}));
					} catch (error) {
						const errorMessage =
							error instanceof Error
								? error.message
								: 'Erreur lors de la mise à jour du produit';

						set({
							error: errorMessage,
							isLoading: false,
						});
						throw new Error(errorMessage);
					}
				},

				/**
				 * Supprime un item d'inventaire
				 */
				removeInventoryItem: async (id) => {
					if (!id || typeof id !== 'string') {
						throw new Error("ID d'item invalide");
					}

					set({ isLoading: true, error: null });
					try {
						await inventoryService.removeInventoryItem(id);

						set((state) => ({
							items: state.items.filter((item) => item.id !== id),
							isLoading: false,
						}));
					} catch (error) {
						const errorMessage =
							error instanceof Error
								? error.message
								: 'Erreur lors de la suppression du produit';

						set({
							error: errorMessage,
							isLoading: false,
						});
						throw new Error(errorMessage);
					}
				},

				/**
				 * Efface l'erreur actuelle
				 */
				clearError: () => set({ error: null }),
			}),
			{
				name: 'ineat-inventory-store',
				partialize: (state): PersistedInventoryState => ({
					// Persister seulement certaines parties de l'état
					defaultValues: state.defaultValues,
					recentValues: state.recentValues,
					inventoryFilters: state.inventoryFilters,
				}),
				version: 2, // Incrémenté pour la migration Zod
				migrate: (
					persistedState: unknown,
					version: number
				): PersistedInventoryState => {
					// Vérifier que l'état persisté est un objet valide
					if (!persistedState || typeof persistedState !== 'object') {
						return {
							defaultValues: {
								unitType: 'UNIT',
								storageLocation: '',
								purchaseDate: new Date()
									.toISOString()
									.split('T')[0],
							},
							recentValues: {
								brands: [],
								categories: [],
								storageLocations: [],
							},
							inventoryFilters: {},
						};
					}

					const state = persistedState as LegacyPersistedState;

					// Migration vers la version 2 (schémas Zod)
					if (version < 2) {
						console.log(
							'Migration du store inventaire vers les schémas Zod...'
						);

						return {
							defaultValues: {
								unitType:
									(state.defaultValues
										?.unitType as UnitType) || 'UNIT',
								storageLocation:
									state.defaultValues?.storageLocation || '',
								purchaseDate:
									state.defaultValues?.purchaseDate ||
									new Date().toISOString().split('T')[0],
							},
							recentValues: {
								brands: Array.isArray(
									state.recentValues?.brands
								)
									? state.recentValues.brands.filter(
											(v) => typeof v === 'string'
									  )
									: [],
								categories: Array.isArray(
									state.recentValues?.categories
								)
									? state.recentValues.categories.filter(
											(v) => typeof v === 'string'
									  )
									: [],
								storageLocations: Array.isArray(
									state.recentValues?.storageLocations
								)
									? state.recentValues.storageLocations.filter(
											(v) => typeof v === 'string'
									  )
									: [],
							},
							inventoryFilters: validateInventoryFilters(
								state.inventoryFilters
							)
								? state.inventoryFilters
								: {},
						};
					}

					// Pour les versions futures, retourner l'état tel quel
					return state as PersistedInventoryState;
				},
			}
		)
	)
);

// ===== SÉLECTEURS STABLES =====

export const useInventoryItems = () =>
	useInventoryStore(useCallback((state) => state.items, []));

export const useInventoryLoading = () =>
	useInventoryStore(useCallback((state) => state.isLoading, []));

export const useInventoryError = () =>
	useInventoryStore(useCallback((state) => state.error, []));

export const useInventoryFormState = () =>
	useInventoryStore(useCallback((state) => state.draftProduct, []));

export const useInventoryDefaultValues = () =>
	useInventoryStore(useCallback((state) => state.defaultValues, []));

export const useInventoryRecentValues = () =>
	useInventoryStore(useCallback((state) => state.recentValues, []));

export const useInventoryFilters = () =>
	useInventoryStore(useCallback((state) => state.inventoryFilters, []));

// ===== ACTIONS STABLES =====

const stableActions: InventoryActions = {} as InventoryActions;
let actionsInitialized = false;

export const useInventoryActions = () => {
	if (!actionsInitialized) {
		const store = useInventoryStore.getState();
		Object.assign(stableActions, {
			updateDraftProduct: store.updateDraftProduct,
			clearDraftProduct: store.clearDraftProduct,
			saveDraftProduct: store.saveDraftProduct,
			validateDraftProduct: store.validateDraftProduct,
			updateDefaultValues: store.updateDefaultValues,
			addRecentValue: store.addRecentValue,
			setInventoryFilters: store.setInventoryFilters,
			clearInventoryFilters: store.clearInventoryFilters,
			fetchInventoryItems: store.fetchInventoryItems,
			addInventoryItem: store.addInventoryItem,
			updateInventoryItem: store.updateInventoryItem,
			removeInventoryItem: store.removeInventoryItem,
			clearError: store.clearError,
		});
		actionsInitialized = true;
	}

	return stableActions;
};

// ===== HOOKS UTILITAIRES =====

/**
 * Hook pour réinitialiser le formulaire avec les valeurs par défaut
 */
export const useResetFormWithDefaults = () => {
	const defaultValues = useInventoryDefaultValues();
	const { clearDraftProduct, updateDraftProduct } = useInventoryActions();

	return useCallback(() => {
		clearDraftProduct();
		updateDraftProduct({
			unitType: defaultValues.unitType,
			storageLocation: defaultValues.storageLocation,
			purchaseDate: new Date().toISOString().split('T')[0],
		});
	}, [
		defaultValues.unitType,
		defaultValues.storageLocation,
		clearDraftProduct,
		updateDraftProduct,
	]);
};

/**
 * Hook pour sauvegarder automatiquement les valeurs récentes
 */
export const useSaveRecentValues = () => {
	const { addRecentValue } = useInventoryActions();

	return useCallback(
		(product: AddInventoryItemData) => {
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

/**
 * Hook pour valider le formulaire en temps réel
 */
export const useValidateForm = () => {
	const { validateDraftProduct } = useInventoryActions();
	return validateDraftProduct;
};

// ===== STORE UI (NON PERSISTÉ) =====

interface InventoryUIState {
	// État de l'interface
	isFormExpanded: boolean;
	activeSection: 'basic' | 'quantity' | 'dates' | 'nutrition' | 'notes';
	showAdvancedOptions: boolean;

	// Actions
	setFormExpanded: (expanded: boolean) => void;
	setActiveSection: (section: InventoryUIState['activeSection']) => void;
	toggleAdvancedOptions: () => void;
	resetUI: () => void;
}

export const useInventoryUIStore = create<InventoryUIState>((set) => ({
	// État initial
	isFormExpanded: false,
	activeSection: 'basic',
	showAdvancedOptions: false,

	// Actions
	setFormExpanded: (expanded) => set({ isFormExpanded: expanded }),

	setActiveSection: (section) => set({ activeSection: section }),

	toggleAdvancedOptions: () =>
		set((state) => ({
			showAdvancedOptions: !state.showAdvancedOptions,
		})),

	resetUI: () =>
		set({
			isFormExpanded: false,
			activeSection: 'basic',
			showAdvancedOptions: false,
		}),
}));

// ===== HOOKS UI =====

export const useInventoryUI = () => useInventoryUIStore();

export const useInventoryFormExpanded = () =>
	useInventoryUIStore((state) => state.isFormExpanded);

export const useInventoryActiveSection = () =>
	useInventoryUIStore((state) => state.activeSection);

export const useInventoryAdvancedOptions = () =>
	useInventoryUIStore((state) => state.showAdvancedOptions);
