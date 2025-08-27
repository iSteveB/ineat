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
import { Euro, Loader2, PackagePlus } from 'lucide-react';
import type { Category, AddInventoryItemData, UnitType } from '@/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddManualProductFormProps {
	categories: Category[];
	onSubmit: (data: AddInventoryItemData) => Promise<void>;
	onCancel: () => void;
	isSubmitting: boolean;
	defaultProductName?: string;
	defaultBrand?: string; // Marque par défaut
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
	defaultProductName = '',
	defaultBrand = '', 
	defaultBarcode = '',
}) => {
	const [formData, setFormData] = useState<FormData>({
		name: defaultProductName || '',
		brand: defaultBrand || '',
		barcode: defaultBarcode || '',
		category: '',
		quantity: '1', // Quantité par défaut
		unitType: 'UNIT',
		purchaseDate: format(new Date(), 'yyyy-MM-dd'),
		expiryDate: '',
		purchasePrice: '',
		storageLocation: '',
		notes: '',
	});

	// État pour les erreurs de validation
	const [errors, setErrors] = useState<
		Partial<Record<keyof FormData, string>>
	>({});

	// Mettre à jour les valeurs par défaut quand les props changent
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

		// Validation des champs requis
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

		// Validation optionnelle du code-barres
		if (
			formData.barcode.trim() &&
			!/^\d{8,13}$/.test(formData.barcode.trim())
		) {
			newErrors.barcode =
				'Le code-barres doit contenir entre 8 et 13 chiffres';
		}

		// Validation optionnelle du prix
		if (formData.purchasePrice && parseFloat(formData.purchasePrice) < 0) {
			newErrors.purchasePrice = 'Le prix ne peut pas être négatif';
		}

		// Validation des dates
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

		// Effacer l'erreur du champ modifié
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

		// Vérifier que la catégorie sélectionnée existe
		const selectedCategory = categories.find(
			(cat) => cat.slug === formData.category
		);
		if (!selectedCategory) {
			toast.error("La catégorie sélectionnée n'est pas valide");
			return;
		}

		// Configuration des règles pour les champs optionnels
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
				// pas de transform nécessaire pour expiryDate
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

		// Construire submitData avec reduce
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
				// Champs obligatoires de base
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
			// L'erreur est gérée par le composant parent
			console.error('Erreur lors de la soumission:', error);
		}
	};

	// Déterminer si on affiche une alerte pour les données pré-remplies
	const hasPrefilledData = defaultProductName || defaultBrand || defaultBarcode;

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
				{/* Alerte pour les données pré-remplies */}
				{hasPrefilledData && (
					<Alert className='border-success-500/20 bg-success-50/10'>
						<AlertDescription className='flex flex-col text-neutral-300'>
							<strong>Données récupérées du scan :</strong>
							{defaultProductName && <span> Nom: {defaultProductName}</span>}
							{defaultBrand && <span> Marque: {defaultBrand}</span>}
							{defaultBarcode && <span> Code-barre: {defaultBarcode}</span>}
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
									defaultProductName
										? 'bg-success-50/5 border-success-500/20'
										: ''
								}`}
								disabled={isSubmitting || Boolean(defaultProductName)}
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
									defaultBrand
										? 'bg-success-50/5 border-success-500/20'
										: ''
								}`}
								disabled={isSubmitting || Boolean(formData.brand)}
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
									defaultBarcode
										? 'bg-success-50/5 border-success-500/20'
										: ''
								}`}
								disabled={isSubmitting || Boolean(defaultBarcode)}
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

						{/* Notes */}
						<div className='space-y-2'>
							<Label htmlFor='notes' className='text-neutral-300'>
								Note
							</Label>
							<Textarea
								id='notes'
								value={formData.notes}
								onChange={(e) =>
									handleInputChange('notes', e.target.value)
								}
								placeholder='Ajoutez une note sur ce produit...'
								rows={3}
								className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200'
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