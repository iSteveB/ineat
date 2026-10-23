import React from 'react';

import WidgetCard from '@/components/common/WidgetCard';
import { cn } from '@/lib/utils';

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
	source?: string;
	sourceVersion?: string;
}

interface NutrientConfig {
	key: keyof NutrientData;
	label: string;
	unit: string;
	/** Sous-ligne de l'étiquette (« dont sucres »). */
	isSubRow?: boolean;
}

// Ordre de l'étiquette nutritionnelle réglementaire
const NUTRIENT_CONFIG: NutrientConfig[] = [
	{ key: 'energy', label: 'Énergie', unit: 'kcal' },
	{ key: 'fats', label: 'Matières grasses', unit: 'g' },
	{ key: 'saturatedFats', label: 'dont acides gras saturés', unit: 'g', isSubRow: true },
	{ key: 'carbohydrates', label: 'Glucides', unit: 'g' },
	{ key: 'sugars', label: 'dont sucres', unit: 'g', isSubRow: true },
	{ key: 'fiber', label: 'Fibres', unit: 'g' },
	{ key: 'proteins', label: 'Protéines', unit: 'g' },
	{ key: 'salt', label: 'Sel', unit: 'g' },
];

const formatValue = (value: number) =>
	new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);

export const NutritionInfoCard: React.FC<NutritionInfoCardProps> = ({
	nutrients,
	unitType = 'G',
	className,
	compact = false,
	source,
	sourceVersion,
}) => {
	const availableNutrients = NUTRIENT_CONFIG.filter(
		(config) => nutrients[config.key] !== undefined && nutrients[config.key] !== null
	);

	if (availableNutrients.length === 0) {
		return (
			<WidgetCard title='Valeurs nutritionnelles' className={className}>
				<p className='text-sm text-neutral-600'>
					Aucune information nutritionnelle disponible pour ce produit.
				</p>
			</WidgetCard>
		);
	}

	const referenceUnit = unitType === 'L' || unitType === 'ML' ? 'mL' : 'g';

	return (
		<WidgetCard title='Valeurs nutritionnelles' className={className}>
			<table className='w-full text-left'>
				<caption className='sr-only'>Valeurs nutritionnelles pour 100 {referenceUnit}</caption>
				<thead>
					<tr className='border-b border-neutral-300 text-sm text-neutral-600'>
						<th scope='col' className='py-2 font-medium'>
							Nutriment
						</th>
						<th scope='col' className='py-2 text-right font-medium'>
							Pour 100 {referenceUnit}
						</th>
					</tr>
				</thead>
				<tbody>
					{availableNutrients.map((config) => (
						<tr key={config.key} className='border-b border-neutral-200 last:border-b-0'>
							<th
								scope='row'
								className={cn(
									'font-normal',
									compact ? 'py-1.5' : 'py-2.5',
									config.isSubRow ? 'pl-4 text-sm text-neutral-600' : 'text-neutral-900'
								)}>
								{config.label}
							</th>
							<td
								className={cn(
									'text-right tabular-nums',
									compact ? 'py-1.5' : 'py-2.5',
									config.isSubRow ? 'text-sm text-neutral-600' : 'font-medium text-neutral-900'
								)}>
								{formatValue(nutrients[config.key] as number)} {config.unit}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			{source && (
				<p className='mt-3 text-xs text-neutral-600'>
					Valeurs moyennes pour 100 {referenceUnit} · Source : {source}
					{sourceVersion ? ` (${sourceVersion})` : ''}
				</p>
			)}
		</WidgetCard>
	);
};

export default NutritionInfoCard;
