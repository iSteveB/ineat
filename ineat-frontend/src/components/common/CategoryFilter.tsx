import React from 'react';
import { StorageLocation } from '@/types/product';

// Type pour les propriétés du composant
interface CategoryFilterProps {
	activeCategory: StorageLocation;
	onCategoryChange: (category: StorageLocation) => void;
}

const categories: { id: StorageLocation; label: string }[] = [
	{ id: 'ALL', label: 'Tout' },
	{ id: 'FRESH', label: 'Frais' },
	{ id: 'FREEZER', label: 'Surgelé' },
	{ id: 'PANTRY', label: 'Épicerie' },
];

const CategoryFilter: React.FC<CategoryFilterProps> = ({
	activeCategory,
	onCategoryChange,
}) => {
	return (
		<div className='flex space-x-2 overflow-x-auto pb-2'>
			{categories.map((category) => (
				<button
					key={category.id}
					className={`px-6 py-3 rounded-full font-medium transition-colors cursor-pointer ${
						activeCategory === category.id
							? 'bg-primary-100 text-neutral-300'
							: 'bg-neutral-50 text-neutral-200 hover:bg-neutral-100'
					}`}
					onClick={() => onCategoryChange(category.id)}>
					{category.label}
				</button>
			))}
		</div>
	);
};

export default CategoryFilter;
