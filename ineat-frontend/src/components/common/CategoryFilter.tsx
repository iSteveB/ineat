import type React from 'react';
import type { StorageLocationFilter } from '@/schemas';
import { Package, Refrigerator, Snowflake, ShoppingBasket } from 'lucide-react';

import { cn } from '@/lib/utils';

interface CategoryFilterProps {
	activeCategory: StorageLocationFilter;
	onCategoryChange: (category: StorageLocationFilter) => void;
}

const categories: {
	id: StorageLocationFilter;
	label: string;
	icon: React.ReactNode;
}[] = [
	{ id: 'ALL', label: 'Tout', icon: <Package className='size-4' aria-hidden='true' /> },
	{ id: 'FRESH', label: 'Frais', icon: <Refrigerator className='size-4' aria-hidden='true' /> },
	{ id: 'FREEZER', label: 'Surgelé', icon: <Snowflake className='size-4' aria-hidden='true' /> },
	{ id: 'PANTRY', label: 'Épicerie', icon: <ShoppingBasket className='size-4' aria-hidden='true' /> },
];

/** Puces de filtre par lieu de stockage ; l'état sélectionné est annoncé par aria-pressed. */
const CategoryFilter: React.FC<CategoryFilterProps> = ({ activeCategory, onCategoryChange }) => (
	<div role='group' aria-label='Lieu de stockage' className='-mx-1 flex gap-2 overflow-x-auto px-1 py-1'>
		{categories.map((category) => {
			const isActive = activeCategory === category.id;

			return (
				<button
					key={category.id}
					type='button'
					aria-pressed={isActive}
					onClick={() => onCategoryChange(category.id)}
					className={cn(
						'inline-flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors',
						isActive
							? 'border-accent-600 bg-accent-600 text-surface'
							: 'border-neutral-300 bg-surface text-neutral-700 hover:border-accent-600 hover:text-accent-700'
					)}>
					{category.icon}
					{category.label}
				</button>
			);
		})}
	</div>
);

export default CategoryFilter;
