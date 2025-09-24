import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Star, Zap, Droplets, Wheat, Beef, Salad, Candy } from 'lucide-react';

interface NutrientData {
	energy?: number;
	proteins?: number;
	carbohydrates?: number;
	sugars?: number;
	fats?: number;
	saturatedFats?: number;
	salt?: number;
	fiber?: number;
}

interface NutritionInfoCardProps {
	nutrients: NutrientData;
	unitType?: string;
	className?: string;
	compact?: boolean;
}

interface NutrientConfig {
	key: keyof NutrientData;
	label: string;
	unit: string;
	icon: React.ReactNode;
	colorClass: string;
	description: string;
}

// Configuration des nutriments avec leurs icônes et couleurs
const NUTRIENT_CONFIG: NutrientConfig[] = [
	{
		key: 'energy',
		label: 'Énergie',
		unit: 'kcal',
		icon: <Zap className='size-4' />,
		colorClass: 'from-red-50 to-orange-50 border-red-100 text-red-700',
		description: 'Apport énergétique',
	},
	{
		key: 'fats',
		label: 'Matières grasses',
		unit: 'g',
		icon: <Droplets className='size-4' />,
		colorClass: 'from-yellow-50 to-orange-50 border-yellow-100 text-yellow-700',
		description: 'Lipides totaux',
	},
	{
		key: 'saturatedFats',
		label: 'Acides gras saturés',
		unit: 'g',
		icon: <Droplets className='size-4' />,
		colorClass: 'from-orange-50 to-red-50 border-orange-100 text-orange-700',
		description: 'Lipides saturés',
	},
	{
		key: 'carbohydrates',
		label: 'Glucides',
		unit: 'g',
		icon: <Wheat className='size-4' />,
		colorClass: 'from-blue-50 to-indigo-50 border-blue-100 text-blue-700',
		description: 'Glucides totaux',
	},
	{
		key: 'sugars',
		label: 'Sucres',
		unit: 'g',
		icon: <Candy className='size-4' />,
		colorClass: 'from-pink-50 to-red-50 border-pink-100 text-pink-700',
		description: 'Sucres simples',
	},
	{
		key: 'fiber',
		label: 'Fibres',
		unit: 'g',
		icon: <Salad className='size-4' />,
		colorClass: 'from-emerald-50 to-green-50 border-emerald-100 text-emerald-700',
		description: 'Fibres alimentaires',
	},
	{
		key: 'proteins',
		label: 'Protéines',
		unit: 'g',
		icon: <Beef className='size-4' />,
		colorClass: 'from-green-50 to-emerald-50 border-green-100 text-green-700',
		description: 'Protéines totales',
	},
	{
		key: 'salt',
		label: 'Sel',
		unit: 'g',
		icon: <Star className='size-4' />,
		colorClass: 'from-purple-50 to-pink-50 border-purple-100 text-purple-700',
		description: 'Chlorure de sodium',
	},
];

export const NutritionInfoCard: React.FC<NutritionInfoCardProps> = ({
	nutrients,
	unitType = 'G',
	className,
	compact = false,
}) => {
	// Filtrer les nutriments disponibles
	const availableNutrients = NUTRIENT_CONFIG.filter(
		config => nutrients[config.key] !== undefined && nutrients[config.key] !== null
	);

	// Si aucun nutriment disponible
	if (availableNutrients.length === 0) {
		return (
			<Card className={cn(
				'relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-xl',
				className
			)}>
				<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-gray-100/30 to-gray-200/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />
				
				<CardContent className='p-6'>
					<div className='flex items-center gap-3 mb-4'>
						<div className='p-2 rounded-xl bg-gray-50 border border-gray-200'>
							<Star className='size-5 text-gray-400' />
						</div>
						<div>
							<h3 className='font-bold text-gray-900'>
								Valeurs nutritionnelles
							</h3>
							<p className='text-sm text-gray-500'>
								Informations non disponibles
							</p>
						</div>
					</div>
					
					<div className='text-center py-8'>
						<div className='size-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center'>
							<Star className='size-8 text-gray-400' />
						</div>
						<p className='text-gray-500'>
							Aucune information nutritionnelle disponible pour ce produit.
						</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Déterminer l'unité de référence pour l'affichage
	const referenceUnit = (unitType === 'L' || unitType === 'ML') ? 'mL' : 'g';

	return (
		<Card className={cn(
			'relative overflow-hidden border-0 bg-gradient-to-br from-white to-orange-50/50 shadow-xl',
			className
		)}>
			<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100/30 to-yellow-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

			<CardContent className={cn('p-6', compact && 'p-4')}>
				{/* En-tête */}
				<div className={cn('flex items-center gap-3 mb-6', compact && 'mb-4')}>
					<div className='p-2 rounded-xl bg-orange-50 border border-orange-200'>
						<Star className='size-5 text-orange-600' />
					</div>
					<div>
						<h3 className={cn('font-bold text-gray-900', compact && 'text-lg')}>
							Valeurs nutritionnelles
						</h3>
						<p className={cn('text-sm text-gray-600', compact && 'text-xs')}>
							Pour 100 {referenceUnit}
						</p>
					</div>
				</div>

				{/* Grille des nutriments */}
				<div className={cn(
					'grid gap-4',
					compact 
						? 'grid-cols-2 gap-3' 
						: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
				)}>
					{availableNutrients.map((config) => {
						const value = nutrients[config.key];
						
						return (
							<div
								key={config.key}
								className={cn(
									'bg-gradient-to-r border rounded-xl transition-all duration-200 hover:scale-105',
									config.colorClass,
									compact ? 'p-3' : 'p-4'
								)}>
								{/* Valeur principale */}
								<div className={cn(
									'flex items-center justify-between mb-2',
									compact && 'mb-1'
								)}>
									<div className={cn(
										'font-bold',
										compact ? 'text-xl' : 'text-2xl'
									)}>
										{typeof value === 'number' ? value.toFixed(1) : value}
									</div>
									<div className='opacity-70'>
										{config.icon}
									</div>
								</div>
								
								{/* Unité */}
								<div className={cn(
									'font-medium opacity-80',
									compact ? 'text-xs' : 'text-sm'
								)}>
									{config.unit}
								</div>
								
								{/* Label */}
								<div className={cn(
									'text-gray-600 font-medium leading-tight',
									compact ? 'text-xs mt-1' : 'text-xs mt-1'
								)}>
									{config.label}
								</div>
								
								{/* Description (seulement en mode non-compact) */}
								{!compact && (
									<div className='text-xs text-gray-500 mt-1 opacity-75'>
										{config.description}
									</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Note explicative pour les valeurs manquantes */}
				{availableNutrients.length < NUTRIENT_CONFIG.length && !compact && (
					<div className='mt-6 p-3 bg-gray-50 border border-gray-200 rounded-lg'>
						<p className='text-xs text-gray-600 text-center'>
							{NUTRIENT_CONFIG.length - availableNutrients.length} valeur(s) nutritionnelle(s) 
							non disponible(s) pour ce produit
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default NutritionInfoCard;