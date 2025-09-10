import React, { useState, useEffect, useCallback } from 'react';
import {
	ArrowLeft,
	Package,
	Save,
	Calendar,
	MapPin,
	Euro,
	Loader2,
	Tag,
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
import { useCategories } from '@/hooks/useCategories';
import { ProductSearchResult } from '@/services/inventoryService';
import ScoreBadge from '@/components/common/ScoreBadge';

// NOUVEAU: Type spécifique pour le QuickAddForm avec category
export interface QuickAddFormDataWithCategory {
	quantity: number;
	category: string; // Obligatoire pour créer un nouveau produit
	expiryDate?: string;
	purchaseDate: string;
	purchasePrice?: number;
	storageLocation?: string;
	notes?: string;
}

interface QuickAddFormProps {
	product: ProductSearchResult;
	onSubmit: (data: QuickAddFormDataWithCategory) => Promise<void>;
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

export const QuickAddForm: React.FC<QuickAddFormProps> = ({
	product,
	onSubmit,
	onCancel,
	isSubmitting = false,
}) => {
	// Hook pour récupérer les catégories
	const { data: categories = [], isLoading: categoriesLoading } =
		useCategories();

	// États du formulaire
	const [quantity, setQuantity] = useState('1');
	const [category, setCategory] = useState(''); // État pour la catégorie
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

		// Logique simplifiée - à adapter selon vos catégories
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

	// ✅ Fonction mémorisée avec useCallback
	const findBestCategoryMatch = useCallback(
		(productCategory: string): string => {
			if (!categories.length) return '';

			// Chercher une correspondance exacte par nom
			const exactMatch = categories.find(
				(cat) =>
					cat.name.toLowerCase() === productCategory.toLowerCase()
			);
			if (exactMatch) return exactMatch.slug;

			// Chercher une correspondance partielle
			const partialMatch = categories.find(
				(cat) =>
					cat.name
						.toLowerCase()
						.includes(productCategory.toLowerCase()) ||
					productCategory
						.toLowerCase()
						.includes(cat.name.toLowerCase())
			);
			if (partialMatch) return partialMatch.slug;

			// Par défaut, retourner la première catégorie ou chaîne vide
			return categories[0]?.slug || '';
		},
		[categories]
	); // ✅ Dépendance correcte

	useEffect(() => {
		// Pré-sélectionner une catégorie basée sur celle du produit
		if (categories.length > 0 && product.category?.name) {
			const bestMatch = findBestCategoryMatch(product.category.name);
			setCategory(bestMatch);
		}
	}, [categories, product.category?.name, findBestCategoryMatch]); // ✅ Dépendance ajoutée

	useEffect(() => {
		// Suggérer une date de péremption basée sur la catégorie sélectionnée
		if (category) {
			setExpiryDate(getSuggestedExpiryDate(category));
		}
	}, [category]);

	// Validation du formulaire
	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		const quantityNum = parseFloat(quantity);
		if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
			newErrors.quantity = 'La quantité doit être supérieure à 0';
		}

		if (!category) {
			newErrors.category = 'La catégorie est obligatoire';
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
	const handleSubmit = async (): Promise<void> => {
		if (!validate()) return;

		const data: QuickAddFormDataWithCategory = {
			quantity: parseFloat(quantity),
			category, // Inclure la catégorie
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
	): void => {
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
			{/* En-tête avec bouton retour */}
			<div className='flex items-center space-x-4'>
				<Button
					type='button'
					variant='ghost'
					size='sm'
					onClick={onCancel}
					disabled={isSubmitting}
					className='hover:bg-neutral-100'>
					<ArrowLeft className='size-4 mr-1' />
					Retour à la recherche
				</Button>
			</div>

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
							<ScoreBadge type='nutri' score={product.nutriscore} />
						)}
						{product.ecoScore && (
							<ScoreBadge type='eco' score={product.ecoScore} />
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

					{/* Catégorie */}
					<div className='space-y-2'>
						<Label htmlFor='category'>
							<Tag className='inline size-3 mr-1' />
							Catégorie <span className='text-error-100'>*</span>
						</Label>
						<Select
							value={category}
							onValueChange={(value) =>
								handleFieldChange(
									'category',
									value,
									setCategory
								)
							}
							disabled={isSubmitting || categoriesLoading}>
							<SelectTrigger
								id='category'
								className={
									errors.category ? 'border-error-50' : ''
								}>
								<SelectValue placeholder='Sélectionnez une catégorie' />
							</SelectTrigger>
							<SelectContent>
								{categoriesLoading ? (
									<SelectItem value='loading' disabled>
										Chargement des catégories...
									</SelectItem>
								) : categories.length === 0 ? (
									<SelectItem value='empty' disabled>
										Aucune catégorie disponible
									</SelectItem>
								) : (
									categories.map((cat) => (
										<SelectItem
											key={cat.id}
											value={cat.slug}>
											{cat.name}
										</SelectItem>
									))
								)}
							</SelectContent>
						</Select>
						{errors.category && (
							<p className='text-xs text-error-50'>
								{errors.category}
							</p>
						)}
						<p className='text-xs text-neutral-200'>
							Catégorie suggérée basée sur "
							{product.category.name}"
						</p>
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
							Date suggérée selon la catégorie sélectionnée
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
				<div className='flex justify-end space-x-3 pt-4'>
					<Button
						type='button'
						variant='outline'
						className='text-error-100 border-error-100'
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

export default QuickAddForm;
