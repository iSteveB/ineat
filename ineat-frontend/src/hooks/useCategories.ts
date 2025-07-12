import { useQuery } from '@tanstack/react-query';

// ===== IMPORTS SERVICES =====
import { inventoryService } from '@/services/inventoryService';

// ===== IMPORTS SCHÉMAS ZOD =====
import { Category } from '@/schemas';

/**
 * Hook pour récupérer la liste des catégories de produits
 *
 * @returns Query object avec les catégories
 */
export function useCategories() {
	return useQuery<Category[], Error>({
		queryKey: ['categories'],
		queryFn: () => inventoryService.getCategories(),
		staleTime: 5 * 60 * 1000, // 5 minutes - les catégories changent rarement
		gcTime: 10 * 60 * 1000, // 10 minutes en cache
		retry: 2, // Réessayer 2 fois en cas d'échec
	});
}

/**
 * Hook pour récupérer une catégorie spécifique par son ID
 *
 * @param categoryId ID de la catégorie
 * @returns Query object avec la catégorie
 */
export function useCategory(categoryId: string | undefined) {
	return useQuery<Category | undefined, Error>({
		queryKey: ['categories', categoryId],
		queryFn: async () => {
			if (!categoryId) return undefined;

			const categories = await inventoryService.getCategories();
			return categories.find((cat) => cat.id === categoryId);
		},
		enabled: !!categoryId, // N'exécuter que si categoryId est défini
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
}

/**
 * Hook pour récupérer les catégories organisées en arbre (parent/enfant)
 *
 * @returns Query object avec les catégories organisées
 */
export function useCategoriesTree() {
	return useQuery<Category[], Error>({
		queryKey: ['categories', 'tree'],
		queryFn: async () => {
			const categories = await inventoryService.getCategories();

			// Organiser les catégories en arbre
			const rootCategories = categories.filter((cat) => !cat.parentId);
			const childCategories = categories.filter((cat) => cat.parentId);

			// Attacher les enfants aux parents
			const categoriesWithChildren = rootCategories.map((parent) => ({
				...parent,
				children: childCategories.filter(
					(child) => child.parentId === parent.id
				),
			}));

			return categoriesWithChildren;
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
}

/**
 * Hook pour rechercher des catégories par nom
 *
 * @param searchTerm Terme de recherche
 * @returns Query object avec les catégories filtrées
 */
export function useSearchCategories(searchTerm: string) {
	return useQuery<Category[], Error>({
		queryKey: ['categories', 'search', searchTerm],
		queryFn: async () => {
			const categories = await inventoryService.getCategories();

			if (!searchTerm.trim()) {
				return categories;
			}

			const lowercaseSearch = searchTerm.toLowerCase();
			return categories.filter(
				(cat) =>
					cat.name.toLowerCase().includes(lowercaseSearch) ||
					cat.slug.toLowerCase().includes(lowercaseSearch)
			);
		},
		enabled: searchTerm.length >= 2, // Rechercher seulement si au moins 2 caractères
		staleTime: 2 * 60 * 1000, // Plus courte durée pour la recherche
		gcTime: 5 * 60 * 1000,
	});
}

/**
 * Hook utilitaire pour obtenir le libellé d'une catégorie par son slug
 *
 * @param slug Slug de la catégorie
 * @returns Nom de la catégorie ou le slug si non trouvé
 */
export function useCategoryLabel(slug: string | undefined) {
	const { data: categories } = useCategories();

	if (!slug || !categories) {
		return slug || 'Catégorie inconnue';
	}

	const category = categories.find((cat) => cat.slug === slug);
	return category?.name || slug;
}

/**
 * Hook utilitaire pour valider qu'une catégorie existe
 *
 * @param categoryId ID de la catégorie à valider
 * @returns Booléen indiquant si la catégorie existe
 */
export function useCategoryExists(categoryId: string | undefined) {
	const { data: categories, isLoading } = useCategories();

	if (isLoading || !categoryId) {
		return false;
	}

	return categories?.some((cat) => cat.id === categoryId) ?? false;
}
