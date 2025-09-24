import React from 'react';
import { Plus, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ProductSearchResult } from '@/services/inventoryService';
import ScoreBadge from '@/components/common/ScoreBadge';

interface ProductSearchResultsProps {
	results: ProductSearchResult[];
	onSelectProduct: (product: ProductSearchResult) => void;
	isLoading?: boolean;
	searchQuery?: string;
	className?: string;
}

export const ProductSearchResults: React.FC<ProductSearchResultsProps> = ({
	results,
	onSelectProduct,
	isLoading = false,
	searchQuery = '',
	className,
}) => {
	if (isLoading) {
		return (
			<div className={cn('space-y-3', className)}>
				{[1, 2, 3].map((i) => (
					<Card key={i} className='p-4 animate-pulse'>
						<div className='flex items-center space-x-4'>
							<div className='size-16 bg-neutral-100 rounded-lg' />
							<div className='flex-1 space-y-2'>
								<div className='h-4 bg-neutral-100 rounded w-3/4' />
								<div className='h-3 bg-neutral-100 rounded w-1/2' />
							</div>
							<div className='h-8 w-24 bg-neutral-100 rounded' />
						</div>
					</Card>
				))}
			</div>
		);
	}

	if (results.length === 0 && searchQuery) {
		return (
			<Card className={cn('p-8 text-center', className)}>
				<div className='flex flex-col items-center space-y-4'>
					<div className='size-12 rounded-full bg-warning-50/10 flex items-center justify-center'>
						<Package className='size-6 text-warning-50' />
					</div>
					<div>
						<h3 className='text-lg font-semibold text-neutral-300'>
							Aucun produit trouvé
						</h3>
						<p className='text-sm text-neutral-200 mt-1'>
							Aucun produit ne correspond à "{searchQuery}"
						</p>
						<p className='text-sm text-neutral-200 mt-2'>
							Vous pouvez créer un nouveau produit en utilisant le
							formulaire complet.
						</p>
					</div>
				</div>
			</Card>
		);
	}

	return (
		<div className={cn('space-y-3', className)}>
			{results.map((product) => (
				<Card
					key={product.id}
					className='p-4 hover:shadow-md transition-all duration-200 cursor-pointer group'
					onClick={() => onSelectProduct(product)}>
					<div className='flex items-center space-x-4'>
						{/* Image du produit ou placeholder */}
						<div className='size-16 rounded-lg overflow-hidden bg-neutral-100 flex-shrink-0'>
							{product.imageUrl ? (
								<img
									src={product.imageUrl}
									alt={product.name}
									className='size-full object-cover'
								/>
							) : (
								<div className='size-full flex items-center justify-center'>
									<Package className='size-8 text-neutral-200' />
								</div>
							)}
						</div>

						{/* Informations du produit */}
						<div className='flex-1 min-w-0'>
							<h4 className='font-semibold text-neutral-300 truncate'>
								{product.name}
							</h4>
							<div className='flex items-center space-x-2 mt-1'>
								{product.brand && (
									<span className='text-sm text-neutral-200'>
										{product.brand}
									</span>
								)}
								{product.brand && product.category && (
									<span className='text-neutral-200'>•</span>
								)}
								{product.category && (
									<span className='text-sm text-neutral-200'>
										{product.category.name}
									</span>
								)}
							</div>
							{product.barcode && (
								<p className='text-xs text-neutral-200 mt-1'>
									Code-barres: {product.barcode}
								</p>
							)}
						</div>

						{/* Scores nutritionnels */}
						<div className='flex items-center space-x-2 flex-shrink-0'>
							{product.nutriscore && (
								<ScoreBadge
									type='nutri'
									score={product.nutriscore}
									size='sm'
								/>
							)}
							{product.ecoscore && (
								<ScoreBadge
									type='eco'
									score={product.ecoscore}
									size='sm'
								/>
							)}
						</div>

						{/* Bouton d'ajout */}
						<Button
							size='sm'
							variant='ghost'
							className='opacity-0 group-hover:opacity-100 transition-opacity'
							onClick={(e) => {
								e.stopPropagation();
								onSelectProduct(product);
							}}>
							<Plus className='size-4 mr-1' />
							Ajouter
						</Button>
					</div>
				</Card>
			))}

			{results.length > 0 && (
				<div className='text-center pt-4'>
					<p className='text-sm text-neutral-200'>
						{results.length} produit{results.length > 1 ? 's' : ''}{' '}
						trouvé
						{results.length > 1 ? 's' : ''}
					</p>
					{results.length >= 10 && (
						<p className='text-xs text-neutral-200 mt-1'>
							<AlertCircle className='inline size-3 mr-1' />
							Affinez votre recherche pour voir plus de résultats
						</p>
					)}
				</div>
			)}
		</div>
	);
};

export default ProductSearchResults;
