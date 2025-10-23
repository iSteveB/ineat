import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, CheckCircle2, AlertCircle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReceiptItemCard } from '@/features/inventory/receipt/ReceiptItemCard';
import type { ReceiptItem } from '@/services/receiptService';

// ===== TYPES =====

/**
 * Filtre de validation
 */
type ValidationFilter = 'all' | 'validated' | 'unvalidated';

/**
 * Filtre de produit
 */
type ProductFilter = 'all' | 'with-product' | 'without-product';

/**
 * Ordre de tri
 */
type SortOrder = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'confidence-desc';

/**
 * Props du composant ReceiptItemsList
 */
interface ReceiptItemsListProps {
	/**
	 * Liste des items du ticket
	 */
	items: ReceiptItem[];

	/**
	 * Callback appelé quand on édite un item
	 */
	onEditItem?: (item: ReceiptItem) => void;

	/**
	 * Callback appelé quand on supprime un item
	 */
	onDeleteItem?: (itemId: string) => void;

	/**
	 * Callback appelé quand on valide/invalide un item
	 */
	onToggleValidation?: (itemId: string, validated: boolean) => void;

	/**
	 * Indique si les actions sont désactivées
	 */
	disabled?: boolean;

	/**
	 * Affiche les filtres
	 */
	showFilters?: boolean;

	/**
	 * Classe CSS additionnelle
	 */
	className?: string;
}

// ===== COMPOSANT =====

/**
 * Composant de liste des items d'un ticket avec filtres et tri
 * 
 * Fonctionnalités :
 * - Affichage de tous les items
 * - Recherche par nom
 * - Filtres : validation, produit associé
 * - Tri : nom, prix, confiance
 * - Statistiques (total, validés, non validés)
 * - Actions sur chaque item
 * 
 * @example
 * ```tsx
 * <ReceiptItemsList
 *   items={receiptItems}
 *   onEditItem={(item) => openModal(item)}
 *   onDeleteItem={(id) => deleteItem(id)}
 *   onToggleValidation={(id, val) => updateValidation(id, val)}
 *   showFilters={true}
 * />
 * ```
 */
