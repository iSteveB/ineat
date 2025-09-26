import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Loader2, PackagePlus } from 'lucide-react';
import type { Category, AddInventoryItemData } from '@/schemas';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useProductForm } from '@/hooks/useProductForm';
import { ProductBasicsSection } from './section/ProductBasicSection';
import { ProductQuantitySection } from './section/ProductQuantitySection';
import { ProductScoresSection } from './section/ProductScanSection';
import { NutritionalInfoSection } from './section/NutritionalInfoSection';
import { ProductContentSection } from './section/ProductContentSection';
import { ProductDatesSection } from './section/ProductDatesSection';
import { ProductExtraSection } from './section/ProductExtraSection';

interface AddManualProductFormProps {
	categories: Category[];
	onSubmit: (data: AddInventoryItemData) => Promise<void>;
	onCancel: () => void;
	isSubmitting: boolean;
	defaultProductName?: string;
	defaultBrand?: string;
	defaultBarcode?: string;
}

export const AddManualProductForm: React.FC<AddManualProductFormProps> = ({
	categories,
	onSubmit,
	onCancel,
	isSubmitting,
	defaultProductName = '',
	defaultBrand = '',
	defaultBarcode = '',
}) => {
	// Utilisation du hook personnalisé pour toute la logique du formulaire
	const {
		formData,
		errors,
		hasPrefilledData,
		handleInputChange,
		handleSubmit,
	} = useProductForm({
		categories,
		onSubmit,
		defaultProductName,
		defaultBrand,
		defaultBarcode,
	});

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
				{/* Alerte données pré-remplies */}
				{hasPrefilledData && (
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
					{/* Section Informations de base */}
					<ProductBasicsSection
						values={{
							name: formData.name,
							brand: formData.brand,
							barcode: formData.barcode,
							category: formData.category,
						}}
						onChange={handleInputChange}
						categories={categories}
						disabled={isSubmitting}
						errors={{
							name: errors.name,
							barcode: errors.barcode,
							category: errors.category,
						}}
					/>

					<Separator className='bg-neutral-200/20' />

					{/* Section Quantité et unité */}
					<ProductQuantitySection
						values={{
							quantity: formData.quantity,
							unitType: formData.unitType,
						}}
						onChange={handleInputChange}
						disabled={isSubmitting}
						errors={{
							quantity: errors.quantity,
							unitType: errors.unitType,
						}}
					/>

					<Separator className='bg-neutral-200/20' />

					{/* Section Scores */}
					<ProductScoresSection
						values={{
							nutriscore: formData.nutriscore,
							ecoscore: formData.ecoscore,
							novascore: formData.novascore,
						}}
						onChange={handleInputChange}
						disabled={isSubmitting}
					/>

					<Separator className='bg-neutral-200/20' />

					{/* Section Informations nutritionnelles */}
					<NutritionalInfoSection
						values={{
							energy: formData.energy,
							proteins: formData.proteins,
							carbohydrates: formData.carbohydrates,
							fats: formData.fats,
							sugars: formData.sugars,
							fiber: formData.fiber,
							salt: formData.salt,
							saturatedFats: formData.saturatedFats,
						}}
						onChange={handleInputChange}
						disabled={isSubmitting}
					/>

					<Separator className='bg-neutral-200/20' />

					{/* Section Contenu */}
					<ProductContentSection
						values={{
							ingredients: formData.ingredients,
							imageUrl: formData.imageUrl,
						}}
						onChange={handleInputChange}
						disabled={isSubmitting}
						errors={{
							imageUrl: errors.imageUrl,
						}}
					/>

					<Separator className='bg-neutral-200/20' />

					{/* Section Dates */}
					<ProductDatesSection
						values={{
							purchaseDate: formData.purchaseDate,
							expiryDate: formData.expiryDate,
						}}
						onChange={handleInputChange}
						disabled={isSubmitting}
						errors={{
							purchaseDate: errors.purchaseDate,
							expiryDate: errors.expiryDate,
						}}
					/>

					<Separator className='bg-neutral-200/20' />

					{/* Section Informations supplémentaires */}
					<ProductExtraSection
						values={{
							purchasePrice: formData.purchasePrice,
							storageLocation: formData.storageLocation,
							notes: formData.notes,
						}}
						onChange={handleInputChange}
						disabled={isSubmitting}
						errors={{
							purchasePrice: errors.purchasePrice,
						}}
					/>

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