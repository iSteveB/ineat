import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { Category } from '@/schemas';

export interface ProductBasicsData {
	name: string;
	brand: string;
	barcode: string;
	category: string;
}

interface ProductBasicsSectionProps {
	values: ProductBasicsData;
	onChange: (field: keyof ProductBasicsData, value: string) => void;
	categories: Category[];
	disabled?: boolean;
	readonly?: boolean;
	showTitle?: boolean;
	errors?: Partial<Record<keyof ProductBasicsData, string>>;
	className?: string;
}

export const ProductBasicsSection: React.FC<ProductBasicsSectionProps> = ({
	values,
	onChange,
	categories,
	disabled = false,
	readonly = false,
	showTitle = true,
	errors = {},
	className = '',
}) => {
	const isFieldDisabled = disabled || readonly;

	const handleFieldChange = (
		field: keyof ProductBasicsData,
		value: string
	) => {
		if (!readonly) {
			onChange(field, value);
		}
	};

	const getInputClassName = (
		field: keyof ProductBasicsData,
		hasValue: boolean = false
	) => {
		let baseClass =
			'bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200';

		// Erreur
		if (errors[field]) {
			baseClass += ' border-error-100';
		}

		// Valeur pré-remplie (readonly ou avec valeur)
		if ((readonly && hasValue) || (hasValue && !readonly)) {
			baseClass += ' bg-success-50/5 border-success-500/20';
		}

		// Mode readonly avec style différencié
		if (readonly) {
			baseClass = baseClass.replace(
				'focus:ring-success-50 focus:border-success-50',
				'focus:ring-blue-500 focus:border-blue-500'
			);
			if (hasValue) {
				baseClass = baseClass.replace(
					'bg-success-50/5 border-success-500/20',
					'bg-blue-50/5 border-blue-500/20'
				);
			}
		}

		return baseClass;
	};

	const getSelectClassName = (field: keyof ProductBasicsData) => {
		let baseClass =
			'bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300';

		if (errors[field]) {
			baseClass += ' border-error-100';
		}

		if (readonly) {
			baseClass = baseClass.replace(
				'focus:ring-success-50 focus:border-success-50',
				'focus:ring-blue-500 focus:border-blue-500'
			);
			if (values[field]) {
				baseClass += ' bg-blue-50/5 border-blue-500/20';
			}
		}

		return baseClass;
	};

	return (
		<div className={className}>
			{showTitle && (
				<>
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-300'>
							Informations de base
						</h3>

						{/* Nom du produit */}
						<div className='space-y-2'>
							<Label htmlFor='name' className='text-neutral-300'>
								Nom du produit{' '}
								<span className='text-error-100'>*</span>
							</Label>
							<Input
								id='name'
								value={values.name}
								onChange={(e) =>
									handleFieldChange('name', e.target.value)
								}
								placeholder='Ex: Pommes Golden'
								className={getInputClassName(
									'name',
									!!values.name
								)}
								disabled={isFieldDisabled}
							/>
							{errors.name && (
								<p className='text-sm text-error-100'>
									{errors.name}
								</p>
							)}
						</div>

						{/* Marque */}
						<div className='space-y-2'>
							<Label htmlFor='brand' className='text-neutral-300'>
								Marque
							</Label>
							<Input
								id='brand'
								value={values.brand}
								onChange={(e) =>
									handleFieldChange('brand', e.target.value)
								}
								placeholder='Ex: Carrefour Bio'
								className={getInputClassName(
									'brand',
									!!values.brand
								)}
								disabled={isFieldDisabled}
							/>
							{errors.brand && (
								<p className='text-sm text-error-100'>
									{errors.brand}
								</p>
							)}
						</div>

						{/* Code-barres */}
						<div className='space-y-2'>
							<Label
								htmlFor='barcode'
								className='text-neutral-300'>
								Code-barres
							</Label>
							<Input
								id='barcode'
								value={values.barcode}
								onChange={(e) =>
									handleFieldChange('barcode', e.target.value)
								}
								placeholder='Ex: 3560070057047'
								className={getInputClassName(
									'barcode',
									!!values.barcode
								)}
								disabled={isFieldDisabled}
							/>
							{errors.barcode && (
								<p className='text-sm text-error-100'>
									{errors.barcode}
								</p>
							)}
							<p className='text-xs text-neutral-200'>
								Entre 8 et 13 chiffres uniquement
							</p>
						</div>

						{/* Catégorie */}
						<div className='space-y-2'>
							<Label
								htmlFor='category'
								className='text-neutral-300'>
								Catégorie{' '}
								<span className='text-error-100'>*</span>
							</Label>
							<Select
								value={values.category}
								onValueChange={(value) =>
									handleFieldChange('category', value)
								}
								disabled={isFieldDisabled}>
								<SelectTrigger
									className={getSelectClassName('category')}>
									<SelectValue placeholder='Sélectionnez une catégorie' />
								</SelectTrigger>
								<SelectContent className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm'>
									{categories.length === 0 ? (
										<SelectItem value='loading' disabled>
											Chargement...
										</SelectItem>
									) : (
										categories.map((category) => (
											<SelectItem
												key={category.id}
												value={category.slug}
												className='text-neutral-300 hover:bg-neutral-100'>
												{category.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
							{errors.category && (
								<p className='text-sm text-error-100'>
									{errors.category}
								</p>
							)}
						</div>
					</div>
					<Separator className='bg-neutral-200/20' />
				</>
			)}
		</div>
	);
};
