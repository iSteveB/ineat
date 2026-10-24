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
import type { UnitType } from '@/schemas';

export interface ProductQuantityData {
	quantity: string;
	unitType: UnitType;
}

interface ProductQuantitySectionProps {
	values: ProductQuantityData;
	onChange: (field: keyof ProductQuantityData, value: string) => void;
	disabled?: boolean;
	readonly?: boolean;
	showTitle?: boolean;
	errors?: Partial<Record<keyof ProductQuantityData, string>>;
	className?: string;
}

const UNIT_TYPE_OPTIONS = [
	{ value: 'UNIT', label: 'Unité(s)' },
	{ value: 'KG', label: 'Kilogramme(s)' },
	{ value: 'G', label: 'Gramme(s)' },
	{ value: 'L', label: 'Litre(s)' },
	{ value: 'ML', label: 'Millilitre(s)' },
] as const;

export const ProductQuantitySection: React.FC<ProductQuantitySectionProps> = ({
	values,
	onChange,
	disabled = false,
	readonly = false,
	showTitle = true,
	errors = {},
	className = '',
}) => {
	const isFieldDisabled = disabled || readonly;

	const handleFieldChange = (
		field: keyof ProductQuantityData,
		value: string
	) => {
		if (!readonly) {
			onChange(field, value);
		}
	};

	const getInputClassName = (field: keyof ProductQuantityData) => {
		let baseClass =
			'bg-surface border border-input rounded-md shadow-xs focus:ring-2 focus:ring-accent-600/20 focus:border-accent-700 focus:outline-none text-neutral-900 placeholder:text-neutral-500';

		// Erreur
		if (errors[field]) {
			baseClass += ' border-danger-600';
		}

		// Mode readonly avec style différencié
		if (readonly && values[field]) {
			baseClass = baseClass.replace('bg-surface', 'bg-info-50');
		}

		return baseClass;
	};

	const getSelectClassName = () => {
		let baseClass =
			'bg-surface border border-input rounded-md shadow-xs focus:ring-2 focus:ring-accent-600/20 focus:border-accent-700 focus:outline-none text-neutral-900';

		// Mode readonly avec style différencié
		if (readonly && values.unitType) {
			baseClass = baseClass.replace('bg-surface', 'bg-info-50');
		}

		return baseClass;
	};

	return (
		<div className={className}>
			{showTitle && (
				<>
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-900'>
							Quantité et unité
						</h3>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							{/* Quantité */}
							<div className='space-y-2'>
								<Label
									htmlFor='quantity'
									className='text-neutral-900'>
									Quantité{' '}
									<span className='text-danger-700'>*</span>
								</Label>
								<Input
									id='quantity'
									type='number'
									step='0.01'
									min='0'
									value={values.quantity}
									onChange={(e) =>
										handleFieldChange(
											'quantity',
											e.target.value
										)
									}
									placeholder='Ex: 1.5'
									className={getInputClassName('quantity')}
									disabled={isFieldDisabled}
								/>
								{errors.quantity && (
									<p className='text-sm text-danger-700'>
										{errors.quantity}
									</p>
								)}
							</div>

							{/* Unité */}
							<div className='space-y-2'>
								<Label
									htmlFor='unitType'
									className='text-neutral-900'>
									Unité{' '}
									<span className='text-danger-700'>*</span>
								</Label>
								<Select
									value={values.unitType}
									onValueChange={(value) =>
										handleFieldChange('unitType', value)
									}
									disabled={isFieldDisabled}>
									<SelectTrigger
										className={getSelectClassName()}>
										<SelectValue />
									</SelectTrigger>
									<SelectContent className='bg-surface border border-neutral-200 rounded-xl shadow-sm'>
										{UNIT_TYPE_OPTIONS.map((option) => (
											<SelectItem
												key={option.value}
												value={option.value}
												className='text-neutral-900 hover:bg-neutral-50'>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{errors.unitType && (
									<p className='text-sm text-danger-700'>
										{errors.unitType}
									</p>
								)}
							</div>
						</div>
					</div>
					<Separator className='bg-neutral-100/20' />
				</>
			)}
		</div>
	);
};
