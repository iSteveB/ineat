import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';

export interface ProductContentData {
	ingredients: string;
	imageUrl: string;
}

interface ProductContentSectionProps {
	values: ProductContentData;
	onChange: (field: keyof ProductContentData, value: string) => void;
	disabled?: boolean;
	readonly?: boolean;
	showTitle?: boolean;
	errors?: Partial<Record<keyof ProductContentData, string>>;
	className?: string;
}

export const ProductContentSection: React.FC<ProductContentSectionProps> = ({
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
		field: keyof ProductContentData,
		value: string
	) => {
		if (!readonly) {
			onChange(field, value);
		}
	};

	const getTextareaClassName = () => {
		let baseClass =
			'bg-surface border border-input rounded-md shadow-xs focus:ring-2 focus:ring-accent-600/20 focus:border-accent-700 focus:outline-none text-neutral-900 placeholder:text-neutral-500 resize-none';

		if (readonly && values.ingredients) {
			baseClass = baseClass.replace('bg-surface', 'bg-info-50');
		}

		return baseClass;
	};

	const getInputClassName = (field: keyof ProductContentData) => {
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

	return (
		<div className={className}>
			{showTitle && (
				<>
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-900'>
							Contenu et média
						</h3>

						{/* Liste des ingrédients */}
						<div className='space-y-2'>
							<Label
								htmlFor='ingredients'
								className='text-neutral-900'>
								Liste des ingrédients
							</Label>
							<Textarea
								id='ingredients'
								value={values.ingredients}
								onChange={(e) =>
									handleFieldChange(
										'ingredients',
										e.target.value
									)
								}
								placeholder='Ex: Farine de blé, eau, levure, sel...'
								rows={4}
								className={getTextareaClassName()}
								disabled={isFieldDisabled}
							/>
							{errors.ingredients && (
								<p className='text-sm text-danger-700'>
									{errors.ingredients}
								</p>
							)}
							<p className='text-xs text-neutral-600'>
								Listez les ingrédients par ordre décroissant de
								quantité
							</p>
						</div>

						{/* Image URL */}
						<div className='space-y-2'>
							<Label
								htmlFor='imageUrl'
								className='text-neutral-900'>
								Image du produit (URL)
							</Label>
							<Input
								id='imageUrl'
								type='url'
								value={values.imageUrl}
								onChange={(e) =>
									handleFieldChange(
										'imageUrl',
										e.target.value
									)
								}
								placeholder='Ex: https://example.com/image.jpg'
								className={getInputClassName('imageUrl')}
								disabled={isFieldDisabled}
							/>
							{errors.imageUrl && (
								<p className='text-sm text-danger-700'>
									{errors.imageUrl}
								</p>
							)}
							<p className='text-xs text-neutral-600'>
								URL de l'image du produit (JPG, PNG, WebP)
							</p>
						</div>
					</div>
					<Separator className='bg-neutral-100/20' />
				</>
			)}
		</div>
	);
};
