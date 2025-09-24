import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { ListOrdered, AlertCircle, Leaf } from 'lucide-react';

interface IngredientsCardProps {
	ingredients?: string | null;
	className?: string;
	compact?: boolean;
}

export const IngredientsCard: React.FC<IngredientsCardProps> = ({
	ingredients,
	className,
	compact = false,
}) => {
	// Si aucun ingrédient n'est fourni
	if (!ingredients || ingredients.trim() === '') {
		return (
			<Card className={cn(
				'relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-xl',
				className
			)}>
				<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-100/30 to-gray-200/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />
				
				<CardContent className='p-6'>
					<div className='flex items-center gap-3 mb-4'>
						<div className='p-2 rounded-xl bg-gray-50 border border-gray-200'>
							<ListOrdered className='size-5 text-gray-400' />
						</div>
						<div>
							<h3 className='font-bold text-gray-900'>
								Liste des ingrédients
							</h3>
							<p className='text-sm text-gray-500'>
								Composition non disponible
							</p>
						</div>
					</div>
					
					<div className='text-center py-8'>
						<div className='size-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center'>
							<AlertCircle className='size-8 text-gray-400' />
						</div>
						<p className='text-gray-500'>
							La liste des ingrédients n'est pas disponible pour ce produit.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Parser les ingrédients (séparés par des virgules généralement)
	const ingredientsList = ingredients
		.split(/[,;]/)
		.map(ingredient => ingredient.trim())
		.filter(ingredient => ingredient.length > 0);

	// Détecter les allergènes courants (mots-clés basiques)
	const allergenKeywords = [
		'gluten', 'blé', 'seigle', 'orge', 'avoine',
		'lait', 'lactose', 'crème', 'beurre', 'fromage',
		'œuf', 'oeuf',
		'soja', 'soya',
		'arachide', 'cacahuète',
		'noix', 'amande', 'noisette', 'pistache',
		'poisson', 'thon', 'saumon',
		'crustacé', 'crevette', 'crabe',
		'mollusque', 'moule', 'huître',
		'céleri', 'moutarde', 'sésame', 'sulfite'
	];

	const containsAllergens = ingredientsList.some(ingredient =>
		allergenKeywords.some(allergen =>
			ingredient.toLowerCase().includes(allergen.toLowerCase())
		)
	);

	return (
		<Card className={cn(
			'relative overflow-hidden border-0 bg-gradient-to-br from-white to-green-50/50 shadow-xl',
			className
		)}>
			<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100/30 to-emerald-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

			<CardContent className={cn('p-6', compact && 'p-4')}>
				{/* En-tête */}
				<div className={cn('flex items-center gap-3 mb-6', compact && 'mb-4')}>
					<div className='p-2 rounded-xl bg-green-50 border border-green-200'>
						<ListOrdered className='size-5 text-green-600' />
					</div>
					<div className='flex-1'>
						<h3 className={cn('font-bold text-gray-900', compact && 'text-lg')}>
							Liste des ingrédients
						</h3>
						<p className={cn('text-sm text-gray-600', compact && 'text-xs')}>
							{ingredientsList.length} ingrédient{ingredientsList.length > 1 ? 's' : ''} identifié{ingredientsList.length > 1 ? 's' : ''}
						</p>
					</div>
					
					{/* Indicateur d'allergènes potentiels */}
					{containsAllergens && (
						<div className='flex items-center gap-1 px-2 py-1 bg-amber-100 border border-amber-300 rounded-lg'>
							<AlertCircle className='size-3 text-amber-700' />
							<span className='text-xs font-medium text-amber-800'>
								Allergènes possibles
							</span>
						</div>
					)}
				</div>

				{/* Liste des ingrédients en mode compact (liste simple) */}
				{compact ? (
					<div className='space-y-2'>
						<p className='text-sm text-gray-700 leading-relaxed'>
							{ingredientsList.join(', ')}.
						</p>
					</div>
				) : (
					/* Liste des ingrédients en mode détaillé (badges) */
					<div className='space-y-4'>
						{/* Texte brut d'abord */}
						<div className='p-4 bg-green-50/50 border border-green-100 rounded-xl'>
							<h4 className='text-sm font-semibold text-gray-800 mb-2'>
								Composition :
							</h4>
							<p className='text-sm text-gray-700 leading-relaxed italic'>
								{ingredients}
							</p>
						</div>

						{/* Ingrédients sous forme de badges */}
						<div className='space-y-3'>
							<h4 className='text-sm font-semibold text-gray-800 flex items-center gap-2'>
								<Leaf className='size-4 text-green-600' />
								Ingrédients identifiés :
							</h4>
							<div className='flex flex-wrap gap-2'>
								{ingredientsList.map((ingredient, index) => {
									// Vérifier si cet ingrédient contient un allergène
									const isAllergen = allergenKeywords.some(allergen =>
										ingredient.toLowerCase().includes(allergen.toLowerCase())
									);

									return (
										<span
											key={index}
											className={cn(
												'px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors',
												isAllergen
													? 'bg-amber-50 text-amber-800 border-amber-200'
													: 'bg-green-50 text-green-800 border-green-200'
											)}>
											{index + 1}. {ingredient}
											{isAllergen && (
												<AlertCircle className='inline size-3 ml-1 text-amber-600' />
											)}
										</span>
									);
								})}
							</div>
						</div>

						{/* Note d'avertissement pour les allergènes */}
						{containsAllergens && (
							<div className='p-3 bg-amber-50 border border-amber-200 rounded-lg'>
								<div className='flex items-start gap-2'>
									<AlertCircle className='size-4 text-amber-600 mt-0.5' />
									<div className='text-xs text-amber-800'>
										<p className='font-semibold mb-1'>Attention aux allergènes :</p>
										<p>
											Ce produit peut contenir des ingrédients allergènes. 
											Vérifiez toujours l'étiquetage officiel du produit.
										</p>
									</div>
								</div>
							</div>
						)}
					</div>
				)}

				{/* Note explicative */}
				{!compact && (
					<div className='mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg'>
						<p className='text-xs text-gray-600 text-center'>
							Les ingrédients sont généralement listés par ordre décroissant de poids dans le produit
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default IngredientsCard;