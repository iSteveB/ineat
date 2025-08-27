import React, { useState, useEffect } from 'react';
import {
	Package,
	Save,
	Calendar,
	MapPin,
	Euro,
	Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { NutriScoreBadge } from '@/components/common/NutriScoreBadge';
import { EcoScoreBadge } from '@/components/common/EcoScoreBadge';
import {
	ProductSearchResult,
	QuickAddFormData,
} from '@/services/inventoryService';

interface ExistingProductQuickAddFormProps {
	product: ProductSearchResult;
	onSubmit: (data: QuickAddFormData) => Promise<void>;
	onCancel: () => void;
	isSubmitting?: boolean;
}

// Lieux de stockage prédéfinis
const STORAGE_LOCATIONS = [
	{ value: 'refrigerateur', label: 'Réfrigérateur' },
	{ value: 'congelateur', label: 'Congélateur' },
	{ value: 'placard', label: 'Placard' },
	{ value: 'cellier', label: 'Cellier' },
	{ value: 'cave', label: 'Cave' },
	{ value: 'autre', label: 'Autre' },
];

// Fonction pour formater une date au format yyyy-MM-dd
const formatDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

// Fonction pour ajouter des jours à une date
const addDays = (date: Date, days: number): Date => {
	const result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
};

/**
 * Composant pour ajouter rapidement un produit existant à l'inventaire
 * Utilisé dans AddManualProductPage quand un produit est sélectionné depuis la recherche
 */
export const ExistingProductQuickAddForm: React.FC<
	ExistingProductQuickAddFormProps
> = ({ product, onSubmit, onCancel, isSubmitting = false }) => {
	// États du formulaire
	const [quantity, setQuantity] = useState('1');
	const [purchaseDate, setPurchaseDate] = useState(formatDate(new Date()));
	const [expiryDate, setExpiryDate] = useState('');
	const [purchasePrice, setPurchasePrice] = useState('');
	const [storageLocation, setStorageLocation] = useState('placard');
	const [notes, setNotes] = useState('');
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Fonction pour calculer une date de péremption par défaut selon la catégorie
	const getSuggestedExpiryDate = (categorySlug: string): string => {
		const today = new Date();
		let daysToAdd = 7; // Par défaut, 1 semaine

		if (categorySlug.includes('frais') || categorySlug.includes('viande')) {
			daysToAdd = 3;
		} else if (categorySlug.includes('laitier')) {
			daysToAdd = 14;
		} else if (
			categorySlug.includes('conserve') ||
			categorySlug.includes('sec')
		) {
			daysToAdd = 365;
		}

		return formatDate(addDays(today, daysToAdd));
	};

	useEffect(() => {
		// Suggérer une date de péremption basée sur la catégorie du produit
		if (product.category?.slug) {
			setExpiryDate(getSuggestedExpiryDate(product.category.slug));
		}
	}, [product]);

	// Validation du formulaire
	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		const quantityNum = parseFloat(quantity);
		if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
			newErrors.quantity = 'La quantité doit être supérieure à 0';
		}

		if (!purchaseDate) {
			newErrors.purchaseDate = "La date d'achat est obligatoire";
		}

		if (
			purchasePrice &&
			(isNaN(parseFloat(purchasePrice)) || parseFloat(purchasePrice) < 0)
		) {
			newErrors.purchasePrice = 'Le prix doit être un nombre positif';
		}

		// Validation des dates
		if (expiryDate && purchaseDate) {
			const purchaseDateObj = new Date(purchaseDate);
			const expiryDateObj = new Date(expiryDate);

			if (expiryDateObj <= purchaseDateObj) {
				newErrors.expiryDate =
					"La date de péremption doit être postérieure à la date d'achat";
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Soumission du formulaire
	const handleSubmit = async () => {
		if (!validate()) return;

		const data: QuickAddFormData = {
			productId: product.id, // IMPORTANT: Inclure le productId
			quantity: parseFloat(quantity),
			purchaseDate,
			expiryDate: expiryDate || undefined,
			purchasePrice: purchasePrice
				? parseFloat(purchasePrice)
				: undefined,
			storageLocation: storageLocation || undefined,
			notes: notes || undefined,
		};

		await onSubmit(data);
	};

	// Gestionnaire de changement avec effacement d'erreur
	const handleFieldChange = (
		field: string,
		value: string,
		setter: (value: string) => void
	) => {
		setter(value);
		if (errors[field]) {
			setErrors((prev) => {
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { [field]: removed, ...rest } = prev;
				return rest;
			});
		}
	};

	return (
		<div className='space-y-6'>

			{/* Carte du produit sélectionné */}
			<Card className='p-4 bg-primary-50/50 border-primary-100'>
				<div className='flex items-center space-x-4'>
					<div className='size-16 rounded-lg overflow-hidden bg-neutral-50 flex-shrink-0'>
						{product.imageUrl ? (
							<img
								src={product.imageUrl}
								alt={product.name}
								className='size-full object-cover'
							/>
						) : (
							<div className='size-full flex items-center justify-center'>
								<Package className='size-8 text-neutral-200' />
							</div>
						)}
					</div>
					<div className='flex-1'>
						<h3 className='font-semibold text-neutral-300'>
							{product.name}
						</h3>
						{product.brand && (
							<p className='text-sm text-neutral-200'>
								{product.brand}
							</p>
						)}
						<p className='text-sm text-neutral-200 mt-1'>
							{product.category.name} • {product.unitType}
						</p>
					</div>
					<div className='flex items-center space-x-2'>
						{product.nutriscore && (
							<NutriScoreBadge score={product.nutriscore} />
						)}
						{product.ecoScore && (
							<EcoScoreBadge score={product.ecoScore} />
						)}
					</div>
				</div>
			</Card>

			{/* Formulaire d'ajout rapide */}
			<div className='space-y-4'>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					{/* Quantité */}
					<div className='space-y-2'>
						<Label htmlFor='quantity'>
							Quantité <span className='text-error-100'>*</span>
						</Label>
						<div className='relative'>
							<Input
								id='quantity'
								type='number'
								step='0.01'
								min='0.01'
								value={quantity}
								onChange={(e) =>
									handleFieldChange(
										'quantity',
										e.target.value,
										setQuantity
									)
								}
								className={
									errors.quantity ? 'border-error-50' : ''
								}
								disabled={isSubmitting}
							/>
							<span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-200'>
								{product.unitType}
							</span>
						</div>
						{errors.quantity && (
							<p className='text-xs text-error-50'>
								{errors.quantity}
							</p>
						)}
					</div>

					{/* Lieu de stockage */}
					<div className='space-y-2'>
						<Label htmlFor='storageLocation'>
							<MapPin className='inline size-3 mr-1' />
							Lieu de stockage
						</Label>
						<Select
							value={storageLocation}
							onValueChange={setStorageLocation}
							disabled={isSubmitting}>
							<SelectTrigger id='storageLocation'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STORAGE_LOCATIONS.map((location) => (
									<SelectItem
										key={location.value}
										value={location.value}>
										{location.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Date d'achat */}
					<div className='space-y-2'>
						<Label htmlFor='purchaseDate'>
							<Calendar className='inline size-3 mr-1' />
							Date d'achat{' '}
							<span className='text-error-100'>*</span>
						</Label>
						<Input
							id='purchaseDate'
							type='date'
							value={purchaseDate}
							onChange={(e) =>
								handleFieldChange(
									'purchaseDate',
									e.target.value,
									setPurchaseDate
								)
							}
							className={
								errors.purchaseDate ? 'border-error-50' : ''
							}
							disabled={isSubmitting}
						/>
						{errors.purchaseDate && (
							<p className='text-xs text-error-50'>
								{errors.purchaseDate}
							</p>
						)}
					</div>

					{/* Date de péremption */}
					<div className='space-y-2'>
						<Label htmlFor='expiryDate'>
							<Calendar className='inline size-3 mr-1' />
							Date de péremption
						</Label>
						<Input
							id='expiryDate'
							type='date'
							value={expiryDate}
							onChange={(e) =>
								handleFieldChange(
									'expiryDate',
									e.target.value,
									setExpiryDate
								)
							}
							className={
								errors.expiryDate ? 'border-error-50' : ''
							}
							disabled={isSubmitting}
						/>
						{errors.expiryDate && (
							<p className='text-xs text-error-50'>
								{errors.expiryDate}
							</p>
						)}
						<p className='text-xs text-neutral-200'>
							Date suggérée selon la catégorie du produit
						</p>
					</div>

					{/* Prix d'achat avec indication budget */}
					<div className='space-y-2'>
						<Label
							htmlFor='purchasePrice'
							className='flex items-center gap-2'>
							<Euro className='size-3' />
							Prix d'achat (€)
							<span className='text-xs text-neutral-200 font-normal'>
								(pour le budget)
							</span>
						</Label>
						<Input
							id='purchasePrice'
							type='number'
							step='0.01'
							min='0'
							placeholder='0.00'
							value={purchasePrice}
							onChange={(e) =>
								handleFieldChange(
									'purchasePrice',
									e.target.value,
									setPurchasePrice
								)
							}
							className={
								errors.purchasePrice ? 'border-error-50' : ''
							}
							disabled={isSubmitting}
						/>
						{errors.purchasePrice && (
							<p className='text-xs text-error-50'>
								{errors.purchasePrice}
							</p>
						)}
						<p className='text-xs text-neutral-200'>
							Optionnel - nécessaire pour le suivi budgétaire
						</p>
					</div>
				</div>

				{/* Notes */}
				<div className='space-y-2'>
					<Label htmlFor='notes'>Notes</Label>
					<Textarea
						id='notes'
						rows={3}
						placeholder='Informations complémentaires...'
						value={notes}
						onChange={(e) => setNotes(e.target.value)}
						disabled={isSubmitting}
					/>
				</div>

				{/* Boutons d'action */}
				<div className='flex justify-center space-x-3 pt-4'>
					<Button
						type='button'
						variant='outline'
						className='text-error-100 border-error-100 hover:bg-error-100'
						onClick={onCancel}
						disabled={isSubmitting}>
						Annuler
					</Button>
					<Button
						type='button'
						onClick={handleSubmit}
						disabled={isSubmitting}
						className='bg-success-50 hover:bg-success-50/90'>
						{isSubmitting ? (
							<>
								<Loader2 className='size-4 mr-2 animate-spin' />
								Ajout en cours...
							</>
						) : (
							<>
								<Save className='size-4 mr-2' />
								Ajouter à l'inventaire
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ExistingProductQuickAddForm;