export const ReceiptItemsList: React.FC<ReceiptItemsListProps> = ({
	items,
	onEditItem,
	onDeleteItem,
	onToggleValidation,
	disabled = false,
	showFilters = true,
	className,
}) => {
	// ===== STATE =====

	const [searchQuery, setSearchQuery] = useState('');
	const [validationFilter, setValidationFilter] = useState<ValidationFilter>('all');
	const [productFilter, setProductFilter] = useState<ProductFilter>('all');
	const [sortOrder, setSortOrder] = useState<SortOrder>('name-asc');

	// ===== FILTRAGE ET TRI =====

	/**
	 * Items filtrés et triés
	 */
	const filteredAndSortedItems = useMemo(() => {
		let result = [...items];

		// Filtre de recherche
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter((item) => {
				const name = item.product?.name || item.detectedName;
				const brand = item.product?.brand || '';
				return (
					name.toLowerCase().includes(query) ||
					brand.toLowerCase().includes(query)
				);
			});
		}

		// Filtre de validation
		if (validationFilter === 'validated') {
			result = result.filter((item) => item.validated);
		} else if (validationFilter === 'unvalidated') {
			result = result.filter((item) => !item.validated);
		}

		// Filtre de produit
		if (productFilter === 'with-product') {
			result = result.filter((item) => item.product !== null);
		} else if (productFilter === 'without-product') {
			result = result.filter((item) => item.product === null);
		}

		// Tri
		result.sort((a, b) => {
			const nameA = a.product?.name || a.detectedName;
			const nameB = b.product?.name || b.detectedName;

			switch (sortOrder) {
				case 'name-asc':
					return nameA.localeCompare(nameB);
				case 'name-desc':
					return nameB.localeCompare(nameA);
				case 'price-asc': {
					const priceA = a.totalPrice || 0;
					const priceB = b.totalPrice || 0;
					return priceA - priceB;
				}
				case 'price-desc': {
					const priceA = a.totalPrice || 0;
					const priceB = b.totalPrice || 0;
					return priceB - priceA;
				}
				case 'confidence-desc':
					return b.confidence - a.confidence;
				default:
					return 0;
			}
		});

		return result;
	}, [items, searchQuery, validationFilter, productFilter, sortOrder]);

	// ===== STATISTIQUES =====

	const stats = useMemo(() => {
		return {
			total: items.length,
			validated: items.filter((item) => item.validated).length,
			unvalidated: items.filter((item) => !item.validated).length,
			withProduct: items.filter((item) => item.product !== null).length,
		};
	}, [items]);

	// ===== RENDU DES SECTIONS =====

	/**
	 * Rendu des statistiques
	 */
	const renderStats = () => (
		<div className="flex items-center gap-3 flex-wrap">
			<Badge variant="outline" className="gap-1">
				<Package className="size-3" />
				{stats.total} article{stats.total > 1 ? 's' : ''}
			</Badge>

			<Badge variant="default" className="gap-1 bg-green-600">
				<CheckCircle2 className="size-3" />
				{stats.validated} validé{stats.validated > 1 ? 's' : ''}
			</Badge>

			{stats.unvalidated > 0 && (
				<Badge variant="secondary" className="gap-1">
					<AlertCircle className="size-3" />
					{stats.unvalidated} à valider
				</Badge>
			)}
		</div>
	);

	/**
	 * Rendu des filtres
	 */
	const renderFilters = () => {
		if (!showFilters) return null;

		return (
			<div className="space-y-3">
				{/* Recherche */}
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						placeholder="Rechercher un produit..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>

				{/* Filtres et tri */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
					{/* Filtre validation */}
					<Select
						value={validationFilter}
						onValueChange={(value) =>
							setValidationFilter(value as ValidationFilter)
						}
					>
						<SelectTrigger>
							<SelectValue placeholder="Validation" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Tous les articles</SelectItem>
							<SelectItem value="validated">Validés uniquement</SelectItem>
							<SelectItem value="unvalidated">Non validés uniquement</SelectItem>
						</SelectContent>
					</Select>

					{/* Filtre produit */}
					<Select
						value={productFilter}
						onValueChange={(value) => setProductFilter(value as ProductFilter)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Produit" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Tous les produits</SelectItem>
							<SelectItem value="with-product">Avec produit associé</SelectItem>
							<SelectItem value="without-product">
								Sans produit associé
							</SelectItem>
						</SelectContent>
					</Select>

					{/* Tri */}
					<Select
						value={sortOrder}
						onValueChange={(value) => setSortOrder(value as SortOrder)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Trier par" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="name-asc">Nom (A-Z)</SelectItem>
							<SelectItem value="name-desc">Nom (Z-A)</SelectItem>
							<SelectItem value="price-asc">Prix croissant</SelectItem>
							<SelectItem value="price-desc">Prix décroissant</SelectItem>
							<SelectItem value="confidence-desc">
								Confiance décroissante
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{/* Bouton reset filtres */}
				{(searchQuery || validationFilter !== 'all' || productFilter !== 'all') && (
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							setSearchQuery('');
							setValidationFilter('all');
							setProductFilter('all');
						}}
					>
						<Filter className="size-4 mr-2" />
						Réinitialiser les filtres
					</Button>
				)}
			</div>
		);
	};

	/**
	 * Rendu de la liste
	 */
	const renderList = () => {
		if (filteredAndSortedItems.length === 0) {
			return (
				<Card>
					<CardContent className="p-8 text-center">
						<AlertCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
						<p className="text-muted-foreground">
							{searchQuery || validationFilter !== 'all' || productFilter !== 'all'
								? 'Aucun article ne correspond aux filtres'
								: 'Aucun article détecté'}
						</p>
					</CardContent>
				</Card>
			);
		}

		return (
			<div className="space-y-3">
				{filteredAndSortedItems.map((item) => (
					<ReceiptItemCard
						key={item.id}
						item={item}
						onEdit={onEditItem}
						onDelete={onDeleteItem}
						onToggleValidation={onToggleValidation}
						disabled={disabled}
					/>
				))}
			</div>
		);
	};

	// ===== RENDU PRINCIPAL =====

	return (
		<div className={cn('space-y-4', className)}>
			{/* Header avec statistiques */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Articles détectés</CardTitle>
						{renderStats()}
					</div>
				</CardHeader>
				<CardContent>{renderFilters()}</CardContent>
			</Card>

			{/* Liste des items */}
			{renderList()}
		</div>
	);
};

export type { ReceiptItemsListProps, ValidationFilter, ProductFilter, SortOrder };