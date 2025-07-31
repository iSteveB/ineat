import React, { useState, useCallback } from 'react';
import { Search, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { OFF_UTILS, OFF_ERROR_MESSAGES } from '@/schemas/openfoodfact';
import { useOpenFoodFacts } from '@/hooks/useOpenFoodFacts';
import { Product } from '@/schemas/product';

/**
 * Props du composant ManualBarcodeInput
 */
interface ManualBarcodeInputProps {
	onProductFound: (localProduct: Partial<Product>) => void;
	onProductNotFound: (barcode: string) => void;
	onError?: (error: string) => void;
	disabled?: boolean;
	placeholder?: string;
	className?: string;
}

/**
 * Composant de saisie manuelle de code-barre
 *
 * Permet à l'utilisateur de saisir un code-barre manuellement avec :
 * - Validation en temps réel du format
 * - Recherche automatique dans OpenFoodFacts
 * - Messages d'erreur appropriés
 * - États de loading/succès/erreur
 *
 * @example
 * ```tsx
 * <ManualBarcodeInput
 *   onProductFound={(product) => {
 *     // Pré-remplir le formulaire d'ajout
 *     setFormData(product);
 *   }}
 *   onProductNotFound={(barcode) => {
 *     // Rediriger vers création manuelle
 *     router.push(`/products/create?barcode=${barcode}`);
 *   }}
 * />
 * ```
 */
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

	// CORRECTION: Utiliser une seule instance du hook
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
		async (e: React.FormEvent) => {
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
	 * Classes CSS selon l'état
	 */
	const getInputClasses = (): string => {
		const baseClasses =
			'w-full px-4 py-3 pl-12 pr-12 rounded-lg border text-base transition-all duration-200 focus:outline-none focus:ring-2';

		switch (inputState) {
			case 'error':
				return `${baseClasses} border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200 text-red-900 placeholder-red-400`;
			case 'loading':
				return `${baseClasses} border-blue-300 bg-blue-50 focus:border-blue-500 focus:ring-blue-200`;
			case 'success':
				return `${baseClasses} border-green-300 bg-green-50 focus:border-green-500 focus:ring-green-200`;
			default:
				return `${baseClasses} border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200`;
		}
	};

	/**
	 * Icône selon l'état
	 */
	const getIcon = (): React.ReactNode => {
		switch (inputState) {
			case 'loading':
				return (
					<Loader2 className='size-5 text-blue-500 animate-spin' />
				);
			case 'error':
				return <AlertCircle className='size-5 text-red-500' />;
			case 'success':
				return <CheckCircle2 className='size-5 text-green-500' />;
			default:
				return <Search className='size-5 text-gray-400' />;
		}
	};

	return (
		<div className={`w-full ${className}`}>
			<form onSubmit={handleSubmit} className='space-y-3'>
				{/* Input avec icônes */}
				<div className='relative'>
					{/* Icône à gauche */}
					<div className='absolute left-4 top-1/2 -translate-y-1/2'>
						{getIcon()}
					</div>

					{/* Input principal */}
					<input
						type='text'
						value={barcode}
						onChange={handleBarcodeChange}
						placeholder={placeholder}
						disabled={disabled || loading}
						className={getInputClasses()}
						autoComplete='off'
						inputMode='numeric'
						pattern='[0-9]*'
						maxLength={13}
					/>

					{/* Bouton de soumission intégré */}
					<button
						type='submit'
						disabled={
							disabled ||
							loading ||
							!!validationError ||
							barcode.trim().length === 0
						}
						className='absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'>
						{loading ? 'Recherche...' : 'Rechercher'}
					</button>
				</div>

				{/* Message d'erreur */}
				{validationError && (
					<div className='flex items-center gap-2 text-sm text-red-600'>
						<AlertCircle className='size-4 flex-shrink-0' />
						<span>{validationError}</span>
					</div>
				)}

				{/* Message d'aide */}
				{!validationError && !loading && (
					<p className='text-sm text-gray-500'>
						Formats supportés : EAN-8 (8 chiffres), EAN-13 (13
						chiffres), UPC-A (12 chiffres)
					</p>
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
