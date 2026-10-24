import React from 'react';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Zap, Leaf } from 'lucide-react';

export interface ScoresData {
	nutriscore: string;
	ecoscore: string;
	novascore: string;
}

interface ProductScoresSectionProps {
	values: ScoresData;
	onChange: (field: keyof ScoresData, value: string) => void;
	disabled?: boolean;
	readonly?: boolean;
	showTitle?: boolean;
	className?: string;
}

export const ProductScoresSection: React.FC<ProductScoresSectionProps> = ({
	values,
	onChange,
	disabled = false,
	readonly = false,
	showTitle = true,
	className = '',
}) => {
	const isFieldDisabled = disabled || readonly;

	const handleScoreChange = (field: keyof ScoresData, value: string) => {
		if (!readonly) {
			onChange(field, value);
		}
	};

	const getSelectClassName = (hasValue: boolean = false) => {
		let baseClass = 'bg-surface border border-input rounded-md shadow-xs focus:ring-2 focus:ring-accent-600/20 focus:border-accent-700 focus:outline-none text-neutral-900';
		
		if (readonly && hasValue) {
			baseClass += ' bg-info-50 border-input';
		}
		
		return baseClass;
	};

	return (
		<div className={className}>
			{showTitle && (
				<>
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-900'>
							Scores nutritionnels et environnementaux
						</h3>
						
						<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
							{/* Nutri-Score */}
							<div className='space-y-2'>
								<Label htmlFor='nutriscore' className='text-neutral-900'>
									<Zap className='inline size-3 mr-1' />
									Nutri-Score
								</Label>
								<Select
									value={values.nutriscore}
									onValueChange={(value) => handleScoreChange('nutriscore', value)}
									disabled={isFieldDisabled}>
									<SelectTrigger className={getSelectClassName(!!values.nutriscore)}>
										<SelectValue placeholder='Sélectionnez un score' />
									</SelectTrigger>
									<SelectContent className='bg-surface border border-neutral-200 rounded-xl shadow-sm'>
										<SelectItem value='A' className='text-neutral-900 hover:bg-neutral-50'>
											A - Très bonne qualité
										</SelectItem>
										<SelectItem value='B' className='text-neutral-900 hover:bg-neutral-50'>
											B - Bonne qualité
										</SelectItem>
										<SelectItem value='C' className='text-neutral-900 hover:bg-neutral-50'>
											C - Qualité moyenne
										</SelectItem>
										<SelectItem value='D' className='text-neutral-900 hover:bg-neutral-50'>
											D - Mauvaise qualité
										</SelectItem>
										<SelectItem value='E' className='text-neutral-900 hover:bg-neutral-50'>
											E - Très mauvaise qualité
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Eco-Score */}
							<div className='space-y-2'>
								<Label htmlFor='ecoscore' className='text-neutral-900'>
									<Leaf className='inline size-3 mr-1' />
									Eco-Score
								</Label>
								<Select
									value={values.ecoscore}
									onValueChange={(value) => handleScoreChange('ecoscore', value)}
									disabled={isFieldDisabled}>
									<SelectTrigger className={getSelectClassName(!!values.ecoscore)}>
										<SelectValue placeholder='Sélectionnez un score' />
									</SelectTrigger>
									<SelectContent className='bg-surface border border-neutral-200 rounded-xl shadow-sm'>
										<SelectItem value='A' className='text-neutral-900 hover:bg-neutral-50'>
											A - Très faible impact
										</SelectItem>
										<SelectItem value='B' className='text-neutral-900 hover:bg-neutral-50'>
											B - Faible impact
										</SelectItem>
										<SelectItem value='C' className='text-neutral-900 hover:bg-neutral-50'>
											C - Impact modéré
										</SelectItem>
										<SelectItem value='D' className='text-neutral-900 hover:bg-neutral-50'>
											D - Impact élevé
										</SelectItem>
										<SelectItem value='E' className='text-neutral-900 hover:bg-neutral-50'>
											E - Impact très élevé
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Nova-Score */}
							<div className='space-y-2'>
								<Label htmlFor='novascore' className='text-neutral-900'>
									Nova Score
								</Label>
								<Select
									value={values.novascore}
									onValueChange={(value) => handleScoreChange('novascore', value)}
									disabled={isFieldDisabled}>
									<SelectTrigger className={getSelectClassName(!!values.novascore)}>
										<SelectValue placeholder='Niveau de transformation' />
									</SelectTrigger>
									<SelectContent className='bg-surface border border-neutral-200 rounded-xl shadow-sm'>
										<SelectItem value='1' className='text-neutral-900 hover:bg-neutral-50'>
											1 - Non transformés
										</SelectItem>
										<SelectItem value='2' className='text-neutral-900 hover:bg-neutral-50'>
											2 - Ingrédients transformés
										</SelectItem>
										<SelectItem value='3' className='text-neutral-900 hover:bg-neutral-50'>
											3 - Transformés
										</SelectItem>
										<SelectItem value='4' className='text-neutral-900 hover:bg-neutral-50'>
											4 - Ultra-transformés
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>
					<Separator className='bg-neutral-100/20' />
				</>
			)}
		</div>
	);
};