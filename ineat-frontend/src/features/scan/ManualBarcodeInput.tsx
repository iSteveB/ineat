import React, { useState, useCallback, useEffect } from 'react';
import { Search, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { OFF_UTILS, OFF_ERROR_MESSAGES } from '@/schemas/openfoodfact';
import { useOpenFoodFacts } from '@/hooks/useOpenFoodFacts';
import { OpenFoodFactsMapping } from '@/schemas/openfoodfact-mapping';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ManualBarcodeInputProps {
	onProductFound: (product: OpenFoodFactsMapping) => void;
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
		product,
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

				// Recherche dans OpenFoodFacts avec données enrichies
				await searchByBarcode(trimmedBarcode);
			} catch (err: unknown) {
				console.error('Erreur lors de la recherche:', err);
				const errorMessage =
					err instanceof Error
						? err.message
						: 'Erreur lors de la recherche';
				onError?.(errorMessage);
			}
		},
		[barcode, validateBarcode, searchByBarcode, onError]
	);

	/**
	 * Gère les résultats de la recherche OpenFoodFacts
	 */
	useEffect(() => {
		if (!hasSearched) return;

		if (product) {
			// Produit trouvé avec données enrichies
			console.log('Produit trouvé via saisie manuelle:', {
				barcode,
				name: product.imageUrl ? 'Avec image' : 'Sans image',
				nutriscore: product.nutriscore,
				ingredients: product.ingredients ? 'Présents' : 'Absents',
				quality: `${Math.round(product.quality.completeness * 100)}%`,
			});

			onProductFound(product);

			// Réinitialiser pour une nouvelle recherche
			setBarcode('');
			setHasSearched(false);
		} else if (offError && offError.type === 'PRODUCT_NOT_FOUND') {
			// Produit non trouvé
			console.log('Produit non trouvé:', barcode);
			onProductNotFound(barcode);

			// Réinitialiser pour une nouvelle recherche
			setBarcode('');
			setHasSearched(false);
		} else if (offError) {
			// Autres erreurs (réseau, etc.)
			console.error('Erreur OpenFoodFacts:', offError);
			const errorMessage =
				OFF_ERROR_MESSAGES[offError.type] || offError.message;
			onError?.(errorMessage);
			setHasSearched(false);
		}
	}, [
		hasSearched,
		product,
		offError,
		barcode,
		onProductFound,
		onProductNotFound,
		onError,
	]);

	/**
	 * Détermine l'état actuel de l'input
	 */
	const getInputState = () => {
		if (validationError) return 'error';
		if (loading) return 'loading';
		if (hasSearched && product) return 'success';
		if (hasSearched && offError?.type === 'PRODUCT_NOT_FOUND')
			return 'not-found';
		if (hasSearched && offError) return 'error';
		return 'default';
	};

	const inputState = getInputState();

	return (
		<div className={`space-y-3 ${className}`}>
			<form onSubmit={handleSubmit} className='space-y-3'>
				<div className='relative'>
					{/* Input avec états visuels */}
					<Input
						type='text'
						value={barcode}
						onChange={handleBarcodeChange}
						placeholder={placeholder}
						disabled={disabled || loading}
						className={`pr-12 ${
							inputState === 'error'
								? 'border-error-100 focus:border-error-100 focus:ring-error-100/20'
								: inputState === 'success'
								? 'border-success-50 focus:border-success-50 focus:ring-success-50/20'
								: inputState === 'not-found'
								? 'border-warning-50 focus:border-warning-50 focus:ring-warning-50/20'
								: 'focus:border-success-50 focus:ring-success-50/20'
						}`}
						maxLength={13}
						inputMode='numeric'
						pattern='[0-9]*'
						autoComplete='off'
						autoCorrect='off'
						spellCheck={false}
					/>

					{/* Icône de statut */}
					<div className='absolute right-3 top-1/2 -translate-y-1/2'>
						{loading && (
							<Loader2 className='size-4 text-blue-500 animate-spin' />
						)}
						{inputState === 'success' && (
							<CheckCircle2 className='size-4 text-success-50' />
						)}
						{inputState === 'error' && (
							<AlertCircle className='size-4 text-error-100' />
						)}
						{inputState === 'not-found' && (
							<AlertCircle className='size-4 text-warning-50' />
						)}
						{inputState === 'default' &&
							barcode.length > 0 &&
							!validationError && (
								<Search className='size-4 text-neutral-300' />
							)}
					</div>
				</div>

				{/* Messages d'erreur/validation */}
				{validationError && (
					<p className='text-sm text-error-100 flex items-center gap-1'>
						<AlertCircle className='size-3' />
						{validationError}
					</p>
				)}

				{/* Bouton de recherche */}
				<Button
					type='submit'
					disabled={
						disabled ||
						loading ||
						!!validationError ||
						!barcode.trim()
					}
					className='w-full bg-success-50 hover:bg-success-50/90 disabled:bg-neutral-200'>
					{loading ? (
						<>
							<Loader2 className='size-4 mr-2 animate-spin' />
							Recherche en cours...
						</>
					) : (
						<>
							<Search className='size-4 mr-2' />
							Rechercher le produit
						</>
					)}
				</Button>
			</form>

			{/* Informations d'aide */}
			<div className='text-xs text-neutral-200 space-y-1'>
				<p>
					• Codes-barres acceptés : EAN-8 (8 chiffres) ou EAN-13 (13
					chiffres)
				</p>
				<p>• La recherche se fait dans la base OpenFoodFacts</p>
				{barcode.length > 0 && !validationError && (
					<p className='text-success-50'>
						• Code-barre valide : {barcode} ({barcode.length}{' '}
						chiffres)
					</p>
				)}
			</div>

			{/* Indicateur de qualité des données (affiché après recherche réussie) */}
			{product && hasSearched && (
				<div className='mt-4 p-3 bg-success-50/10 border border-success-50/20 rounded-lg'>
					<div className='flex items-center gap-2 text-sm'>
						<CheckCircle2 className='size-4 text-success-50' />
						<span className='text-success-50 font-medium'>
							Produit trouvé
						</span>
						<span className='text-neutral-300'>
							({Math.round(product.quality.completeness * 100)}%
							complet)
						</span>
					</div>

					{product.quality.completeness < 0.7 && (
						<p className='text-xs text-neutral-200 mt-1'>
							Données partielles - certaines informations peuvent
							être manquantes
						</p>
					)}
				</div>
			)}
		</div>
	);
};
