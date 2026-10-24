import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export interface NutritionalData {
	energy: string;
	proteins: string;
	carbohydrates: string;
	fats: string;
	sugars: string;
	fiber: string;
	salt: string;
	saturatedFats: string;
}

interface NutritionalInfoSectionProps {
	values: NutritionalData;
	onChange: (field: keyof NutritionalData, value: string) => void;
	disabled?: boolean;
	readonly?: boolean;
	showTitle?: boolean;
	className?: string;
}

export const NutritionalInfoSection: React.FC<NutritionalInfoSectionProps> = ({
	values,
	onChange,
	disabled = false,
	readonly = false,
	showTitle = true,
	className = '',
}) => {
	const isFieldDisabled = disabled || readonly;

	const handleNutrientChange = (field: keyof NutritionalData, value: string) => {
		if (!readonly) {
			onChange(field, value);
		}
	};

	const getInputClassName = (hasValue: boolean = false) => {
		let baseClass = 'bg-surface border border-input rounded-md shadow-xs focus:ring-2 focus:ring-accent-600/20 focus:border-accent-700 focus:outline-none text-neutral-900 placeholder:text-neutral-500';
		
		if (readonly && hasValue) {
			baseClass = 'bg-info-50 border-input text-neutral-700 placeholder:text-neutral-500';
		}
		
		return baseClass;
	};

	const nutrients = [
		{ 
			key: 'energy' as keyof NutritionalData, 
			label: 'Énergie (kcal)', 
			placeholder: 'Ex: 245',
			step: '1'
		},
		{ 
			key: 'proteins' as keyof NutritionalData, 
			label: 'Protéines (g)', 
			placeholder: 'Ex: 12.5',
			step: '0.1'
		},
		{ 
			key: 'carbohydrates' as keyof NutritionalData, 
			label: 'Glucides (g)', 
			placeholder: 'Ex: 58.7',
			step: '0.1'
		},
		{ 
			key: 'fats' as keyof NutritionalData, 
			label: 'Lipides (g)', 
			placeholder: 'Ex: 3.2',
			step: '0.1'
		},
	];

	const secondaryNutrients = [
		{ 
			key: 'sugars' as keyof NutritionalData, 
			label: 'dont Sucres (g)', 
			placeholder: 'Ex: 2.1',
			step: '0.1'
		},
		{ 
			key: 'fiber' as keyof NutritionalData, 
			label: 'Fibres (g)', 
			placeholder: 'Ex: 1.8',
			step: '0.1'
		},
		{ 
			key: 'salt' as keyof NutritionalData, 
			label: 'Sel (g)', 
			placeholder: 'Ex: 0.89',
			step: '0.01'
		},
		{ 
			key: 'saturatedFats' as keyof NutritionalData, 
			label: 'Graisses sat. (g)', 
			placeholder: 'Ex: 0.7',
			step: '0.1'
		},
	];

	return (
		<div className={className}>
			{showTitle && (
				<>
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-900'>
							Informations nutritionnelles (pour 100g)
						</h3>

						{/* Macronutriments principaux */}
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
							{nutrients.map((nutrient) => (
								<div key={nutrient.key} className='space-y-2'>
									<Label htmlFor={nutrient.key} className='text-neutral-900'>
										{nutrient.label}
									</Label>
									<Input
										id={nutrient.key}
										type='number'
										step={nutrient.step}
										min='0'
										value={values[nutrient.key]}
										onChange={(e) => handleNutrientChange(nutrient.key, e.target.value)}
										placeholder={nutrient.placeholder}
										className={getInputClassName(!!values[nutrient.key])}
										disabled={isFieldDisabled}
									/>
								</div>
							))}
						</div>

						{/* Nutriments secondaires */}
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
							{secondaryNutrients.map((nutrient) => (
								<div key={nutrient.key} className='space-y-2'>
									<Label htmlFor={nutrient.key} className='text-neutral-900'>
										{nutrient.label}
									</Label>
									<Input
										id={nutrient.key}
										type='number'
										step={nutrient.step}
										min='0'
										value={values[nutrient.key]}
										onChange={(e) => handleNutrientChange(nutrient.key, e.target.value)}
										placeholder={nutrient.placeholder}
										className={getInputClassName(!!values[nutrient.key])}
										disabled={isFieldDisabled}
									/>
								</div>
							))}
						</div>
					</div>
					<Separator className='bg-neutral-100/20' />
				</>
			)}
		</div>
	);
};