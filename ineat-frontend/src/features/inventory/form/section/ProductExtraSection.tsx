import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Euro } from 'lucide-react';

export interface ProductExtrasData {
	purchasePrice: string;
	storageLocation: string;
	notes: string;
}

interface ProductExtrasSectionProps {
	values: ProductExtrasData;
	onChange: (field: keyof ProductExtrasData, value: string) => void;
	disabled?: boolean;
	readonly?: boolean;
	showTitle?: boolean;
	errors?: Partial<Record<keyof ProductExtrasData, string>>;
	storageLocationOptions?: string[];
	className?: string;
}

const DEFAULT_STORAGE_LOCATION_OPTIONS = [
	'Réfrigérateur',
	'Congélateur',
	'Placard',
	'Cave',
	'Garde-manger',
	'Fruitier',
	'Autre',
];

export const ProductExtraSection: React.FC<ProductExtrasSectionProps> = ({
	values,
	onChange,
	disabled = false,
	readonly = false,
	showTitle = true,
	errors = {},
	storageLocationOptions = DEFAULT_STORAGE_LOCATION_OPTIONS,
	className = '',
}) => {
	const isFieldDisabled = disabled || readonly;

	const handleFieldChange = (
		field: keyof ProductExtrasData,
		value: string
	) => {
		if (!readonly) {
			onChange(field, value);
		}
	};

	const getInputClassName = (field: keyof ProductExtrasData) => {
		let baseClass =
			'bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200';

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

	const getSelectClassName = () => {
		let baseClass =
			'bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300';

		// Mode readonly avec style différencié
		if (readonly && values.storageLocation) {
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

	return (
		<div className={className}>
			{showTitle && (
				<h3 className='text-md font-medium text-neutral-300 mb-4'>
					Informations supplémentaires
				</h3>
			)}

			<div className='space-y-4'>
				{/* Première ligne : Prix et Lieu de stockage */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					{/* Prix d'achat */}
					<div className='space-y-2'>
						<Label
							htmlFor='purchasePrice'
							className='flex items-center gap-2 text-neutral-300'>
							<Euro className='size-3 text-neutral-300' />
							Prix d'achat (€)
							<span className='text-xs text-neutral-200 font-normal'>
								(déduit du budget)
							</span>
						</Label>
						<Input
							id='purchasePrice'
							type='number'
							step='0.01'
							min='0'
							value={values.purchasePrice}
							onChange={(e) =>
								handleFieldChange('purchasePrice', e.target.value)
							}
							placeholder='Ex: 2.50'
							className={getInputClassName('purchasePrice')}
							disabled={isFieldDisabled}
							readOnly={readonly}
						/>
						{errors.purchasePrice && (
							<p className='text-sm text-error-100'>
								{errors.purchasePrice}
							</p>
						)}
					</div>

					{/* Lieu de stockage */}
					<div className='space-y-2'>
						<Label
							htmlFor='storageLocation'
							className='text-neutral-300'>
							Lieu de stockage
						</Label>
						<Select
							value={values.storageLocation}
							onValueChange={(value) =>
								handleFieldChange('storageLocation', value)
							}
							disabled={isFieldDisabled || readonly}>
							<SelectTrigger className={getSelectClassName()}>
								<SelectValue placeholder='Sélectionnez un lieu' />
							</SelectTrigger>
							<SelectContent className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm'>
								{storageLocationOptions.map((location) => (
									<SelectItem
										key={location}
										value={location}
										className='text-neutral-300 hover:bg-neutral-100'>
										{location}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Notes */}
				<div className='space-y-2'>
					<Label htmlFor='notes' className='text-neutral-300'>
						Notes
					</Label>
					<Textarea
						id='notes'
						value={values.notes}
						onChange={(e) =>
							handleFieldChange('notes', e.target.value)
						}
						placeholder='Ajoutez une note sur ce produit...'
						rows={3}
						className={getInputClassName('notes')}
						disabled={isFieldDisabled}
						readOnly={readonly}
					/>
					{errors.notes && (
						<p className='text-sm text-error-100'>
							{errors.notes}
						</p>
					)}
				</div>
			</div>
		</div>
	);
};