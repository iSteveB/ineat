import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from 'use-debounce';

interface ProductSearchBarProps {
	onSearch: (query: string) => void;
	onClear?: () => void;
	isLoading?: boolean;
	placeholder?: string;
	autoFocus?: boolean;
	className?: string;
	minSearchLength?: number;
	defaultQuery?: string;
}

export const ProductSearchBar: React.FC<ProductSearchBarProps> = ({
	onSearch,
	onClear,
	isLoading = false,
	placeholder = 'Rechercher un produit (nom, marque, code-barres)...',
	autoFocus = true,
	className,
	minSearchLength = 2,
	defaultQuery = '',
}) => {
	const [searchValue, setSearchValue] = useState<string>(defaultQuery);
	const [showClearButton, setShowClearButton] = useState<boolean>(false);

	// Debounce de la recherche (300ms)
	const debouncedSearch = useDebouncedCallback((value: string) => {
		if (value.trim().length >= minSearchLength) {
			onSearch(value.trim());
		} else if (value.trim().length === 0) {
			handleClear();
		}
	}, 300);

	// Mettre à jour la valeur quand defaultQuery change
	useEffect(() => {
		if (defaultQuery && defaultQuery !== searchValue) {
			setSearchValue(defaultQuery);
			// Déclencher la recherche automatiquement si la longueur est suffisante
			if (defaultQuery.trim().length >= minSearchLength) {
				debouncedSearch(defaultQuery);
			}
		}
	}, [defaultQuery, searchValue, minSearchLength, debouncedSearch]);

	useEffect(() => {
		setShowClearButton(searchValue.length > 0);
	}, [searchValue]);

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setSearchValue(value);
		debouncedSearch(value);
	};

	const handleClear = useCallback(() => {
		setSearchValue('');
		setShowClearButton(false);
		onClear?.();
	}, [onClear]);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') {
			handleClear();
		}
	};

	return (
		<div className={cn('relative w-full', className)}>
			<div className='relative'>
				<div className='absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none'>
					{isLoading ? (
						<Loader2 className='size-4 text-neutral-200 animate-spin' />
					) : (
						<Search className='size-4 text-neutral-200' />
					)}
				</div>

				<Input
					type='text'
					value={searchValue}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					autoFocus={autoFocus}
					className={cn(
						'pl-10 pr-10',
						'focus:ring-2 focus:ring-accent-500 focus:border-accent-500',
						'placeholder:text-neutral-200'
					)}
				/>

				{showClearButton && (
					<button
						type='button'
						onClick={handleClear}
						className='absolute inset-y-0 right-0 flex items-center pr-3 hover:text-neutral-300 transition-colors'
						aria-label='Effacer la recherche'>
						<X className='size-4 text-neutral-200' />
					</button>
				)}
			</div>

			{searchValue.length > 0 && searchValue.length < minSearchLength && (
				<p className='text-xs text-neutral-200 mt-1 ml-1'>
					Entrez au moins {minSearchLength} caractères pour lancer la
					recherche
				</p>
			)}
		</div>
	);
};

export default ProductSearchBar;
