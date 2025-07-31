import { useState, useCallback } from 'react';
import { openFoodFactsService } from '@/services/openFoodFactsServices';
import {
	OffProduct,
	OffError,
	OFF_MINIMAL_FIELDS,
} from '@/schemas/openfoodfact';
import { Product } from '@/schemas/product';

/**
 * État de la requête OpenFoodFacts
 */
interface UseOpenFoodFactsState {
	data: OffProduct | null;
	localProduct: Partial<Product> | null;
	loading: boolean;
	error: OffError | null;
}

/**
 * Résultat du hook useOpenFoodFacts
 */
interface UseOpenFoodFactsResult {
	// État
	data: OffProduct | null;
	localProduct: Partial<Product> | null;
	loading: boolean;
	error: OffError | null;

	// Actions
	searchByBarcode: (barcode: string, fields?: string[]) => Promise<void>;
	getImageUrl: (
		size?: '100' | '200' | '400' | 'full',
		language?: string
	) => string | null;
	getCategoryString: () => string;
	reset: () => void;
}

/**
 * Hook personnalisé pour interagir avec OpenFoodFacts
 *
 * @example
 * ```tsx
 * const { searchByBarcode, data, localProduct, loading, error } = useOpenFoodFacts();
 *
 * const handleSearch = async () => {
 *   await searchByBarcode('3017624010701');
 *   if (localProduct) {
 *     // Utiliser localProduct pour pré-remplir le formulaire
 *   }
 * };
 * ```
 */
export const useOpenFoodFacts = (): UseOpenFoodFactsResult => {
	const [state, setState] = useState<UseOpenFoodFactsState>({
		data: null,
		localProduct: null,
		loading: false,
		error: null,
	});

	/**
	 * Recherche un produit par code-barre
	 * @param barcode Code-barre du produit
	 * @param fields Champs spécifiques à récupérer (optionnel)
	 */
	const searchByBarcode = useCallback(
		async (barcode: string, fields?: string[]): Promise<void> => {
			setState((prev) => ({
				...prev,
				loading: true,
				error: null,
			}));

			try {
				const offProduct =
					await openFoodFactsService.getProductByBarcode(
						barcode,
						fields || [...OFF_MINIMAL_FIELDS]
					);

				if (offProduct) {
					const mappedProduct =
						openFoodFactsService.mapToLocalProduct(offProduct);
					setState((prev) => ({
						...prev,
						data: offProduct,
						localProduct: mappedProduct,
						loading: false,
						error: null,
					}));
				} else {
					// Produit non trouvé
					setState((prev) => ({
						...prev,
						data: null,
						localProduct: null,
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
					data: null,
					localProduct: null,
					loading: false,
					error: error as OffError,
				}));
			}
		},
		[]
	);

	/**
	 * Récupère l'URL de l'image du produit actuel
	 * @param size Taille souhaitée
	 * @param language Langue préférée
	 * @returns URL de l'image ou null
	 */
	const getImageUrl = useCallback(
		(
			size: '100' | '200' | '400' | 'full' = '400',
			language: string = 'fr'
		): string | null => {
			if (!state.data) return null;

			return openFoodFactsService.getProductImageUrl(
				state.data,
				size,
				language
			);
		},
		[state.data]
	);

	/**
	 * Récupère la catégorie principale comme string
	 * @returns Catégorie formatée ou '-'
	 */
	const getCategoryString = useCallback((): string => {
		if (!state.data) return '-';

		return openFoodFactsService.getMainCategoryString(state.data);
	}, [state.data]);

	/**
	 * Remet à zéro l'état du hook
	 */
	const reset = useCallback((): void => {
		setState({
			data: null,
			localProduct: null,
			loading: false,
			error: null,
		});
	}, []);

	return {
		// État
		data: state.data,
		localProduct: state.localProduct,
		loading: state.loading,
		error: state.error,

		// Actions
		searchByBarcode,
		getImageUrl,
		getCategoryString,
		reset,
	};
};

/**
 * Hook simplifié pour une recherche unique
 * Utile quand on veut juste faire une recherche ponctuelle
 *
 * @example
 * ```tsx
 * const searchProduct = useOpenFoodFactsSearch();
 *
 * const handleScan = async (barcode: string) => {
 *   const result = await searchProduct(barcode);
 *   if (result.success) {
 *     console.log(result.localProduct);
 *   } else {
 *     console.error(result.error);
 *   }
 * };
 * ```
 */
export const useOpenFoodFactsSearch = () => {
	return useCallback(
		async (
			barcode: string,
			fields?: string[]
		): Promise<{
			success: boolean;
			data?: OffProduct;
			localProduct?: Partial<Product>;
			error?: OffError;
		}> => {
			try {
				const offProduct =
					await openFoodFactsService.getProductByBarcode(
						barcode,
						fields
					);

				if (offProduct) {
					const mappedProduct =
						openFoodFactsService.mapToLocalProduct(offProduct);
					return {
						success: true,
						data: offProduct,
						localProduct: mappedProduct,
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
