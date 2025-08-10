import type React from 'react';
import type { StorageLocationFilter } from '@/schemas';
import { Package, Refrigerator, Snowflake, ShoppingBasket } from 'lucide-react';

interface CategoryFilterProps {
	activeCategory: StorageLocationFilter;
	onCategoryChange: (category: StorageLocationFilter) => void;
}

const categories: {
	id: StorageLocationFilter;
	label: string;
	icon: React.ReactNode;
	description: string;
}[] = [
	{
		id: 'ALL',
		label: 'Tout',
		icon: <Package className='size-4' />,
		description: 'Tous les produits',
	},
	{
		id: 'FRESH',
		label: 'Frais',
		icon: <Refrigerator className='size-4' />,
		description: 'Produits frais',
	},
	{
		id: 'FREEZER',
		label: 'Surgelé',
		icon: <Snowflake className='size-4' />,
		description: 'Produits surgelés',
	},
	{
		id: 'PANTRY',
		label: 'Épicerie',
		icon: <ShoppingBasket className='size-4' />,
		description: "Produits d'épicerie",
	},
];

const CategoryFilter: React.FC<CategoryFilterProps> = ({
	activeCategory,
	onCategoryChange,
}) => {
	return (
		<div className='space-y-4'>
			{/* Filtres */}
			<div className='flex gap-2 overflow-x-auto py-2 scrollbar-hide'>
				{categories.map((category) => {
					const isActive = activeCategory === category.id;

					return (
						<button
							key={category.id}
							className={`
                group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-medium text-sm
                transition-all duration-200 cursor-pointer flex-shrink-0 border
                ${
					isActive
						? 'bg-success-50 text-neutral-50 border-success-50 shadow-sm'
						: 'bg-neutral-50 text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9F9E9] hover:text-[#1F2937] hover:border-success-50/20'
				}
              `}
							onClick={() => onCategoryChange(category.id)}>
							{/* Icône */}
							<div
								className={`transition-colors duration-200 ${
									isActive
										? 'text-neutral-50'
										: 'text-[#6B7280] group-hover:text-success-50'
								}`}>
								{category.icon}
							</div>

							{/* Label */}
							<span className='whitespace-nowrap font-medium'>
								{category.label}
							</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};

export default CategoryFilter;
