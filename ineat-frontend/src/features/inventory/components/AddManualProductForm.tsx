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
import { AddInventoryItemSchema } from '@/schemas';
import type { OpenFoodFactsMapping } from '@/schemas/openfoodfact-mapping';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';

interface AddManualProductFormProps {
	categories: Category[];
	onSubmit: (data: AddInventoryItemData) => Promise<void>;
	onCancel: () => void;
	isSubmitting: boolean;
	enrichedProduct?: OpenFoodFactsMapping | null;
	defaultProductName?: string;
	defaultBrand?: string;
	defaultBarcode?: string;
}

// Type de formulaire basé sur le schéma Zod mais avec des chaînes pour l'interface
type FormData = {
	// Champs obligatoires
	name: string;
	category: string;
	quantity: string;
	unitType: UnitType;
	purchaseDate: string;

	// Champs optionnels existants
	brand: string;
	barcode: string;
	expiryDate: string;
	purchasePrice: string;
	storageLocation: string;
	notes: string;

	// Scores
	nutriscore: string;
	ecoScore: string;
	novaScore: string;

	// Nutriments (en string pour les inputs)
	energy: string;
	proteins: string;
	carbohydrates: string;
	fats: string;
	sugars: string;
	fiber: string;
	salt: string;
	saturatedFats: string;

	// Contenu
	ingredients: string;
	imageUrl: string;
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
		// Champs existants
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

		// initialisés vides
		nutriscore: '',
		ecoScore: '',
		novaScore: '',
		energy: '',
		proteins: '',
		carbohydrates: '',
		fats: '',
		sugars: '',
		fiber: '',
		salt: '',
		saturatedFats: '',
		ingredients: '',
		imageUrl: '',
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	// Fonction de transformation des données du formulaire vers le schéma Zod
	const transformFormDataToSchema = (
		formData: FormData
	): Partial<AddInventoryItemData> => {
		// Construire l'objet nutrients seulement s'il y a des valeurs
		const nutrients: Record<string, number> = {};
		if (formData.energy && !isNaN(Number(formData.energy)))
			nutrients.energy = Number(formData.energy);
		if (formData.proteins && !isNaN(Number(formData.proteins)))
			nutrients.proteins = Number(formData.proteins);
		if (formData.carbohydrates && !isNaN(Number(formData.carbohydrates)))
			nutrients.carbohydrates = Number(formData.carbohydrates);
		if (formData.fats && !isNaN(Number(formData.fats)))
			nutrients.fats = Number(formData.fats);
		if (formData.sugars && !isNaN(Number(formData.sugars)))
			nutrients.sugars = Number(formData.sugars);
		if (formData.fiber && !isNaN(Number(formData.fiber)))
			nutrients.fiber = Number(formData.fiber);
		if (formData.salt && !isNaN(Number(formData.salt)))
			nutrients.salt = Number(formData.salt);
		if (formData.saturatedFats && !isNaN(Number(formData.saturatedFats)))
			nutrients.saturatedFats = Number(formData.saturatedFats);

		return {
			// Champs obligatoires
			name: formData.name.trim(),
			category: formData.category,
			quantity: Number(formData.quantity),
			unitType: formData.unitType,
			purchaseDate: formData.purchaseDate,

			// Champs optionnels avec transformation
			...(formData.brand.trim() && { brand: formData.brand.trim() }),
			...(formData.barcode.trim() && {
				barcode: formData.barcode.trim(),
			}),
			...(formData.expiryDate && { expiryDate: formData.expiryDate }),
			...(formData.purchasePrice &&
				!isNaN(Number(formData.purchasePrice)) && {
					purchasePrice: Number(formData.purchasePrice),
				}),
			...(formData.storageLocation.trim() && {
				storageLocation: formData.storageLocation.trim(),
			}),
			...(formData.notes.trim() && { notes: formData.notes.trim() }),

			// Scores
			...(formData.nutriscore &&
				['A', 'B', 'C', 'D', 'E'].includes(formData.nutriscore) && {
					nutriscore: formData.nutriscore as
						| 'A'
						| 'B'
						| 'C'
						| 'D'
						| 'E',
				}),
			...(formData.ecoScore &&
				['A', 'B', 'C', 'D', 'E'].includes(formData.ecoScore) && {
					ecoScore: formData.ecoScore as 'A' | 'B' | 'C' | 'D' | 'E',
				}),
			...(formData.novaScore &&
				['1', '2', '3', '4'].includes(formData.novaScore) && {
					novaScore: `GROUP_${formData.novaScore}` as
						| 'GROUP_1'
						| 'GROUP_2'
						| 'GROUP_3'
						| 'GROUP_4',
				}),

			// Nutrition et contenu
			...(Object.keys(nutrients).length > 0 && { nutrients }),
			...(formData.imageUrl.trim() && {
				imageUrl: formData.imageUrl.trim(),
			}),
			...(formData.ingredients.trim() && {
				ingredients: formData.ingredients.trim(),
			}),
		};
	};

	// Validation avec Zod
	const validateWithZod = (data: Partial<AddInventoryItemData>) => {
		try {
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

	// Pré-remplissage avec les données enrichies d'OpenFoodFacts
	useEffect(() => {
		if (enrichedProduct) {
			console.log(
				'Pré-remplissage avec données enrichies:',
				enrichedProduct
			);

			const productName =
				enrichedProduct.name || defaultProductName || '';
			const productBrand = enrichedProduct.brand || defaultBrand || '';

			// Construire des notes automatiques
			const autoNotes: string[] = [];
			if (enrichedProduct.nutriscore)
				autoNotes.push(`Nutri-Score: ${enrichedProduct.nutriscore}`);
			if (enrichedProduct.ecoScore)
				autoNotes.push(`Eco-Score: ${enrichedProduct.ecoScore}`);
			if (enrichedProduct.novaScore) {
				const novaLabels = {
					GROUP_1: 'Non transformés',
					GROUP_2: 'Ingrédients transformés',
					GROUP_3: 'Transformés',
					GROUP_4: 'Ultra-transformés',
				};
				autoNotes.push(
					`Nova: ${
						novaLabels[
							enrichedProduct.novaScore as keyof typeof novaLabels
						] || enrichedProduct.novaScore
					}`
				);
			}
			if (enrichedProduct.nutrients)
				autoNotes.push('Données nutritionnelles disponibles');

			setFormData((prev) => ({
				...prev,
				name: productName || prev.name,
				brand: productBrand || prev.brand,
				barcode:
					enrichedProduct.barcode || defaultBarcode || prev.barcode,
				notes:
					autoNotes.length > 0 ? autoNotes.join(' • ') : prev.notes,

				// Pré-remplir les nouveaux champs
				nutriscore: enrichedProduct.nutriscore || '',
				ecoScore: enrichedProduct.ecoScore || '',
				novaScore:
					enrichedProduct.novaScore?.replace('GROUP_', '') || '',
				energy: enrichedProduct.nutrients?.energy?.toString() || '',
				proteins: enrichedProduct.nutrients?.proteins?.toString() || '',
				carbohydrates:
					enrichedProduct.nutrients?.carbohydrates?.toString() || '',
				fats: enrichedProduct.nutrients?.fats?.toString() || '',
				sugars: enrichedProduct.nutrients?.sugars?.toString() || '',
				fiber: enrichedProduct.nutrients?.fiber?.toString() || '',
				salt: enrichedProduct.nutrients?.salt?.toString() || '',
				saturatedFats:
					enrichedProduct.nutrients?.saturatedFats?.toString() || '',
				ingredients: enrichedProduct.ingredients || '',
				imageUrl: enrichedProduct.imageUrl || '',
			}));
		}
	}, [enrichedProduct, defaultProductName, defaultBrand, defaultBarcode]);

	// Mise à jour des valeurs par défaut
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

	// Validation du formulaire avec Zod
	const validateForm = (): boolean => {
		const transformedData = transformFormDataToSchema(formData);
		return validateWithZod(transformedData);
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

	// Soumission du formulaire avec validation Zod
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		// Transformer et valider avec Zod
		const transformedData = transformFormDataToSchema(formData);

		if (!validateForm()) {
			toast.error('Veuillez corriger les erreurs du formulaire');
			return;
		}

		// Vérification supplémentaire de la catégorie
		const selectedCategory = categories.find(
			(cat) => cat.slug === formData.category
		);
		if (!selectedCategory) {
			toast.error("La catégorie sélectionnée n'est pas valide");
			return;
		}

		console.log('Données validées avec Zod:', transformedData);

		try {
			await onSubmit(transformedData as AddInventoryItemData);
		} catch (error: unknown) {
			console.error('Erreur lors de la soumission:', error);
		}
	};

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
				{/* Alerte données enrichies */}
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
								Qualité:{' '}
								{Math.round(
									(enrichedProduct?.quality.completeness ||
										0) * 100
								)}
								% • Données pré-remplies et en lecture seule
							</span>
						</AlertDescription>
					</Alert>
				)}

				{/* Alerte données pré-remplies */}
				{hasPrefilledData && !hasEnrichedData && (
					<Alert className='border-success-500/20 bg-success-50/10'>
						<AlertDescription className='flex flex-col text-neutral-300'>
							<strong>Données récupérées du scan :</strong>
							{defaultProductName && (
								<span>Nom: {defaultProductName}</span>
							)}
							{defaultBrand && (
								<span>Marque: {defaultBrand}</span>
							)}
							{defaultBarcode && (
								<span>Code-barre: {defaultBarcode}</span>
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
									errors['name'] ? 'border-error-100' : ''
								} ${
									defaultProductName || hasEnrichedData
										? 'bg-success-50/5 border-success-500/20'
										: ''
								}`}
								disabled={isSubmitting}
							/>
							{errors['name'] && (
								<p className='text-sm text-error-100'>
									{errors['name']}
								</p>
							)}
						</div>

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
									errors['barcode'] ? 'border-error-100' : ''
								} ${
									defaultBarcode || hasEnrichedData
										? 'bg-success-50/5 border-success-500/20'
										: ''
								}`}
								disabled={isSubmitting}
							/>
							{errors['barcode'] && (
								<p className='text-sm text-error-100'>
									{errors['barcode']}
								</p>
							)}
							<p className='text-xs text-neutral-200'>
								Entre 8 et 13 chiffres uniquement
							</p>
						</div>

						<div className='space-y-2'>
							<Label
								htmlFor='category'
								className='text-neutral-300'>
								Catégorie{' '}
								<span className='text-error-100'>*</span>
							</Label>
							<Select
								value={formData.category}
								onValueChange={(value) =>
									handleInputChange('category', value)
								}
								disabled={isSubmitting}>
								<SelectTrigger
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 ${
										errors['category']
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
										categories.map((category) => (
											<SelectItem
												key={category.id}
												value={category.slug}
												className='text-neutral-300 hover:bg-neutral-100'>
												{category.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
							{errors['category'] && (
								<p className='text-sm text-error-100'>
									{errors['category']}
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
										errors['quantity']
											? 'border-error-100'
											: ''
									}`}
									disabled={isSubmitting}
								/>
								{errors['quantity'] && (
									<p className='text-sm text-error-100'>
										{errors['quantity']}
									</p>
								)}
							</div>

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

					{/* Scores */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-300'>
							Scores nutritionnels et environnementaux
							{hasEnrichedData && (
								<span className='text-xs text-blue-500 ml-2 font-normal'>
									(données OpenFoodFacts)
								</span>
							)}
						</h3>
						<div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
							{/* Nutri-Score */}
							<div className='space-y-2'>
								<Label
									htmlFor='nutriscore'
									className='text-neutral-300'>
									<Zap className='inline size-3 mr-1' />
									Nutri-Score
								</Label>
								<Select
									value={formData.nutriscore}
									onValueChange={(value) => {
										if (!hasEnrichedData)
											handleInputChange(
												'nutriscore',
												value
											);
									}}
									disabled={
										isSubmitting || !!hasEnrichedData
									}>
									<SelectTrigger
										className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 ${
											hasEnrichedData
												? 'bg-blue-50/5 border-blue-500/20'
												: ''
										}`}>
										<SelectValue placeholder='Sélectionnez un score' />
									</SelectTrigger>
									<SelectContent className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm'>
										<SelectItem
											value='A'
											className='text-neutral-300 hover:bg-neutral-100'>
											A - Très bonne qualité
										</SelectItem>
										<SelectItem
											value='B'
											className='text-neutral-300 hover:bg-neutral-100'>
											B - Bonne qualité
										</SelectItem>
										<SelectItem
											value='C'
											className='text-neutral-300 hover:bg-neutral-100'>
											C - Qualité moyenne
										</SelectItem>
										<SelectItem
											value='D'
											className='text-neutral-300 hover:bg-neutral-100'>
											D - Mauvaise qualité
										</SelectItem>
										<SelectItem
											value='E'
											className='text-neutral-300 hover:bg-neutral-100'>
											E - Très mauvaise qualité
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Eco-Score */}
							<div className='space-y-2'>
								<Label
									htmlFor='ecoscore'
									className='text-neutral-300'>
									<Leaf className='inline size-3 mr-1' />
									Eco-Score
								</Label>
								<Select
									value={formData.ecoScore}
									onValueChange={(value) => {
										if (!hasEnrichedData)
											handleInputChange(
												'ecoScore',
												value
											);
									}}
									disabled={
										isSubmitting || !!hasEnrichedData
									}>
									<SelectTrigger
										className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 ${
											hasEnrichedData
												? 'bg-blue-50/5 border-blue-500/20'
												: ''
										}`}>
										<SelectValue placeholder='Sélectionnez un score' />
									</SelectTrigger>
									<SelectContent className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm'>
										<SelectItem
											value='A'
											className='text-neutral-300 hover:bg-neutral-100'>
											A - Très faible impact
										</SelectItem>
										<SelectItem
											value='B'
											className='text-neutral-300 hover:bg-neutral-100'>
											B - Faible impact
										</SelectItem>
										<SelectItem
											value='C'
											className='text-neutral-300 hover:bg-neutral-100'>
											C - Impact modéré
										</SelectItem>
										<SelectItem
											value='D'
											className='text-neutral-300 hover:bg-neutral-100'>
											D - Impact élevé
										</SelectItem>
										<SelectItem
											value='E'
											className='text-neutral-300 hover:bg-neutral-100'>
											E - Impact très élevé
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							{/* Nova-Score */}
							<div className='space-y-2'>
								<Label
									htmlFor='novascore'
									className='text-neutral-300'>
									Nova Score
								</Label>
								<Select
									value={formData.novaScore}
									onValueChange={(value) => {
										if (!hasEnrichedData)
											handleInputChange(
												'novaScore',
												value
											);
									}}
									disabled={
										isSubmitting || !!hasEnrichedData
									}>
									<SelectTrigger
										className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 ${
											hasEnrichedData
												? 'bg-blue-50/5 border-blue-500/20'
												: ''
										}`}>
										<SelectValue placeholder='Niveau de transformation' />
									</SelectTrigger>
									<SelectContent className='bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm'>
										<SelectItem
											value='1'
											className='text-neutral-300 hover:bg-neutral-100'>
											1 - Non transformés
										</SelectItem>
										<SelectItem
											value='2'
											className='text-neutral-300 hover:bg-neutral-100'>
											2 - Ingrédients transformés
										</SelectItem>
										<SelectItem
											value='3'
											className='text-neutral-300 hover:bg-neutral-100'>
											3 - Transformés
										</SelectItem>
										<SelectItem
											value='4'
											className='text-neutral-300 hover:bg-neutral-100'>
											4 - Ultra-transformés
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>
					</div>

					<Separator className='bg-neutral-200/20' />

					{/* Informations nutritionnelles */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-300'>
							Informations nutritionnelles (pour 100g)
							{hasEnrichedData && (
								<span className='text-xs text-blue-500 ml-2 font-normal'>
									(données OpenFoodFacts)
								</span>
							)}
						</h3>

						{/* Macronutriments principaux */}
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
							<div className='space-y-2'>
								<Label
									htmlFor='energy'
									className='text-neutral-300'>
									Énergie (kcal)
								</Label>
								<Input
									id='energy'
									type='number'
									step='1'
									min='0'
									value={formData.energy}
									onChange={(e) => {
										if (!hasEnrichedData)
											handleInputChange(
												'energy',
												e.target.value
											);
									}}
									placeholder='Ex: 245'
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										hasEnrichedData
											? 'bg-blue-50/5 border-blue-500/20'
											: ''
									}`}
									disabled={isSubmitting || !!hasEnrichedData}
								/>
							</div>

							<div className='space-y-2'>
								<Label
									htmlFor='proteins'
									className='text-neutral-300'>
									Protéines (g)
								</Label>
								<Input
									id='proteins'
									type='number'
									step='0.1'
									min='0'
									value={formData.proteins}
									onChange={(e) => {
										if (!hasEnrichedData)
											handleInputChange(
												'proteins',
												e.target.value
											);
									}}
									placeholder='Ex: 12.5'
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										hasEnrichedData
											? 'bg-blue-50/5 border-blue-500/20'
											: ''
									}`}
									disabled={isSubmitting || !!hasEnrichedData}
								/>
							</div>

							<div className='space-y-2'>
								<Label
									htmlFor='carbohydrates'
									className='text-neutral-300'>
									Glucides (g)
								</Label>
								<Input
									id='carbohydrates'
									type='number'
									step='0.1'
									min='0'
									value={formData.carbohydrates}
									onChange={(e) => {
										if (!hasEnrichedData)
											handleInputChange(
												'carbohydrates',
												e.target.value
											);
									}}
									placeholder='Ex: 58.7'
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										hasEnrichedData
											? 'bg-blue-50/5 border-blue-500/20'
											: ''
									}`}
									disabled={isSubmitting || !!hasEnrichedData}
								/>
							</div>

							<div className='space-y-2'>
								<Label
									htmlFor='fats'
									className='text-neutral-300'>
									Lipides (g)
								</Label>
								<Input
									id='fats'
									type='number'
									step='0.1'
									min='0'
									value={formData.fats}
									onChange={(e) => {
										if (!hasEnrichedData)
											handleInputChange(
												'fats',
												e.target.value
											);
									}}
									placeholder='Ex: 3.2'
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										hasEnrichedData
											? 'bg-blue-50/5 border-blue-500/20'
											: ''
									}`}
									disabled={isSubmitting || !!hasEnrichedData}
								/>
							</div>
						</div>

						{/* Nutriments secondaires */}
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
							<div className='space-y-2'>
								<Label
									htmlFor='sugars'
									className='text-neutral-300'>
									dont Sucres (g)
								</Label>
								<Input
									id='sugars'
									type='number'
									step='0.1'
									min='0'
									value={formData.sugars}
									onChange={(e) => {
										if (!hasEnrichedData)
											handleInputChange(
												'sugars',
												e.target.value
											);
									}}
									placeholder='Ex: 2.1'
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										hasEnrichedData
											? 'bg-blue-50/5 border-blue-500/20'
											: ''
									}`}
									disabled={isSubmitting || !!hasEnrichedData}
								/>
							</div>

							<div className='space-y-2'>
								<Label
									htmlFor='fiber'
									className='text-neutral-300'>
									Fibres (g)
								</Label>
								<Input
									id='fiber'
									type='number'
									step='0.1'
									min='0'
									value={formData.fiber}
									onChange={(e) => {
										if (!hasEnrichedData)
											handleInputChange(
												'fiber',
												e.target.value
											);
									}}
									placeholder='Ex: 1.8'
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										hasEnrichedData
											? 'bg-blue-50/5 border-blue-500/20'
											: ''
									}`}
									disabled={isSubmitting || !!hasEnrichedData}
								/>
							</div>

							<div className='space-y-2'>
								<Label
									htmlFor='salt'
									className='text-neutral-300'>
									Sel (g)
								</Label>
								<Input
									id='salt'
									type='number'
									step='0.01'
									min='0'
									value={formData.salt}
									onChange={(e) => {
										if (!hasEnrichedData)
											handleInputChange(
												'salt',
												e.target.value
											);
									}}
									placeholder='Ex: 0.89'
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										hasEnrichedData
											? 'bg-blue-50/5 border-blue-500/20'
											: ''
									}`}
									disabled={isSubmitting || !!hasEnrichedData}
								/>
							</div>

							<div className='space-y-2'>
								<Label
									htmlFor='saturatedFats'
									className='text-neutral-300'>
									Graisses sat. (g)
								</Label>
								<Input
									id='saturatedFats'
									type='number'
									step='0.1'
									min='0'
									value={formData.saturatedFats}
									onChange={(e) => {
										if (!hasEnrichedData)
											handleInputChange(
												'saturatedFats',
												e.target.value
											);
									}}
									placeholder='Ex: 0.7'
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
										hasEnrichedData
											? 'bg-blue-50/5 border-blue-500/20'
											: ''
									}`}
									disabled={isSubmitting || !!hasEnrichedData}
								/>
							</div>
						</div>
					</div>

					<Separator className='bg-neutral-200/20' />

					{/* Ingrédients et image */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-300'>
							Contenu et média
							{hasEnrichedData && (
								<span className='text-xs text-blue-500 ml-2 font-normal'>
									(données OpenFoodFacts)
								</span>
							)}
						</h3>

						<div className='space-y-2'>
							<Label
								htmlFor='ingredients'
								className='text-neutral-300'>
								Liste des ingrédients
							</Label>
							<Textarea
								id='ingredients'
								value={formData.ingredients}
								onChange={(e) => {
									if (!hasEnrichedData)
										handleInputChange(
											'ingredients',
											e.target.value
										);
								}}
								placeholder='Ex: Farine de blé, eau, levure, sel...'
								rows={4}
								className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
									hasEnrichedData
										? 'bg-blue-50/5 border-blue-500/20'
										: ''
								}`}
								disabled={isSubmitting || !!hasEnrichedData}
							/>
							<p className='text-xs text-neutral-200'>
								Listez les ingrédients par ordre décroissant de
								quantité
							</p>
						</div>

						<div className='space-y-2'>
							<Label
								htmlFor='imageUrl'
								className='text-neutral-300'>
								Image du produit (URL)
							</Label>
							<Input
								id='imageUrl'
								type='url'
								value={formData.imageUrl}
								onChange={(e) => {
									if (!hasEnrichedData)
										handleInputChange(
											'imageUrl',
											e.target.value
										);
								}}
								placeholder='Ex: https://example.com/image.jpg'
								className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 placeholder:text-neutral-200 ${
									errors['imageUrl'] ? 'border-error-100' : ''
								} ${
									hasEnrichedData
										? 'bg-blue-50/5 border-blue-500/20'
										: ''
								}`}
								disabled={isSubmitting || !!hasEnrichedData}
							/>
							{errors['imageUrl'] && (
								<p className='text-sm text-error-100'>
									{errors['imageUrl']}
								</p>
							)}
							<p className='text-xs text-neutral-200'>
								URL de l'image du produit (JPG, PNG, WebP)
							</p>
						</div>
					</div>

					<Separator className='bg-neutral-200/20' />

					{/* Dates */}
					<div className='space-y-4'>
						<h3 className='text-md font-medium text-neutral-300'>
							Dates
						</h3>
						<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
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
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 ${
										errors['purchaseDate']
											? 'border-error-100'
											: ''
									}`}
									disabled={isSubmitting}
								/>
								{errors['purchaseDate'] && (
									<p className='text-sm text-error-100'>
										{errors['purchaseDate']}
									</p>
								)}
							</div>

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
									className={`bg-neutral-50 border border-neutral-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none text-neutral-300 ${
										errors['expiryDate']
											? 'border-error-100'
											: ''
									}`}
									disabled={isSubmitting}
								/>
								{errors['expiryDate'] && (
									<p className='text-sm text-error-100'>
										{errors['expiryDate']}
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
										errors['purchasePrice']
											? 'border-error-100'
											: ''
									}`}
									disabled={isSubmitting}
								/>
								{errors['purchasePrice'] && (
									<p className='text-sm text-error-100'>
										{errors['purchasePrice']}
									</p>
								)}
							</div>

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

						<div className='space-y-2'>
							<Label htmlFor='notes' className='text-neutral-300'>
								Notes
								{hasEnrichedData && (
									<span className='text-xs text-blue-500 ml-2'>
										(pré-remplies avec OpenFoodFacts)
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
