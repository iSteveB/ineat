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
		let baseClass = 'bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200';
		
		if (readonly && hasValue) {
			baseClass = 'bg-blue-50/5 border-blue-500/20 text-neutral-700 placeholder:text-neutral-500';
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
						<h3 className='text-md font-medium text-neutral-300'>
							Informations nutritionnelles (pour 100g)
						</h3>

						{/* Macronutriments principaux */}
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
							{nutrients.map((nutrient) => (
								<div key={nutrient.key} className='space-y-2'>
									<Label htmlFor={nutrient.key} className='text-neutral-300'>
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
									<Label htmlFor={nutrient.key} className='text-neutral-300'>
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
					<Separator className='bg-neutral-200/20' />
				</>
			)}
		</div>
	);
};