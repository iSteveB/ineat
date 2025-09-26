import React, { useState } from 'react';
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
import { AddInventoryItemSchema } from '@/schemas';
import type { OpenFoodFactsMapping } from '@/schemas/openfoodfact-mapping';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';

interface AddOFFProductFormProps {
	categories: Category[];
	onSubmit: (data: AddInventoryItemData) => Promise<void>;
	onCancel: () => void;
	isSubmitting: boolean;
	enrichedProduct: OpenFoodFactsMapping; // Obligatoire pour ce composant
}

// Type de formulaire simplifié - seulement les champs modifiables
type FormData = {
	// Champs obligatoires modifiables
	category: string;
	quantity: string;
	unitType: UnitType;
	purchaseDate: string;

	// Champs optionnels modifiables
	expiryDate: string;
	purchasePrice: string;
	storageLocation: string;
	notes: string;
};

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

export const AddOFFProductForm: React.FC<AddOFFProductFormProps> = ({
	categories,
	onSubmit,
	onCancel,
	isSubmitting,
	enrichedProduct,
}) => {
	const [formData, setFormData] = useState<FormData>({
		category: '',
		quantity: '1',
		unitType: 'UNIT',
		purchaseDate: format(new Date(), 'yyyy-MM-dd'),
		expiryDate: '',
		purchasePrice: '',
		storageLocation: '',
		notes: '',
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	// Transformation des données vers le schéma complet
	const transformToInventoryData = (formData: FormData): AddInventoryItemData => {
		// Construire l'objet nutrients depuis enrichedProduct
		const nutrients: Record<string, number> = {};
		if (enrichedProduct.nutrients) {
			const n = enrichedProduct.nutrients;
			if (n.energy) nutrients.energy = n.energy;
			if (n.proteins) nutrients.proteins = n.proteins;
			if (n.carbohydrates) nutrients.carbohydrates = n.carbohydrates;
			if (n.fats) nutrients.fats = n.fats;
			if (n.sugars) nutrients.sugars = n.sugars;
			if (n.fiber) nutrients.fiber = n.fiber;
			if (n.salt) nutrients.salt = n.salt;
			if (n.saturatedFats) nutrients.saturatedFats = n.saturatedFats;
		}

		return {
			// Données fixes depuis OpenFoodFacts
			name: enrichedProduct.name,
			brand: enrichedProduct.brand || undefined,
			barcode: enrichedProduct.barcode || undefined,
			imageUrl: enrichedProduct.imageUrl || undefined,
			ingredients: enrichedProduct.ingredients || undefined,
			nutriscore: enrichedProduct.nutriscore || undefined,
			ecoscore: enrichedProduct.ecoscore || undefined,
			novascore: enrichedProduct.novascore || undefined,
			...(Object.keys(nutrients).length > 0 && { nutrients }),

			// Données saisies par l'utilisateur
			category: formData.category,
			quantity: Number(formData.quantity),
			unitType: formData.unitType,
			purchaseDate: formData.purchaseDate,
			...(formData.expiryDate && { expiryDate: formData.expiryDate }),
			...(formData.purchasePrice && !isNaN(Number(formData.purchasePrice)) && {
				purchasePrice: Number(formData.purchasePrice),
			}),
			...(formData.storageLocation.trim() && {
				storageLocation: formData.storageLocation.trim(),
			}),
			...(formData.notes.trim() && { notes: formData.notes.trim() }),
		};
	};

	// Validation avec Zod
	const validateForm = (): boolean => {
		try {
			const data = transformToInventoryData(formData);
			AddInventoryItemSchema.parse(data);
			setErrors({});
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const zodErrors: Record<string, string> = {};
				error.errors.forEach((err) => {
					const field = err.path.join('.');
					zodErrors[field] = err.message;
				});
				setErrors(zodErrors);
				return false;
			}
			return false;
		}
	};

	// Gestionnaire de changement des champs
	const handleInputChange = (field: keyof FormData, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));

		// Nettoyer l'erreur de ce champ
		if (errors[field]) {
			setErrors((prev) => {
				const newErrors = { ...prev };
				delete newErrors[field];
				return newErrors;
			});
		}
	};

	// Soumission du formulaire
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!validateForm()) {
			toast.error('Veuillez corriger les erreurs du formulaire');
			return;
		}

		// Vérification de la catégorie
		const selectedCategory = categories.find(
			(cat) => cat.slug === formData.category
		);
		if (!selectedCategory) {
			toast.error("La catégorie sélectionnée n'est pas valide");
			return;
		}

		try {
			const data = transformToInventoryData(formData);
			console.log('Données validées pour soumission:', data);
			await onSubmit(data);
		} catch (error: unknown) {
			console.error('Erreur lors de la soumission:', error);
		}
	};

	return (
		<Card className='relative overflow-hidden border-0 bg-neutral-50 shadow-xl'>
			<CardHeader>
				<CardTitle className='flex items-center gap-3'>
					<div className='p-2 rounded-xl bg-blue-50/20 border border-blue-500/50'>
						<PackagePlus className='size-5 text-blue-500' />
					</div>
					Ajouter un produit scanné
				</CardTitle>
			</CardHeader>
			<CardContent className='p-6 space-y-6'>
				{/* Alerte produit OpenFoodFacts */}
				<Alert className='border-blue-500/20 bg-blue-50/10'>
					<Star className='size-4 text-blue-500' />
					<AlertDescription className='flex flex-col text-neutral-700'>
						<strong className='text-neutral-900'>{enrichedProduct.name}</strong>
						{enrichedProduct.brand && (
							<span className='text-sm text-neutral-600 mb-2'>
								{enrichedProduct.brand}
							</span>
						)}
						<div className='flex flex-wrap gap-2 mt-2'>
							{enrichedProduct.nutriscore && (
								<Badge
									variant='outline'
									className='bg-green-50 text-green-700 border-green-200'>
									<Zap className='size-3 mr-1' />
									Nutri-Score: {enrichedProduct.nutriscore}
								</Badge>
							)}
							{enrichedProduct.ecoscore && (
								<Badge
									variant='outline'
									className='bg-emerald-50 text-emerald-700 border-emerald-200'>
									<Leaf className='size-3 mr-1' />
									Eco-Score: {enrichedProduct.ecoscore}
								</Badge>
							)}
							{enrichedProduct.nutrients && (
								<Badge
									variant='outline'
									className='bg-orange-50 text-orange-700 border-orange-200'>
									Nutrition disponible
								</Badge>
							)}
							{enrichedProduct.ingredients && (
								<Badge
									variant='outline'
									className='bg-purple-50 text-purple-700 border-purple-200'>
									Ingrédients disponibles
								</Badge>
							)}
						</div>
						<span className='text-xs text-neutral-500 mt-2'>
							Qualité: {Math.round((enrichedProduct.quality.completeness || 0) * 100)}%
							• Données pré-remplies automatiquement
						</span>
					</AlertDescription>
				</Alert>

				<form onSubmit={handleSubmit} className='space-y-6'>
					{/* Informations produit (lecture seule) */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-700'>
							Informations produit
						</h3>
						
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50/10 rounded-xl border border-blue-200/20'>
							<div className='space-y-2'>
								<Label className='text-sm text-neutral-600'>Nom du produit</Label>
								<div className='p-2 bg-white/60 rounded-md text-sm text-neutral-800 font-medium'>
									{enrichedProduct.name}
								</div>
							</div>
							
							{enrichedProduct.brand && (
								<div className='space-y-2'>
									<Label className='text-sm text-neutral-600'>Marque</Label>
									<div className='p-2 bg-white/60 rounded-md text-sm text-neutral-800'>
										{enrichedProduct.brand}
									</div>
								</div>
							)}
							
							{enrichedProduct.barcode && (
								<div className='space-y-2'>
									<Label className='text-sm text-neutral-600'>Code-barres</Label>
									<div className='p-2 bg-white/60 rounded-md text-sm text-neutral-800 font-mono'>
										{enrichedProduct.barcode}
									</div>
								</div>
							)}
						</div>
					</div>

					<Separator className='bg-neutral-200/20' />

					{/* Catégorie - obligatoire */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-700'>
							Classification
						</h3>
						
						<div className='space-y-2'>
							<Label htmlFor='category' className='text-neutral-700'>
								Catégorie <span className='text-error-500'>*</span>
							</Label>
							<Select
								value={formData.category}
								onValueChange={(value) => handleInputChange('category', value)}
								disabled={isSubmitting}>
								<SelectTrigger
									className={`bg-white border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
										errors['category'] ? 'border-error-500' : ''
									}`}>
									<SelectValue placeholder='Sélectionnez une catégorie' />
								</SelectTrigger>
								<SelectContent className='bg-white border border-neutral-200 rounded-xl shadow-sm'>
									{categories.length === 0 ? (
										<SelectItem value='loading' disabled>
											Chargement...
										</SelectItem>
									) : (
										categories.map((category) => (
											<SelectItem
												key={category.id}
												value={category.slug}
												className='text-neutral-700 hover:bg-neutral-50'>
												{category.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
							{errors['category'] && (
								<p className='text-sm text-error-600'>{errors['category']}</p>
							)}
						</div>
					</div>

					<Separator className='bg-neutral-200/20' />

					{/* Quantité et unité */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-700'>
							Quantité et unité
						</h3>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='quantity' className='text-neutral-700'>
									Quantité <span className='text-error-500'>*</span>
								</Label>
								<Input
									id='quantity'
									type='number'
									step='0.01'
									min='0'
									value={formData.quantity}
									onChange={(e) => handleInputChange('quantity', e.target.value)}
									placeholder='Ex: 1.5'
									className={`bg-white border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
										errors['quantity'] ? 'border-error-500' : ''
									}`}
									disabled={isSubmitting}
								/>
								{errors['quantity'] && (
									<p className='text-sm text-error-600'>{errors['quantity']}</p>
								)}
							</div>

							<div className='space-y-2'>
								<Label htmlFor='unitType' className='text-neutral-700'>
									Unité <span className='text-error-500'>*</span>
								</Label>
								<Select
									value={formData.unitType}
									onValueChange={(value) => handleInputChange('unitType', value)}
                  
									disabled={isSubmitting}>
									<SelectTrigger className='bg-white border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'>
										<SelectValue />
									</SelectTrigger>
									<SelectContent className='bg-white border border-neutral-200 rounded-xl shadow-sm'>
										{UNIT_TYPE_OPTIONS.map((option) => (
											<SelectItem
												key={option.value}
												value={option.value}
												className='text-neutral-700 hover:bg-neutral-50'>
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
						<h3 className='text-md font-medium text-neutral-700'>Dates</h3>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='purchaseDate' className='text-neutral-700'>
									Date d'achat <span className='text-error-500'>*</span>
								</Label>
								<Input
									id='purchaseDate'
									type='date'
									value={formData.purchaseDate}
									onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
									className={`bg-white border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
										errors['purchaseDate'] ? 'border-error-500' : ''
									}`}
									disabled={isSubmitting}
								/>
								{errors['purchaseDate'] && (
									<p className='text-sm text-error-600'>{errors['purchaseDate']}</p>
								)}
							</div>

							<div className='space-y-2'>
								<Label htmlFor='expiryDate' className='text-neutral-700'>
									Date de péremption
								</Label>
								<Input
									id='expiryDate'
									type='date'
									value={formData.expiryDate}
									onChange={(e) => handleInputChange('expiryDate', e.target.value)}
									className={`bg-white border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
										errors['expiryDate'] ? 'border-error-500' : ''
									}`}
									disabled={isSubmitting}
								/>
								{errors['expiryDate'] && (
									<p className='text-sm text-error-600'>{errors['expiryDate']}</p>
								)}
							</div>
						</div>
					</div>

					<Separator className='bg-neutral-200/20' />

					{/* Informations supplémentaires */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-700'>
							Informations supplémentaires
						</h3>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
							<div className='space-y-2'>
								<Label htmlFor='purchasePrice' className='flex items-center gap-2 text-neutral-700'>
									<Euro className='size-3 text-neutral-600' />
									Prix d'achat (€)
									<span className='text-xs text-neutral-500 font-normal'>
										(déduit du budget)
									</span>
								</Label>
								<Input
									id='purchasePrice'
									type='number'
									step='0.01'
									min='0'
									value={formData.purchasePrice}
									onChange={(e) => handleInputChange('purchasePrice', e.target.value)}
									placeholder='Ex: 2.50'
									className={`bg-white border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
										errors['purchasePrice'] ? 'border-error-500' : ''
									}`}
									disabled={isSubmitting}
								/>
								{errors['purchasePrice'] && (
									<p className='text-sm text-error-600'>{errors['purchasePrice']}</p>
								)}
							</div>

							<div className='space-y-2'>
								<Label htmlFor='storageLocation' className='text-neutral-700'>
									Lieu de stockage
								</Label>
								<Select
									value={formData.storageLocation}
									onValueChange={(value) => handleInputChange('storageLocation', value)}
									disabled={isSubmitting}>
									<SelectTrigger className='bg-white border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'>
										<SelectValue placeholder='Sélectionnez un lieu' />
									</SelectTrigger>
									<SelectContent className='bg-white border border-neutral-200 rounded-xl shadow-sm'>
										{STORAGE_LOCATION_OPTIONS.map((location) => (
											<SelectItem
												key={location}
												value={location}
												className='text-neutral-700 hover:bg-neutral-50'>
												{location}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='notes' className='text-neutral-700'>Notes</Label>
							<Textarea
								id='notes'
								value={formData.notes}
								onChange={(e) => handleInputChange('notes', e.target.value)}
								placeholder='Ajoutez une note sur ce produit...'
								rows={3}
								className='bg-white border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none'
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
							className='flex-1 border-neutral-300 text-neutral-700 hover:bg-neutral-50'>
							Annuler
						</Button>
						<Button
							type='submit'
							disabled={isSubmitting}
							className='flex-1 bg-blue-600 hover:bg-blue-700 text-white'>
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