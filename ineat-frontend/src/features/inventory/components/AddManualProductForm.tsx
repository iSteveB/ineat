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
import { Category, AddInventoryItemData, UnitType } from '@/schemas';

// Props du composant
interface AddManualProductFormProps {
	categories: Category[];
	onSubmit: (data: AddInventoryItemData) => Promise<void>;
	onCancel: () => void;
	isSubmitting: boolean;
	defaultProductName?: string;
}

interface FormData {
	productName: string;
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

// Options pour les types d'unités
const UNIT_TYPE_OPTIONS = [
	{ value: 'UNIT', label: 'Unité(s)' },
	{ value: 'KG', label: 'Kilogramme(s)' },
	{ value: 'G', label: 'Gramme(s)' },
	{ value: 'L', label: 'Litre(s)' },
	{ value: 'ML', label: 'Millilitre(s)' },
] as const;

// Options pour les lieux de stockage
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
}) => {
	// État du formulaire
	const [formData, setFormData] = useState<FormData>({
		productName: defaultProductName,
		brand: '',
		barcode: '',
		category: '',
		quantity: '',
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

	// Mettre à jour le nom du produit si defaultProductName change
	useEffect(() => {
		if (defaultProductName && !formData.productName) {
			setFormData((prev) => ({
				...prev,
				productName: defaultProductName,
			}));
		}
	}, [defaultProductName, formData.productName]);

	// Fonction de validation
	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof FormData, string>> = {};

		// Validation des champs requis
		if (!formData.productName.trim()) {
			newErrors.productName = 'Le nom du produit est requis';
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

		// Validation optionnelle du code-barres (doit être numérique et entre 8-13 chiffres)
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
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!validateForm()) {
			toast.error('Veuillez corriger les erreurs du formulaire');
			return;
		}

		// Préparer les données pour l'API
		const submitData: AddInventoryItemData = {
			productName: formData.productName.trim(),
			category: formData.category,
			quantity: parseFloat(formData.quantity),
			unitType: formData.unitType,
			purchaseDate: formData.purchaseDate,
		};

		// Ajouter les champs optionnels s'ils sont remplis
		if (formData.brand.trim()) {
			submitData.brand = formData.brand.trim();
		}

		if (formData.barcode.trim()) {
			submitData.barcode = formData.barcode.trim();
		}

		if (formData.expiryDate) {
			submitData.expiryDate = formData.expiryDate;
		}

		if (formData.purchasePrice && parseFloat(formData.purchasePrice) > 0) {
			submitData.purchasePrice = parseFloat(formData.purchasePrice);
		}

		if (formData.storageLocation.trim()) {
			submitData.storageLocation = formData.storageLocation.trim();
		}

		if (formData.notes.trim()) {
			submitData.notes = formData.notes.trim();
		}

		try {
			await onSubmit(submitData);
		} catch (error) {
			// L'erreur est gérée par le composant parent
			console.error('Erreur lors de la soumission:', error);
		}
	};

	return (
		<form onSubmit={handleSubmit} className='space-y-6'>
			{/* Informations de base */}
			<div className='space-y-4'>
				<h3 className='text-md font-medium text-neutral-300'>
					Informations de base
				</h3>

				{/* Nom du produit */}
				<div className='space-y-2'>
					<Label htmlFor='productName'>
						Nom du produit <span className='text-error-100'>*</span>
					</Label>
					<Input
						id='productName'
						value={formData.productName}
						onChange={(e) =>
							handleInputChange('productName', e.target.value)
						}
						placeholder='Ex: Pommes Golden'
						className={errors.productName ? 'border-error-100' : ''}
					/>
					{errors.productName && (
						<p className='text-sm text-error-100'>
							{errors.productName}
						</p>
					)}
				</div>

				{/* Marque */}
				<div className='space-y-2'>
					<Label htmlFor='brand'>Marque</Label>
					<Input
						id='brand'
						value={formData.brand}
						onChange={(e) =>
							handleInputChange('brand', e.target.value)
						}
						placeholder='Ex: Carrefour Bio'
					/>
				</div>

				{/* Code-barres */}
				<div className='space-y-2'>
					<Label htmlFor='barcode'>Code-barres</Label>
					<Input
						id='barcode'
						value={formData.barcode}
						onChange={(e) =>
							handleInputChange('barcode', e.target.value)
						}
						placeholder='Ex: 3560070057047'
						className={errors.barcode ? 'border-error-100' : ''}
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
					<Label htmlFor='category'>
						Catégorie <span className='text-error-100'>*</span>
					</Label>
					<Select
						value={formData.category}
						onValueChange={(value) =>
							handleInputChange('category', value)
						}>
						<SelectTrigger
							className={
								errors.category ? 'border-error-100' : ''
							}>
							<SelectValue placeholder='Sélectionnez une catégorie' />
						</SelectTrigger>
						<SelectContent>
							{categories.length === 0 ? (
								<SelectItem value='loading' disabled>
									Chargement...
								</SelectItem>
							) : (
								categories.map((category) => (
									<SelectItem
										key={category.id}
										value={category.id}>
										{category.name}
									</SelectItem>
								))
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

			<Separator />

			{/* Quantité et unité */}
			<div className='space-y-4'>
				<h3 className='text-md font-medium text-neutral-300'>
					Quantité et unité
				</h3>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					{/* Quantité */}
					<div className='space-y-2'>
						<Label htmlFor='quantity'>
							Quantité <span className='text-error-100'>*</span>
						</Label>
						<Input
							id='quantity'
							type='number'
							step='0.01'
							min='0'
							value={formData.quantity}
							onChange={(e) =>
								handleInputChange('quantity', e.target.value)
							}
							placeholder='Ex: 1.5'
							className={
								errors.quantity ? 'border-error-100' : ''
							}
						/>
						{errors.quantity && (
							<p className='text-sm text-error-100'>
								{errors.quantity}
							</p>
						)}
					</div>

					{/* Type d'unité */}
					<div className='space-y-2'>
						<Label htmlFor='unitType'>
							Unité <span className='text-error-100'>*</span>
						</Label>
						<Select
							value={formData.unitType}
							onValueChange={(value) =>
								handleInputChange('unitType', value)
							}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{UNIT_TYPE_OPTIONS.map((option) => (
									<SelectItem
										key={option.value}
										value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<Separator />

			{/* Dates */}
			<div className='space-y-4'>
				<h3 className='text-md font-medium text-neutral-300'>Dates</h3>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					{/* Date d'achat */}
					<div className='space-y-2'>
						<Label htmlFor='purchaseDate'>
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
							className={
								errors.purchaseDate ? 'border-error-100' : ''
							}
						/>
						{errors.purchaseDate && (
							<p className='text-sm text-error-100'>
								{errors.purchaseDate}
							</p>
						)}
					</div>

					{/* Date de péremption */}
					<div className='space-y-2'>
						<Label htmlFor='expiryDate'>Date de péremption</Label>
						<Input
							id='expiryDate'
							type='date'
							value={formData.expiryDate}
							onChange={(e) =>
								handleInputChange('expiryDate', e.target.value)
							}
							className={
								errors.expiryDate ? 'border-error-100' : ''
							}
						/>
						{errors.expiryDate && (
							<p className='text-sm text-error-100'>
								{errors.expiryDate}
							</p>
						)}
					</div>
				</div>
			</div>

			<Separator />

			{/* Informations supplémentaires */}
			<div className='space-y-4'>
				<h3 className='text-md font-medium text-neutral-300'>
					Informations supplémentaires
				</h3>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					{/* Prix d'achat */}
					<div className='space-y-2'>
						<Label htmlFor='purchasePrice'>Prix d'achat (€)</Label>
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
							className={
								errors.purchasePrice ? 'border-error-100' : ''
							}
						/>
						{errors.purchasePrice && (
							<p className='text-sm text-error-100'>
								{errors.purchasePrice}
							</p>
						)}
					</div>

					{/* Lieu de stockage */}
					<div className='space-y-2'>
						<Label htmlFor='storageLocation'>
							Lieu de stockage
						</Label>
						<Select
							value={formData.storageLocation}
							onValueChange={(value) =>
								handleInputChange('storageLocation', value)
							}>
							<SelectTrigger>
								<SelectValue placeholder='Sélectionnez un lieu' />
							</SelectTrigger>
							<SelectContent>
								{STORAGE_LOCATION_OPTIONS.map((location) => (
									<SelectItem key={location} value={location}>
										{location}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Notes */}
				<div className='space-y-2'>
					<Label htmlFor='notes'>Notes</Label>
					<Textarea
						id='notes'
						value={formData.notes}
						onChange={(e) =>
							handleInputChange('notes', e.target.value)
						}
						placeholder='Ajoutez des notes sur ce produit...'
						rows={3}
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
					className='flex-1'>
					Annuler
				</Button>
				<Button
					type='submit'
					disabled={isSubmitting}
					className='flex-1'>
					{isSubmitting ? 'Ajout en cours...' : 'Ajouter le produit'}
				</Button>
			</div>
		</form>
	);
};
