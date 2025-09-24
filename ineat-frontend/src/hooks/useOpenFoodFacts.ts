import { useState, useCallback } from 'react';
import { openFoodFactsService } from '@/services/openFoodFactsServices';
import { OffError } from '@/schemas/openfoodfact';
import {
	OpenFoodFactsMapping,
	MappingOptions,
	QUALITY_THRESHOLDS,
} from '@/schemas/openfoodfact-mapping';

/**
 * État de la requête OpenFoodFacts
 */
interface UseOpenFoodFactsState {
	// Données produit complètes
	product: OpenFoodFactsMapping | null;
	loading: boolean;
	error: OffError | null;
}

/**
 * Résultat du hook useOpenFoodFacts
 */
interface UseOpenFoodFactsResult {
	// État
	product: OpenFoodFactsMapping | null;
	loading: boolean;
	error: OffError | null;

	// Actions
	searchByBarcode: (
		barcode: string,
		options?: Partial<MappingOptions>
	) => Promise<void>;

	searchProduct: (
		barcode: string,
		options?: Partial<MappingOptions>
	) => Promise<OpenFoodFactsMapping | null>;

	reset: () => void;
}

/**
 * Hook personnalisé pour interagir avec OpenFoodFacts
 *
 * @example
 * ```tsx
 * const { searchByBarcode, product, loading, error } = useOpenFoodFacts();
 *
 * const handleSearch = async () => {
 *   await searchByBarcode('3017624010701', {
 *     preferredLanguage: 'fr',
 *     requireImage: true
 *   });
 *
 *   if (product) {
 *     console.log('Nutriscore:', product.nutriscore);
 *     console.log('Ingrédients:', product.ingredients);
 *     console.log('Qualité:', product.quality.completeness);
 *   }
 * };
 * ```
 */
export const useOpenFoodFacts = (): UseOpenFoodFactsResult => {
	const [state, setState] = useState<UseOpenFoodFactsState>({
		product: null,
		loading: false,
		error: null,
	});

	/**
	 * Recherche un produit par code-barre
	 */
	const searchByBarcode = useCallback(
		async (
			barcode: string,
			options: Partial<MappingOptions> = {}
		): Promise<void> => {
			setState((prev) => ({
				...prev,
				loading: true,
				error: null,
			}));

			try {
				const product =
					await openFoodFactsService.getEnrichedProductByBarcode(
						barcode,
						{
							preferredLanguage: 'fr',
							requireMinimalNutrients: false,
							requireImage: false,
							requireIngredients: false,
							qualityThreshold: QUALITY_THRESHOLDS.MINIMAL,
							...options,
						}
					);

				if (product) {
					setState((prev) => ({
						...prev,
						product,
						loading: false,
						error: null,
					}));
				} else {
					setState((prev) => ({
						...prev,
						product: null,
						loading: false,
						error: {
							type: 'PRODUCT_NOT_FOUND',
							message: `Produit avec le code-barre ${barcode} non trouvé dans OpenFoodFacts`,
						},
					}));
				}
			} catch (error: unknown) {
				setState((prev) => ({
					...prev,
					product: null,
					loading: false,
					error: error as OffError,
				}));
			}
		},
		[]
	);

	/**
	 * Recherche qui retourne directement le produit
	 */
	const searchProduct = useCallback(
		async (
			barcode: string,
			options: Partial<MappingOptions> = {}
		): Promise<OpenFoodFactsMapping | null> => {
			try {
				return await openFoodFactsService.getEnrichedProductByBarcode(
					barcode,
					{
						preferredLanguage: 'fr',
						requireMinimalNutrients: false,
						requireImage: false,
						requireIngredients: false,
						qualityThreshold: QUALITY_THRESHOLDS.MINIMAL,
						...options,
					}
				);
			} catch (error: unknown) {
				console.error('Erreur recherche produit:', error);
				throw error;
			}
		},
		[]
	);

	/**
	 * Remet à zéro l'état du hook
	 */
	const reset = useCallback((): void => {
		setState({
			product: null,
			loading: false,
			error: null,
		});
	}, []);

	return {
		// État
		product: state.product,
		loading: state.loading,
		error: state.error,

		// Actions
		searchByBarcode,
		searchProduct,
		reset,
	};
};

/**
 * Hook simplifié pour une recherche unique
 */
export const useOpenFoodFactsSearch = () => {
	return useCallback(
		async (
			barcode: string,
			options: Partial<MappingOptions> = {}
		): Promise<{
			success: boolean;
			product?: OpenFoodFactsMapping;
			error?: OffError;
		}> => {
			try {
				const product =
					await openFoodFactsService.getEnrichedProductByBarcode(
						barcode,
						{
							preferredLanguage: 'fr',
							requireMinimalNutrients: false,
							requireImage: false,
							requireIngredients: false,
							qualityThreshold: QUALITY_THRESHOLDS.MINIMAL,
							...options,
						}
					);

				if (product) {
					return {
						success: true,
						product,
					};
				} else {
					return {
						success: false,
						error: {
							type: 'PRODUCT_NOT_FOUND',
							message: `Produit avec le code-barre ${barcode} non trouvé`,
						},
					};
				}
			} catch (error: unknown) {
				return {
					success: false,
					error: error as OffError,
				};
			}
		},
		[]
	);
};
