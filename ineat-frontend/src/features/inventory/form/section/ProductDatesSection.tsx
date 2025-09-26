import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

export interface ProductDatesData {
	purchaseDate: string;
	expiryDate: string;
}

interface ProductDatesSectionProps {
	values: ProductDatesData;
	onChange: (field: keyof ProductDatesData, value: string) => void;
	disabled?: boolean;
	readonly?: boolean;
	showTitle?: boolean;
	errors?: Partial<Record<keyof ProductDatesData, string>>;
	className?: string;
}

export const ProductDatesSection: React.FC<ProductDatesSectionProps> = ({
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
		field: keyof ProductDatesData,
		value: string
	) => {
		if (!readonly) {
			onChange(field, value);
		}
	};

	const getInputClassName = (field: keyof ProductDatesData) => {
		let baseClass =
			'bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300';

		// Erreur
		if (errors[field]) {
			baseClass += ' border-error-100';
		}

		// Mode readonly avec style différencié
		if (readonly && values[field]) {
			baseClass = baseClass.replace('bg-neutral-50', 'bg-blue-50/5');
			baseClass = baseClass.replace(
				'border-neutral-200',
				'border-blue-500/20'
			);
			baseClass = baseClass.replace(
				'focus:ring-success-50 focus:border-success-50',
				'focus:ring-blue-500 focus:border-blue-500'
			);
		}

		return baseClass;
	};

	// Validation logique des dates
	const validateDatesLogic = (): string | null => {
		if (!values.purchaseDate || !values.expiryDate) {
			return null; // Pas d'erreur si une des dates est manquante
		}

		const purchaseDate = new Date(values.purchaseDate);
		const expiryDate = new Date(values.expiryDate);

		if (expiryDate <= purchaseDate) {
			return "La date de péremption doit être postérieure à la date d'achat";
		}

		return null;
	};

	const datesValidationError = validateDatesLogic();

	return (
		<div className={className}>
			{showTitle && (
				<>
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-300'>
							Dates
						</h3>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							{/* Date d'achat */}
							<div className='space-y-2'>
								<Label
									htmlFor='purchaseDate'
									className='text-neutral-300'>
									Date d'achat{' '}
									<span className='text-error-100'>*</span>
								</Label>
								<Input
									id='purchaseDate'
									type='date'
									value={values.purchaseDate}
									onChange={(e) =>
										handleFieldChange(
											'purchaseDate',
											e.target.value
										)
									}
									className={getInputClassName(
										'purchaseDate'
									)}
									disabled={isFieldDisabled}
								/>
								{errors.purchaseDate && (
									<p className='text-sm text-error-100'>
										{errors.purchaseDate}
									</p>
								)}
							</div>

							{/* Date de péremption */}
							<div className='space-y-2'>
								<Label
									htmlFor='expiryDate'
									className='text-neutral-300'>
									Date de péremption
								</Label>
								<Input
									id='expiryDate'
									type='date'
									value={values.expiryDate}
									onChange={(e) =>
										handleFieldChange(
											'expiryDate',
											e.target.value
										)
									}
									className={getInputClassName('expiryDate')}
									disabled={isFieldDisabled}
								/>
								{errors.expiryDate && (
									<p className='text-sm text-error-100'>
										{errors.expiryDate}
									</p>
								)}
							</div>
						</div>

						{/* Erreur de validation croisée des dates */}
						{datesValidationError && (
							<div className='mt-2'>
								<p className='text-sm text-error-100 flex items-start gap-2'>
									<span className='mt-0.5'>⚠️</span>
									{datesValidationError}
								</p>
							</div>
						)}
					</div>
					<Separator className='bg-neutral-200/20' />
				</>
			)}
		</div>
	);
};
