import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Euro, Loader2, PackagePlus, Star, Leaf, Zap } from 'lucide-react';
import type { Category, AddInventoryItemData, UnitType } from '@/schemas';
import type { OpenFoodFactsMapping } from '@/schemas/openfoodfact-mapping';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

interface AddManualProductFormProps {
	categories: Category[];
	onSubmit: (data: AddInventoryItemData) => Promise<void>;
	onCancel: () => void;
	isSubmitting: boolean;
	// NOUVEAU - Données enrichies d'OpenFoodFacts (optionnel)
	enrichedProduct?: OpenFoodFactsMapping | null;
	// Champs par défaut (pour compatibilité avec l'existant)
	defaultProductName?: string;
	defaultBrand?: string;
	defaultBarcode?: string;
}

/**
 * Données du formulaire
 */
interface FormData {
	name: string;
	brand: string;
	barcode: string;
	category: string;
	quantity: string;
	unitType: UnitType;
	purchaseDate: string;
	expiryDate: string;
	purchasePrice: string;
	storageLocation: string;
	notes: string;
}

const UNIT_TYPE_OPTIONS = [
	{ value: 'UNIT', label: 'Unité(s)' },
	{ value: 'KG', label: 'Kilogramme(s)' },
	{ value: 'G', label: 'Gramme(s)' },
	{ value: 'L', label: 'Litre(s)' },
	{ value: 'ML', label: 'Millilitre(s)' },
] as const;

const STORAGE_LOCATION_OPTIONS = [
	'Réfrigérateur',
	'Congélateur',
	'Placard',
	'Cave',
	'Garde-manger',
	'Fruitier',
	'Autre',
];

