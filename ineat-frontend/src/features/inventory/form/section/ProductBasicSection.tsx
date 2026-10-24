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
			'bg-surface border border-input rounded-md shadow-xs focus:ring-2 focus:ring-accent-600/20 focus:border-accent-700 focus:outline-none text-neutral-900 placeholder:text-neutral-500';

		// Erreur
		if (errors[field]) {
			baseClass += ' border-danger-600';
		}

		// Valeur pré-remplie (readonly ou avec valeur)
		if ((readonly && hasValue) || (hasValue && !readonly)) {
			baseClass += ' bg-accent-600/5 border-accent-600/20';
		}

		// Mode readonly avec style différencié
		if (readonly) {
			if (hasValue) {
				baseClass = baseClass.replace(
					'bg-accent-600/5 border-accent-600/20',
					'bg-info-50 border-input'
				);
			}
		}

		return baseClass;
	};

	const getSelectClassName = (field: keyof ProductBasicsData) => {
		let baseClass =
			'bg-surface border border-input rounded-md shadow-xs focus:ring-2 focus:ring-accent-600/20 focus:border-accent-700 focus:outline-none text-neutral-900';

		if (errors[field]) {
			baseClass += ' border-danger-600';
		}

		if (readonly) {
			if (values[field]) {
				baseClass += ' bg-info-50 border-input';
			}
		}

		return baseClass;
	};

	return (
		<div className={className}>
			{showTitle && (
				<>
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-900'>
							Informations de base
						</h3>

						{/* Nom du produit */}
						<div className='space-y-2'>
							<Label htmlFor='name' className='text-neutral-900'>
								Nom du produit{' '}
								<span className='text-danger-700'>*</span>
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
								<p className='text-sm text-danger-700'>
									{errors.name}
								</p>
							)}
						</div>

						{/* Marque */}
						<div className='space-y-2'>
							<Label htmlFor='brand' className='text-neutral-900'>
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
								<p className='text-sm text-danger-700'>
									{errors.brand}
								</p>
							)}
						</div>

						{/* Code-barres */}
						<div className='space-y-2'>
							<Label
								htmlFor='barcode'
								className='text-neutral-900'>
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
								<p className='text-sm text-danger-700'>
									{errors.barcode}
								</p>
							)}
							<p className='text-xs text-neutral-600'>
								Entre 8 et 13 chiffres uniquement
							</p>
						</div>

						{/* Catégorie */}
						<div className='space-y-2'>
							<Label
								htmlFor='category'
								className='text-neutral-900'>
								Catégorie{' '}
								<span className='text-danger-700'>*</span>
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
								<SelectContent className='bg-surface border border-neutral-200 rounded-xl shadow-sm'>
									{categories.length === 0 ? (
										<SelectItem value='loading' disabled>
											Chargement...
										</SelectItem>
									) : (
										categories.map((category) => (
											<SelectItem
												key={category.id}
												value={category.slug}
												className='text-neutral-900 hover:bg-neutral-50'>
												{category.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
							{errors.category && (
								<p className='text-sm text-danger-700'>
									{errors.category}
								</p>
							)}
						</div>
					</div>
					<Separator className='bg-neutral-100/20' />
				</>
			)}
		</div>
	);
};
