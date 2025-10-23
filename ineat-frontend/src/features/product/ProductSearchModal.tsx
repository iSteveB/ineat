import React, { useState, useCallback, useEffect } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
	Search,
	Loader2,
	Package,
	Tag,
	Link as LinkIcon,
	AlertCircle,
	X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';
import type { Product } from '@/schemas/product';

// ===== TYPES =====

/**
 * Props du composant ProductSearchModal
 */
interface ProductSearchModalProps {
	/**
	 * Nom de l'item pour pré-remplir la recherche
	 */
	itemName: string;

	/**
	 * ID de l'item du ticket
	 */
	itemId: string;

	/**
	 * Contrôle l'ouverture du modal
	 */
	open: boolean;

	/**
	 * Callback appelé à la fermeture
	 */
	onClose: () => void;

	/**
	 * Callback appelé quand un produit est sélectionné
	 */
	onSelectProduct: (itemId: string, product: Product) => Promise<void>;

	/**
	 * Fonction de recherche personnalisée (optionnelle)
	 */
	searchProducts?: (query: string) => Promise<Product[]>;
}

/**
 * Résultat de recherche avec métadonnées
 */
interface SearchResult {
	products: Product[];
	isLoading: boolean;
	error: string | null;
}

// ===== COMPOSANT =====

/**
 * Modal de recherche et association de produit
 *
 * Fonctionnalités :
 * - Recherche en temps réel avec debounce
 * - Affichage des résultats avec détails
 * - Sélection et association d'un produit
 * - Prévisualisation du produit sélectionné
 * - Gestion des erreurs
 *
 * @example
 * ```tsx
 * <ProductSearchModal
 *   itemName="Lait demi-écrémé"
 *   itemId="item-123"
 *   open={isModalOpen}
 *   onClose={() => setIsModalOpen(false)}
 *   onSelectProduct={async (itemId, product) => {
 *     await associateProduct(itemId, product.id);
 *   }}
 * />
 * ```
 */
