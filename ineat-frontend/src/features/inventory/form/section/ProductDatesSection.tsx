import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Info } from 'lucide-react';

export interface ProductDatesData {
	purchaseDate: string;
	expiryDate: string;
	expiryDateSource?: 'MANUAL' | 'ESTIMATED';
}

interface ProductDatesSectionProps {
	values: ProductDatesData;
	onChange: (field: keyof ProductDatesData, value: string) => void;
	estimatedExpiryDate?: string | null;
	estimatedExpiryReason?: string | null;
	disabled?: boolean;
	readonly?: boolean;
	showTitle?: boolean;
	errors?: Partial<Record<keyof ProductDatesData, string>>;
	className?: string;
}

export const ProductDatesSection: React.FC<ProductDatesSectionProps> = ({
	values,
	onChange,
	estimatedExpiryDate,
	disabled = false,
	readonly = false,
	showTitle = true,
	errors = {},
	className = '',
}) => {
	const isFieldDisabled = disabled || readonly;

	const handleFieldChange = (field: keyof ProductDatesData, value: string) => {
		if (!readonly) {
			onChange(field, value);
		}
	};

	const getInputClassName = (field: keyof ProductDatesData) => {
		let baseClass =
			'bg-surface border border-input rounded-md shadow-xs focus:ring-2 focus:ring-accent-600/20 focus:border-accent-700 focus:outline-none text-neutral-900';

		// Erreur
		if (errors[field]) {
			baseClass += ' border-danger-600';
		}

		// Mode readonly avec style différencié
		if (readonly && values[field]) {
			baseClass = baseClass.replace('bg-surface', 'bg-info-50');
			baseClass = baseClass.replace(
				'focus:ring-accent-600/20 focus:border-accent-700',
				'focus:ring-accent-600/20 focus:border-accent-700',
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
	const isEstimatedExpiryDate =
		values.expiryDateSource === 'ESTIMATED' && Boolean(values.expiryDate);
	const estimatedLabelDate = values.expiryDate || estimatedExpiryDate;
	const showEstimatedDate = Boolean(
		estimatedLabelDate &&
			(isEstimatedExpiryDate || (!values.expiryDate && estimatedExpiryDate))
	);

	return (
		<div className={className}>
			{showTitle && (
				<>
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-900'>Dates</h3>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							{/* Date d'achat */}
							<div className='space-y-2'>
								<Label htmlFor='purchaseDate' className='text-neutral-900'>
									Date d'achat <span className='text-danger-700'>*</span>
								</Label>
								<Input
									id='purchaseDate'
									type='date'
									value={values.purchaseDate}
									onChange={(e) =>
										handleFieldChange('purchaseDate', e.target.value)
									}
									className={getInputClassName('purchaseDate')}
									disabled={isFieldDisabled}
								/>
								{errors.purchaseDate && (
									<p className='text-sm text-danger-700'>
										{errors.purchaseDate}
									</p>
								)}
							</div>

							{/* Date de péremption */}
							<div className='space-y-2'>
								<Label htmlFor='expiryDate' className='flex items-center gap-1 text-neutral-900'>
									Date de péremption
									{showEstimatedDate && (
										<span title='Date estimée' aria-label='Date estimée'>
											<Info className='size-3.5' aria-hidden='true' />
										</span>
									)}
								</Label>
								<Input
									id='expiryDate'
									type='date'
									value={values.expiryDate}
									onChange={(e) =>
										handleFieldChange('expiryDate', e.target.value)
									}
									className={getInputClassName('expiryDate')}
									disabled={isFieldDisabled}
								/>
								{errors.expiryDate && (
									<p className='text-sm text-danger-700'>{errors.expiryDate}</p>
								)}
							</div>
						</div>

						{/* Erreur de validation croisée des dates */}
						{datesValidationError && (
							<div className='mt-2'>
								<p className='text-sm text-danger-700 flex items-start gap-2'>
									<span className='mt-0.5'>⚠️</span>
									{datesValidationError}
								</p>
							</div>
						)}
					</div>
					<Separator className='bg-neutral-100/20' />
				</>
			)}
		</div>
	);
};
