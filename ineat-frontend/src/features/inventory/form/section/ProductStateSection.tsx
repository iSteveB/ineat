import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	getProductStateOptions,
	type PackageStatus,
	type PreparationStatus,
} from '@/utils/productStateOptions';
import { cn } from '@/lib/utils';

export interface ProductStateData {
	packageStatus?: PackageStatus | '';
	preparationStatus?: PreparationStatus | '';
}

interface ProductStateSectionProps {
	values: ProductStateData;
	onChange: (field: keyof ProductStateData, value: string) => void;
	productName?: string;
	categorySlug?: string;
	categoryName?: string;
	storageLocation?: string;
	disabled?: boolean;
	className?: string;
}

const optionButtonClass = (selected: boolean): string =>
	cn(
		'h-8 rounded-full px-3 text-xs',
		selected
			? 'bg-success-50 text-neutral-50 hover:bg-success-50/90'
			: 'border-neutral-200 text-neutral-300 hover:bg-neutral-100',
	);

export const ProductStateSection: React.FC<ProductStateSectionProps> = ({
	values,
	onChange,
	productName,
	categorySlug,
	categoryName,
	storageLocation,
	disabled = false,
	className = '',
}) => {
	const options = getProductStateOptions({
		productName,
		categorySlug,
		categoryName,
		storageLocation,
	});

	if (!options.showPackageStatus && !options.showPreparationStatus) {
		return null;
	}

	return (
		<div className={cn('space-y-3', className)}>
			<div>
				<h3 className='text-sm font-medium text-neutral-300'>
					Préciser l’état du produit
				</h3>
				<p className='text-xs text-neutral-200'>
					Optionnel, utilisé pour ajuster la date estimée.
				</p>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
				{options.showPackageStatus && (
					<div className='space-y-2'>
						<Label className='text-xs text-neutral-300'>Ouverture</Label>
						<div className='flex gap-2'>
							<Button
								type='button'
								variant={
									values.packageStatus === 'UNOPENED' ? 'primary' : 'secondary'
								}
								size='sm'
								className={optionButtonClass(
									values.packageStatus === 'UNOPENED',
								)}
								disabled={disabled}
								onClick={() => onChange('packageStatus', 'UNOPENED')}
							>
								Fermé
							</Button>
							<Button
								type='button'
								variant={
									values.packageStatus === 'OPENED' ? 'primary' : 'secondary'
								}
								size='sm'
								className={optionButtonClass(values.packageStatus === 'OPENED')}
								disabled={disabled}
								onClick={() => onChange('packageStatus', 'OPENED')}
							>
								Ouvert
							</Button>
						</div>
					</div>
				)}

				{options.showPreparationStatus && (
					<div className='space-y-2'>
						<Label className='text-xs text-neutral-300'>Préparation</Label>
						<div className='flex gap-2'>
							<Button
								type='button'
								variant={
									values.preparationStatus === 'RAW' ? 'primary' : 'secondary'
								}
								size='sm'
								className={optionButtonClass(
									values.preparationStatus === 'RAW',
								)}
								disabled={disabled}
								onClick={() => onChange('preparationStatus', 'RAW')}
							>
								Cru
							</Button>
							<Button
								type='button'
								variant={
									values.preparationStatus === 'COOKED'
										? 'primary'
										: 'secondary'
								}
								size='sm'
								className={optionButtonClass(
									values.preparationStatus === 'COOKED',
								)}
								disabled={disabled}
								onClick={() => onChange('preparationStatus', 'COOKED')}
							>
								Cuit
							</Button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