export const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
	itemName,
	itemId,
	open,
	onClose,
	onSelectProduct,
	searchProducts,
}) => {
	// ===== STATE =====

	const [searchQuery, setSearchQuery] = useState('');
	const [searchResult, setSearchResult] = useState<SearchResult>({
		products: [],
		isLoading: false,
		error: null,
	});
	const [selectedProduct, setSelectedProduct] = useState<Product | null>(
		null
	);
	const [isAssociating, setIsAssociating] = useState(false);

	// Debounce de la recherche (500ms)
	const debouncedSearchQuery = useDebounce(searchQuery, 500);

	// ===== HANDLERS =====

	/**
	 * Effectue la recherche de produits
	 */
	const performSearch = useCallback(
		async (query: string) => {
			setSearchResult((prev) => ({
				...prev,
				isLoading: true,
				error: null,
			}));

			try {
				// Utiliser la fonction de recherche fournie
				if (searchProducts) {
					const results = await searchProducts(query);
					setSearchResult({
						products: results,
						isLoading: false,
						error: null,
					});
				} else {
					// Pas de fonction de recherche fournie
					setSearchResult({
						products: [],
						isLoading: false,
						error: 'Fonction de recherche non configurée',
					});
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error
						? error.message
						: 'Erreur lors de la recherche';

				setSearchResult({
					products: [],
					isLoading: false,
					error: errorMessage,
				});
			}
		},
		[searchProducts]
	);

	// ===== EFFETS =====

	/**
	 * Initialise la recherche avec le nom de l'item
	 */
	useEffect(() => {
		if (open && itemName) {
			setSearchQuery(itemName);
		}
	}, [open, itemName]);

	/**
	 * Effectue la recherche quand la query change
	 */
	useEffect(() => {
		if (!debouncedSearchQuery.trim()) {
			setSearchResult({
				products: [],
				isLoading: false,
				error: null,
			});
			return;
		}

		performSearch(debouncedSearchQuery);
	}, [debouncedSearchQuery, performSearch]);

	// ===== HANDLERS (suite) =====

	/**
	 * Gère la sélection d'un produit
	 */
	const handleSelectProduct = (product: Product) => {
		setSelectedProduct(product);
	};

	/**
	 * Gère la confirmation de l'association
	 */
	const handleConfirm = async () => {
		if (!selectedProduct) return;

		setIsAssociating(true);

		try {
			await onSelectProduct(itemId, selectedProduct);
			toast.success('Produit associé avec succès');
			handleClose();
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Erreur lors de l'association";
			toast.error(errorMessage);
		} finally {
			setIsAssociating(false);
		}
	};

	/**
	 * Gère la fermeture du modal
	 */
	const handleClose = () => {
		if (!isAssociating) {
			setSearchQuery('');
			setSelectedProduct(null);
			setSearchResult({ products: [], isLoading: false, error: null });
			onClose();
		}
	};

	/**
	 * Gère le reset de la sélection
	 */
	const handleResetSelection = () => {
		setSelectedProduct(null);
	};

	// ===== RENDU DES SECTIONS =====

	/**
	 * Rendu de la barre de recherche
	 */
	const renderSearchBar = () => (
		<div className='relative'>
			<Search className='absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground' />
			<Input
				placeholder='Rechercher un produit dans votre inventaire...'
				value={searchQuery}
				onChange={(e) => setSearchQuery(e.target.value)}
				className='pl-10'
				disabled={isAssociating}
				autoFocus
			/>
		</div>
	);

	/**
	 * Rendu du produit sélectionné
	 */
	const renderSelectedProduct = () => {
		if (!selectedProduct) return null;

		return (
			<Alert className='border-primary bg-primary/5'>
				<Package className='size-4' />
				<AlertDescription>
					<div className='flex items-start justify-between gap-3'>
						<div className='flex-1 min-w-0'>
							<p className='font-medium'>Produit sélectionné :</p>
							<p className='text-sm mt-1'>
								{selectedProduct.name}
							</p>
							{selectedProduct.brand && (
								<p className='text-xs text-muted-foreground mt-0.5'>
									{selectedProduct.brand}
								</p>
							)}
							{selectedProduct.category && (
								<Badge variant='outline' className='mt-2 gap-1'>
									<Tag className='size-3' />
									{selectedProduct.category.name}
								</Badge>
							)}
						</div>
						<Button
							size='sm'
							variant='ghost'
							onClick={handleResetSelection}
							disabled={isAssociating}>
							<X className='size-4' />
						</Button>
					</div>
				</AlertDescription>
			</Alert>
		);
	};

	/**
	 * Rendu des résultats de recherche
	 */
	const renderSearchResults = () => {
		// Loading
		if (searchResult.isLoading) {
			return (
				<div className='flex items-center justify-center py-12'>
					<Loader2 className='size-8 animate-spin text-primary' />
				</div>
			);
		}

		// Erreur
		if (searchResult.error) {
			return (
				<Alert variant='destructive'>
					<AlertCircle className='size-4' />
					<AlertDescription>{searchResult.error}</AlertDescription>
				</Alert>
			);
		}

		// Pas de query
		if (!debouncedSearchQuery.trim()) {
			return (
				<div className='text-center py-12 text-muted-foreground'>
					<Search className='size-12 mx-auto mb-4 opacity-50' />
					<p>Commencez à taper pour rechercher un produit</p>
				</div>
			);
		}

		// Aucun résultat
		if (searchResult.products.length === 0) {
			return (
				<div className='text-center py-12 text-muted-foreground'>
					<Package className='size-12 mx-auto mb-4 opacity-50' />
					<p>Aucun produit trouvé</p>
					<p className='text-sm mt-2'>
						Essayez avec un autre nom ou ajoutez-le à votre
						inventaire
					</p>
				</div>
			);
		}

		// Résultats
		return (
			<div className='space-y-2 max-h-96 overflow-y-auto'>
				{searchResult.products.map((product) => (
					<button
						key={product.id}
						onClick={() => handleSelectProduct(product)}
						disabled={isAssociating}
						className={cn(
							'w-full text-left p-3 rounded-lg border transition-all',
							'hover:border-primary hover:bg-primary/5',
							selectedProduct?.id === product.id &&
								'border-primary bg-primary/10',
							isAssociating && 'opacity-50 cursor-not-allowed'
						)}>
						<div className='flex items-start justify-between gap-3'>
							<div className='flex-1 min-w-0'>
								<p className='font-medium'>{product.name}</p>
								{product.brand && (
									<p className='text-sm text-muted-foreground'>
										{product.brand}
									</p>
								)}
								<div className='flex items-center gap-2 mt-2 flex-wrap'>
									{product.category && (
										<Badge
											variant='outline'
											className='gap-1'>
											<Tag className='size-3' />
											{product.category.name}
										</Badge>
									)}
								</div>
							</div>
							{selectedProduct?.id === product.id && (
								<LinkIcon className='size-5 text-primary flex-shrink-0' />
							)}
						</div>
					</button>
				))}
			</div>
		);
	};

	// ===== RENDU PRINCIPAL =====

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
			<DialogContent className='max-w-2xl max-h-[90vh] overflow-hidden flex flex-col'>
				<DialogHeader>
					<DialogTitle>Associer un produit</DialogTitle>
					<DialogDescription>
						Recherchez et sélectionnez un produit existant pour
						l'associer à cet article
					</DialogDescription>
				</DialogHeader>

				<div className='space-y-4 flex-1 overflow-hidden flex flex-col'>
					{/* Barre de recherche */}
					{renderSearchBar()}

					{/* Produit sélectionné */}
					{renderSelectedProduct()}

					{/* Résultats */}
					<div className='flex-1 overflow-hidden'>
						{renderSearchResults()}
					</div>
				</div>

				<DialogFooter>
					<Button
						type='button'
						variant='outline'
						onClick={handleClose}
						disabled={isAssociating}>
						Annuler
					</Button>
					<Button
						type='button'
						onClick={handleConfirm}
						disabled={!selectedProduct || isAssociating}>
						{isAssociating ? (
							<>
								<Loader2 className='size-4 mr-2 animate-spin' />
								Association...
							</>
						) : (
							<>
								<LinkIcon className='size-4 mr-2' />
								Associer ce produit
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export type { ProductSearchModalProps, SearchResult };
