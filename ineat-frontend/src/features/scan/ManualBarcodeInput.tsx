'use client';

import React, { useState, useCallback } from 'react';
import { Search, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { OFF_UTILS, OFF_ERROR_MESSAGES } from '@/schemas/openfoodfact';
import { useOpenFoodFacts } from '@/hooks/useOpenFoodFacts';
import type { Product } from '@/schemas/product';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ManualBarcodeInputProps {
	onProductFound: (localProduct: Partial<Product>) => void;
	onProductNotFound: (barcode: string) => void;
	onError?: (error: string) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

export const ManualBarcodeInput: React.FC<ManualBarcodeInputProps> = ({
	onProductFound,
	onProductNotFound,
	onError,
	disabled = false,
	placeholder = 'Saisissez le code-barre (8-13 chiffres)',
	className = '',
}) => {
	const [barcode, setBarcode] = useState<string>('');
	const [validationError, setValidationError] = useState<string | null>(null);
	const [hasSearched, setHasSearched] = useState<boolean>(false);

	const {
		searchByBarcode,
		loading,
		error: offError,
		localProduct,
		data,
	} = useOpenFoodFacts();

	/**
	 * Valide le code-barre en temps réel
	 */
	const validateBarcode = useCallback((value: string): string | null => {
		if (value.length === 0) {
			return null; // Pas d'erreur si vide
		}

		if (value.length < 8) {
			return 'Le code-barre doit contenir au moins 8 chiffres';
		}

		if (value.length > 13) {
			return 'Le code-barre ne peut pas contenir plus de 13 chiffres';
		}

		if (!OFF_UTILS.isValidBarcode(value)) {
			return 'Le code-barre ne doit contenir que des chiffres';
		}

		return null; // Valide
	}, []);

	/**
	 * Gère le changement de valeur dans l'input
	 */
	const handleBarcodeChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value.trim();
			setBarcode(value);
			setHasSearched(false);

			// Validation en temps réel
			const error = validateBarcode(value);
			setValidationError(error);
		},
		[validateBarcode]
	);

	/**
	 * Gère la soumission du formulaire
	 */
	const handleSubmit = useCallback(
		async (e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			const trimmedBarcode = barcode.trim();

			// Validation finale
			const error = validateBarcode(trimmedBarcode);
			if (error) {
				setValidationError(error);
				return;
			}

			if (trimmedBarcode.length === 0) {
				setValidationError('Veuillez saisir un code-barre');
				return;
			}

			try {
				setHasSearched(true);
				setValidationError(null);

				// Recherche dans OpenFoodFacts
				await searchByBarcode(trimmedBarcode);
			} catch (err: unknown) {
				// L'erreur est gérée par le hook useOpenFoodFacts
				console.error('Erreur lors de la recherche:', err);
			}
		},
		[barcode, validateBarcode, searchByBarcode]
	);

	/**
	 * Gère les résultats de la recherche - SUCCÈS
	 */
	React.useEffect(() => {
		if (hasSearched && localProduct && data) {
			onProductFound(localProduct);
			setHasSearched(false);
			setBarcode(''); // Réinitialiser le champ
		}
	}, [hasSearched, localProduct, data, onProductFound]);

	/**
	 * Gère les résultats de la recherche - ERREURS
	 */
	React.useEffect(() => {
		if (!hasSearched) return;

		if (offError) {
			if (offError.type === 'PRODUCT_NOT_FOUND') {
				onProductNotFound(barcode.trim());
				setHasSearched(false);
			} else {
				const errorMessage =
					offError.message || OFF_ERROR_MESSAGES.UNKNOWN_ERROR;
				setValidationError(errorMessage);
				onError?.(errorMessage);
				setHasSearched(false);
			}
		}
	}, [offError, hasSearched, barcode, onProductNotFound, onError]);

	/**
	 * Détermine l'état visuel du composant
	 */
	const getInputState = (): 'default' | 'error' | 'loading' | 'success' => {
		if (loading) return 'loading';
		if (validationError) return 'error';
		if (hasSearched && localProduct) return 'success';
		return 'default';
	};

	const inputState = getInputState();

	/**
	 * Classes CSS pour l'input selon l'état
	 */
	const getInputClasses = (): string => {
		switch (inputState) {
			case 'error':
				return 'border-error-100 focus-visible:ring-error-100 text-error-100 placeholder:text-error-100';
			case 'loading':
				return 'border-primary-150 focus-visible:ring-primary-150';
			case 'success':
				return 'border-success-50 focus-visible:ring-success-50';
			default:
				return 'border-neutral-200 focus-visible:ring-primary-50';
		}
	};

	/**
	 * Icône selon l'état
	 */
	const getIcon = (): React.ReactNode => {
		switch (inputState) {
			case 'loading':
				return (
					<Loader2 className='size-5 text-neutral-100 animate-spin' />
				);
			case 'error':
				return <AlertCircle className='size-5 text-neutral-100' />;
			case 'success':
				return <CheckCircle2 className='size-5 text-success-50' />;
			default:
				return <Search className='size-5 text-neutral-50' />;
		}
	};

	return (
		<div className={`w-full ${className}`}>
			<form onSubmit={handleSubmit} className='space-y-3'>
				{/* Input avec icônes */}
				<div className='relative'>
					{/* Input principal */}
					<Input
						type='text'
						value={barcode}
						onChange={handleBarcodeChange}
						placeholder={placeholder}
						disabled={disabled || loading}
						className={`pl-4 pr-[100px] h-12 ${getInputClasses()}`}
						autoComplete='off'
						inputMode='numeric'
						pattern='[0-9]*'
						maxLength={13}
					/>

					{/* Bouton de soumission intégré */}
					<Button
						type='submit'
						disabled={
							disabled ||
							loading ||
							!!validationError ||
							barcode.trim().length === 0
						}
						className={`absolute right-2 top-1/2 -translate-y-1/2 h-9 px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-neutral-50 ${
							validationError
								? 'bg-error-100 hover:bg-error-100 active:bg-error-100'
								: 'bg-success-50'
						}`}>
						{loading ? 'Recherche...' : getIcon()}
					</Button>
				</div>

				{/* Message d'erreur */}
				{validationError && (
					<div className='flex items-center gap-2 text-sm text-error-600'>
						<AlertCircle className='size-4 flex-shrink-0' />
						<span>{validationError}</span>
					</div>
				)}
			</form>
		</div>
	);
};

/**
 * Composant simplifié pour usage dans une modal ou petit espace
 */
export const CompactManualBarcodeInput: React.FC<
	Omit<ManualBarcodeInputProps, 'className'>
> = (props) => {
	return (
		<ManualBarcodeInput
			{...props}
			placeholder='Code-barre'
			className='max-w-sm'
		/>
	);
};