export const AddManualProductForm: React.FC<AddManualProductFormProps> = ({
	categories,
	onSubmit,
	onCancel,
	isSubmitting,
	enrichedProduct,
	defaultProductName = '',
	defaultBrand = '',
	defaultBarcode = '',
}) => {
	const [formData, setFormData] = useState<FormData>({
		name: defaultProductName || '',
		brand: defaultBrand || '',
		barcode: defaultBarcode || '',
		category: '',
		quantity: '1',
		unitType: 'UNIT',
		purchaseDate: format(new Date(), 'yyyy-MM-dd'),
		expiryDate: '',
		purchasePrice: '',
		storageLocation: '',
		notes: '',
	});

	const [errors, setErrors] = useState<
		Partial<Record<keyof FormData, string>>
	>({});

	// NOUVEAU - Pré-remplissage avec les données enrichies d'OpenFoodFacts
	useEffect(() => {
		if (enrichedProduct) {
			console.log(
				'Pré-remplissage avec données enrichies:',
				enrichedProduct
			);

			// Extraire le nom principal depuis les métadonnées (pas encore implementé dans le mapping)
			// Pour l'instant on utilise les valeurs par défaut
			const productName = defaultProductName || '';
			const productBrand = defaultBrand || '';

			// Construire des notes automatiques basées sur les données enrichies
			const autoNotes: string[] = [];

			if (enrichedProduct.nutriscore) {
				autoNotes.push(`Nutri-Score: ${enrichedProduct.nutriscore}`);
			}

			if (enrichedProduct.ecoScore) {
				autoNotes.push(`Eco-Score: ${enrichedProduct.ecoScore}`);
			}

			if (enrichedProduct.novaScore) {
				const novaLabels = {
					GROUP_1: 'Aliments non transformés',
					GROUP_2: 'Ingrédients culinaires transformés',
					GROUP_3: 'Aliments transformés',
					GROUP_4: 'Aliments ultra-transformés',
				};
				autoNotes.push(
					`Nova: ${novaLabels[enrichedProduct.novaScore]}`
				);
			}

			if (enrichedProduct.nutrients) {
				autoNotes.push(`Données nutritionnelles disponibles`);
			}

			// Mise à jour du formulaire avec les données enrichies
			setFormData((prev) => ({
				...prev,
				name: productName || prev.name,
				brand: productBrand || prev.brand,
				barcode: defaultBarcode || prev.barcode,
				notes:
					autoNotes.length > 0 ? autoNotes.join(' • ') : prev.notes,
			}));
		}
	}, [enrichedProduct, defaultProductName, defaultBrand, defaultBarcode]);

	// Mettre à jour les valeurs par défaut quand les props changent (comportement existant)
	useEffect(() => {
		setFormData((prev) => {
			const shouldUpdate =
				defaultProductName !== undefined ||
				defaultBrand !== undefined ||
				defaultBarcode !== undefined;

			if (!shouldUpdate) return prev;

			return {
				...prev,
				name: defaultProductName || prev.name,
				brand: defaultBrand || prev.brand,
				barcode: defaultBarcode || prev.barcode,
			};
		});
	}, [defaultProductName, defaultBrand, defaultBarcode]);

	// Fonction de validation
	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof FormData, string>> = {};

		if (!formData.name.trim()) {
			newErrors.name = 'Le nom du produit est requis';
		}

		if (!formData.category) {
			newErrors.category = 'La catégorie est requise';
		}

		if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
			newErrors.quantity = 'La quantité doit être supérieure à 0';
		}

		if (!formData.purchaseDate) {
			newErrors.purchaseDate = "La date d'achat est requise";
		}

		if (
			formData.barcode.trim() &&
			!/^\d{8,13}$/.test(formData.barcode.trim())
		) {
			newErrors.barcode =
				'Le code-barres doit contenir entre 8 et 13 chiffres';
		}

		if (formData.purchasePrice && parseFloat(formData.purchasePrice) < 0) {
			newErrors.purchasePrice = 'Le prix ne peut pas être négatif';
		}

		if (formData.expiryDate && formData.purchaseDate) {
			const purchaseDate = new Date(formData.purchaseDate);
			const expiryDate = new Date(formData.expiryDate);

			if (expiryDate <= purchaseDate) {
				newErrors.expiryDate =
					"La date de péremption doit être postérieure à la date d'achat";
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Gestionnaire de changement des champs
	const handleInputChange = (field: keyof FormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	// Gestionnaire de soumission
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!validateForm()) {
			toast.error('Veuillez corriger les erreurs du formulaire');
			return;
		}

		const selectedCategory = categories.find(
			(cat) => cat.slug === formData.category
		);
		if (!selectedCategory) {
			toast.error("La catégorie sélectionnée n'est pas valide");
			return;
		}

		const optionalFields: Array<{
			key: keyof FormData;
			condition: (value: string | undefined) => boolean;
			transform?: (value: string) => string | number;
		}> = [
			{
				key: 'brand',
				condition: (value) => Boolean(value?.trim()),
				transform: (value) => value.trim(),
			},
			{
				key: 'barcode',
				condition: (value) => Boolean(value?.trim()),
				transform: (value) => value.trim(),
			},
			{
				key: 'expiryDate',
				condition: (value) => Boolean(value),
			},
			{
				key: 'purchasePrice',
				condition: (value) => Boolean(value && parseFloat(value) > 0),
				transform: (value) => parseFloat(value),
			},
			{
				key: 'storageLocation',
				condition: (value) => Boolean(value?.trim()),
				transform: (value) => value.trim(),
			},
			{
				key: 'notes',
				condition: (value) => Boolean(value?.trim()),
				transform: (value) => value.trim(),
			},
		];

		const submitData = optionalFields.reduce(
			(acc, field) => {
				const value = formData[field.key];

				if (field.condition(value)) {
					const finalValue = field.transform
						? field.transform(value as string)
						: value;
					return { ...acc, [field.key]: finalValue };
				}

				return acc;
			},
			{
				name: formData.name.trim(),
				category: formData.category,
				quantity: parseFloat(formData.quantity),
				unitType: formData.unitType,
				purchaseDate: formData.purchaseDate,
			} as AddInventoryItemData
		);

		try {
			await onSubmit(submitData);
		} catch (error: unknown) {
			console.error('Erreur lors de la soumission:', error);
		}
	};

	// Déterminer si on affiche les données enrichies
	const hasEnrichedData =
		enrichedProduct &&
		(enrichedProduct.nutriscore ||
			enrichedProduct.ecoScore ||
			enrichedProduct.novaScore ||
			enrichedProduct.nutrients ||
			enrichedProduct.ingredients);

	const hasPrefilledData =
		defaultProductName || defaultBrand || defaultBarcode;

	return (
		<Card className='relative overflow-hidden border-0 bg-neutral-50 shadow-xl'>
			<CardHeader>
				<CardTitle className='flex items-center gap-3'>
					<div className='p-2 rounded-xl bg-success-50/20 border border-success-50/50'>
						<PackagePlus className='size-5 text-success-50' />
					</div>
					Ajouter un produit manuellement
				</CardTitle>
			</CardHeader>
			<CardContent className='p-6 space-y-6'>
				{/* NOUVEAU - Alerte pour les données enrichies OpenFoodFacts */}
				{hasEnrichedData && (
					<Alert className='border-blue-500/20 bg-blue-50/10'>
						<Star className='size-4 text-blue-500' />
						<AlertDescription className='flex flex-col text-neutral-300'>
							<strong>Données OpenFoodFacts détectées :</strong>
							<div className='flex flex-wrap gap-2 mt-2'>
								{enrichedProduct?.nutriscore && (
									<Badge
										variant='outline'
										className='bg-green-50 text-green-700 border-green-200'>
										<Zap className='size-3 mr-1' />
										Nutri-Score:{' '}
										{enrichedProduct.nutriscore}
									</Badge>
								)}
								{enrichedProduct?.ecoScore && (
									<Badge
										variant='outline'
										className='bg-emerald-50 text-emerald-700 border-emerald-200'>
										<Leaf className='size-3 mr-1' />
										Eco-Score: {enrichedProduct.ecoScore}
									</Badge>
								)}
								{enrichedProduct?.nutrients && (
									<Badge
										variant='outline'
										className='bg-orange-50 text-orange-700 border-orange-200'>
										Nutrition disponible
									</Badge>
								)}
								{enrichedProduct?.ingredients && (
									<Badge
										variant='outline'
										className='bg-purple-50 text-purple-700 border-purple-200'>
										Ingrédients disponibles
									</Badge>
								)}
							</div>
							<span className='text-xs text-neutral-200 mt-2'>
								Qualité des données :{' '}
								{Math.round(
									(enrichedProduct?.quality.completeness ||
										0) * 100
								)}
								%
							</span>
						</AlertDescription>
					</Alert>
				)}

				{/* Alerte pour les données pré-remplies (comportement existant) */}
				{hasPrefilledData && !hasEnrichedData && (
					<Alert className='border-success-500/20 bg-success-50/10'>
						<AlertDescription className='flex flex-col text-neutral-300'>
							<strong>Données récupérées du scan :</strong>
							{defaultProductName && (
								<span> Nom: {defaultProductName}</span>
							)}
							{defaultBrand && (
								<span> Marque: {defaultBrand}</span>
							)}
							{defaultBarcode && (
								<span> Code-barre: {defaultBarcode}</span>
							)}
						</AlertDescription>
					</Alert>
				)}

				<form onSubmit={handleSubmit} className='space-y-6'>
					{/* Informations de base */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-300'>
							Informations de base
						</h3>

						{/* Nom du produit */}
						<div className='space-y-2'>
							<Label htmlFor='name' className='text-neutral-300'>
								Nom du produit{' '}
								<span className='text-error-100'>*</span>
							</Label>
							<Input
								id='name'
								value={formData.name}
								onChange={(e) =>
									handleInputChange('name', e.target.value)
								}
								placeholder='Ex: Pommes Golden'
								className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
									errors.name ? 'border-error-100' : ''
								} ${
									defaultProductName || hasEnrichedData
										? 'bg-success-50/5 border-success-500/20'
										: ''
								}`}
								disabled={isSubmitting}
							/>
							{errors.name && (
								<p className='text-sm text-error-100'>
									{errors.name}
								</p>
							)}
						</div>

						{/* Marque */}
						<div className='space-y-2'>
							<Label htmlFor='brand' className='text-neutral-300'>
								Marque
							</Label>
							<Input
								id='brand'
								value={formData.brand}
								onChange={(e) =>
									handleInputChange('brand', e.target.value)
								}
								placeholder='Ex: Carrefour Bio'
								className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
									defaultBrand || hasEnrichedData
										? 'bg-success-50/5 border-success-500/20'
										: ''
								}`}
								disabled={isSubmitting}
							/>
						</div>

						{/* Code-barres */}
						<div className='space-y-2'>
							<Label
								htmlFor='barcode'
								className='text-neutral-300'>
								Code-barres
							</Label>
							<Input
								id='barcode'
								value={formData.barcode}
								onChange={(e) =>
									handleInputChange('barcode', e.target.value)
								}
								placeholder='Ex: 3560070057047'
								className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
									errors.barcode ? 'border-error-100' : ''
								} ${
									defaultBarcode || hasEnrichedData
										? 'bg-success-50/5 border-success-500/20'
										: ''
								}`}
								disabled={isSubmitting}
							/>
							{errors.barcode && (
								<p className='text-sm text-error-100'>
									{errors.barcode}
								</p>
							)}
							<p className='text-xs text-neutral-200'>
								Entre 8 et 13 chiffres uniquement
							</p>
						</div>

						{/* Catégorie */}
						<div className='space-y-2'>
							<Label
								htmlFor='category'
								className='text-neutral-300'>
								Catégorie{' '}
								<span className='text-error-100'>*</span>
							</Label>
							<Select
								value={formData.category}
								onValueChange={(value) => {
									handleInputChange('category', value);
								}}
								disabled={isSubmitting}>
								<SelectTrigger
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										errors.category
											? 'border-error-100'
											: ''
									}`}>
									<SelectValue placeholder='Sélectionnez une catégorie' />
								</SelectTrigger>
								<SelectContent className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm'>
									{categories.length === 0 ? (
										<SelectItem value='loading' disabled>
											Chargement...
										</SelectItem>
									) : (
										categories.map((category) => {
											return (
												<SelectItem
													key={category.id}
													value={category.slug}
													className='text-neutral-300 hover:bg-neutral-100'>
													{category.name}
												</SelectItem>
											);
										})
									)}
								</SelectContent>
							</Select>
							{errors.category && (
								<p className='text-sm text-error-100'>
									{errors.category}
								</p>
							)}
						</div>
					</div>

					<Separator className='bg-neutral-200/20' />

					{/* Quantité et unité */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-300'>
							Quantité et unité
						</h3>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							{/* Quantité */}
							<div className='space-y-2'>
								<Label
									htmlFor='quantity'
									className='text-neutral-300'>
									Quantité{' '}
									<span className='text-error-100'>*</span>
								</Label>
								<Input
									id='quantity'
									type='number'
									step='0.01'
									min='0'
									value={formData.quantity}
									onChange={(e) =>
										handleInputChange(
											'quantity',
											e.target.value
										)
									}
									placeholder='Ex: 1.5'
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										errors.quantity
											? 'border-error-100'
											: ''
									}`}
									disabled={isSubmitting}
								/>
								{errors.quantity && (
									<p className='text-sm text-error-100'>
										{errors.quantity}
									</p>
								)}
							</div>

							{/* Type d'unité */}
							<div className='space-y-2'>
								<Label
									htmlFor='unitType'
									className='text-neutral-300'>
									Unité{' '}
									<span className='text-error-100'>*</span>
								</Label>
								<Select
									value={formData.unitType}
									onValueChange={(value) =>
										handleInputChange('unitType', value)
									}
									disabled={isSubmitting}>
									<SelectTrigger className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm'>
										{UNIT_TYPE_OPTIONS.map((option) => (
											<SelectItem
												key={option.value}
												value={option.value}
												className='text-neutral-300 hover:bg-neutral-100'>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					<Separator className='bg-neutral-200/20' />

					{/* Dates */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-300'>
							Dates
						</h3>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							{/* Date d'achat */}
							<div className='space-y-2'>
								<Label
									htmlFor='purchaseDate'
									className='text-neutral-300'>
									Date d'achat{' '}
									<span className='text-error-100'>*</span>
								</Label>
								<Input
									id='purchaseDate'
									type='date'
									value={formData.purchaseDate}
									onChange={(e) =>
										handleInputChange(
											'purchaseDate',
											e.target.value
										)
									}
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										errors.purchaseDate
											? 'border-error-100'
											: ''
									}`}
									disabled={isSubmitting}
								/>
								{errors.purchaseDate && (
									<p className='text-sm text-error-100'>
										{errors.purchaseDate}
									</p>
								)}
							</div>

							{/* Date de péremption */}
							<div className='space-y-2'>
								<Label
									htmlFor='expiryDate'
									className='text-neutral-300'>
									Date de péremption
								</Label>
								<Input
									id='expiryDate'
									type='date'
									value={formData.expiryDate}
									onChange={(e) =>
										handleInputChange(
											'expiryDate',
											e.target.value
										)
									}
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										errors.expiryDate
											? 'border-error-100'
											: ''
									}`}
									disabled={isSubmitting}
								/>
								{errors.expiryDate && (
									<p className='text-sm text-error-100'>
										{errors.expiryDate}
									</p>
								)}
							</div>
						</div>
					</div>

					<Separator className='bg-neutral-200/20' />

					{/* Informations supplémentaires */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-300'>
							Informations supplémentaires
						</h3>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							{/* Prix d'achat avec indication budget */}
							<div className='space-y-2'>
								<Label
									htmlFor='purchasePrice'
									className='flex items-center gap-2 text-neutral-300'>
									<Euro className='size-3 text-neutral-300' />
									Prix d'achat (€)
									<span className='text-xs text-neutral-200 font-normal'>
										(déduit du budget)
									</span>
								</Label>
								<Input
									id='purchasePrice'
									type='number'
									step='0.01'
									min='0'
									value={formData.purchasePrice}
									onChange={(e) =>
										handleInputChange(
											'purchasePrice',
											e.target.value
										)
									}
									placeholder='Ex: 2.50'
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										errors.purchasePrice
											? 'border-error-100'
											: ''
									}`}
									disabled={isSubmitting}
								/>
								{errors.purchasePrice && (
									<p className='text-sm text-error-100'>
										{errors.purchasePrice}
									</p>
								)}
							</div>

							{/* Lieu de stockage */}
							<div className='space-y-2'>
								<Label
									htmlFor='storageLocation'
									className='text-neutral-300'>
									Lieu de stockage
								</Label>
								<Select
									value={formData.storageLocation}
									onValueChange={(value) =>
										handleInputChange(
											'storageLocation',
											value
										)
									}
									disabled={isSubmitting}>
									<SelectTrigger className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300'>
										<SelectValue placeholder='Sélectionnez un lieu' />
									</SelectTrigger>
									<SelectContent className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm'>
										{STORAGE_LOCATION_OPTIONS.map(
											(location) => (
												<SelectItem
													key={location}
													value={location}
													className='text-neutral-300 hover:bg-neutral-100'>
													{location}
												</SelectItem>
											)
										)}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Notes - Avec contenu enrichi automatique */}
						<div className='space-y-2'>
							<Label htmlFor='notes' className='text-neutral-300'>
								Note
								{hasEnrichedData && (
									<span className='text-xs text-blue-500 ml-2'>
										(pré-remplie avec les données
										OpenFoodFacts)
									</span>
								)}
							</Label>
							<Textarea
								id='notes'
								value={formData.notes}
								onChange={(e) =>
									handleInputChange('notes', e.target.value)
								}
								placeholder='Ajoutez une note sur ce produit...'
								rows={3}
								className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
									hasEnrichedData
										? 'bg-blue-50/5 border-blue-500/20'
										: ''
								}`}
								disabled={isSubmitting}
							/>
						</div>
					</div>

					{/* Boutons d'action */}
					<div className='flex gap-3 pt-4'>
						<Button
							type='button'
							variant='outline'
							onClick={onCancel}
							disabled={isSubmitting}
							className='flex-1 border-neutral-200 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-300'>
							Annuler
						</Button>
						<Button
							type='submit'
							disabled={isSubmitting}
							className='flex-1 bg-success-50 hover:bg-success-50/90 text-neutral-50'>
							{isSubmitting ? (
								<>
									<Loader2 className='size-4 mr-2 animate-spin' />
									Ajout en cours...
								</>
							) : (
								'Ajouter le produit'
							)}
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	);
};
