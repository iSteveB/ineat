'use client';

import { Link } from '@tanstack/react-router';
import { ChevronLeft, AlertTriangle, Leaf, Save, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// Liste des allergènes communs
const allergens = [
	{ id: 'gluten', label: 'Gluten' },
	{ id: 'lactose', label: 'Lactose' },
	{ id: 'eggs', label: 'Œufs' },
	{ id: 'nuts', label: 'Fruits à coque' },
	{ id: 'peanuts', label: 'Arachides' },
	{ id: 'soy', label: 'Soja' },
	{ id: 'fish', label: 'Poisson' },
	{ id: 'shellfish', label: 'Crustacés' },
	{ id: 'molluscs', label: 'Mollusques' },
	{ id: 'celery', label: 'Céleri' },
	{ id: 'mustard', label: 'Moutarde' },
	{ id: 'sesame', label: 'Sésame' },
	{ id: 'sulphites', label: 'Sulfites' },
	{ id: 'lupin', label: 'Lupin' },
];

// Liste des régimes alimentaires courants
const diets = [
	{ id: 'vegetarian', label: 'Végétarien' },
	{ id: 'vegan', label: 'Vegan' },
	{ id: 'pescatarian', label: 'Pescétarien' },
	{ id: 'no-pork', label: 'Sans porc' },
	{ id: 'dairy-free', label: 'Sans produit laitier' },
	{ id: 'gluten-free', label: 'Sans gluten' },
];

const DietaryRestrictionsPage = () => {
	// État pour les allergènes et régimes sélectionnés
	const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
	const [selectedDiets, setSelectedDiets] = useState<string[]>([]);
	const [isSaving, setIsSaving] = useState(false);

	// Gestionnaires d'événements
	const toggleSelection = (
		id: string,
		setter: React.Dispatch<React.SetStateAction<string[]>>
	) => {
		setter((prev) =>
			prev.includes(id)
				? prev.filter((item) => item !== id)
				: [...prev, id]
		);
	};

	// Fonction de sauvegarde
	const savePreferences = () => {
		setIsSaving(true);
		console.log('Allergènes:', selectedAllergens);
		console.log('Régimes:', selectedDiets);
		// Simuler un appel API
		setTimeout(() => {
			// Ici, on appelle notre API pour sauvegarder les préférences
			// apiClient.updateDietaryPreferences({ allergens: selectedAllergens, diets: selectedDiets });
			setIsSaving(false);
			// Afficher un toast de succès
		}, 1000);
	};

	return (
		<div className='min-h-screen bg-gradient-to-br from-neutral-50 to-info-50/30'>
			{/* ===== HEADER ===== */}
			<div className='relative overflow-hidden bg-neutral-50 border-b border-gray-200 shadow-sm'>
				<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-info-100/30 to-primary-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

				<div className='relative px-6 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						<Link to='/app/settings'>
							<Button
								variant='ghost'
								size='sm'
								className='size-10 p-0 rounded-xl bg-neutral-100 hover:bg-neutral-100 border border-gray-200 shadow-sm'>
								<ChevronLeft className='size-5' />
							</Button>
						</Link>
						<div>
							<h1 className='text-2xl font-bold text-neutral-300'>
								Restrictions alimentaires
							</h1>
							<p className='text-sm text-neutral-200'>
								Gérez vos préférences alimentaires
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className='px-6 py-6 space-y-6'>
				{/* ===== Section Allergies et intolérances ===== */}
				<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-neutral-50 to-neutral-100/50 shadow-xl'>
					<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-error-50/20 to-error-100/20 rounded-full blur-3xl -translate-y-16 translate-x-16' />
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<AlertTriangle className='size-5 text-error-100' />
							Allergies et intolérances
						</CardTitle>
						<CardDescription>
							Sélectionnez les aliments auxquels vous êtes
							allergique ou intolérant.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
							{allergens.map((allergen) => (
								<Label
									key={allergen.id}
									htmlFor={`allergen-${allergen.id}`}
									className={cn(
										'flex items-center justify-center rounded-xl border-2 border-gray-200 bg-neutral-100 p-4 cursor-pointer transition-all duration-200 text-center',
										selectedAllergens.includes(allergen.id)
											? 'border-success-50 bg-success-50/20 shadow-md text-success-50 font-semibold'
											: 'text-neutral-200 hover:bg-neutral-50'
									)}>
									<Input
										type='checkbox'
										id={`allergen-${allergen.id}`}
										className='sr-only'
										checked={selectedAllergens.includes(
											allergen.id
										)}
										onChange={() =>
											toggleSelection(
												allergen.id,
												setSelectedAllergens
											)
										}
									/>
									{allergen.label}
								</Label>
							))}
						</div>
					</CardContent>
				</Card>

				{/* ===== Section Régimes alimentaires ===== */}
				<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-neutral-50 to-neutral-100/50 shadow-xl'>
					<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success-50/20 to-success-50/20 rounded-full blur-3xl -translate-y-16 translate-x-16' />
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Leaf className='size-5 text-success-50' />
							Régimes alimentaires
						</CardTitle>
						<CardDescription>
							Sélectionnez les régimes alimentaires que vous
							suivez.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3'>
							{diets.map((diet) => (
								<Label
									key={diet.id}
									htmlFor={`diet-${diet.id}`}
									className={cn(
										'flex items-center justify-center rounded-xl border-2 border-gray-200 bg-neutral-100 p-4 cursor-pointer transition-all duration-200 text-center',
										selectedDiets.includes(diet.id)
											? 'border-success-50 bg-success-50/20 shadow-md text-success-50 font-semibold'
											: 'text-neutral-200 hover:bg-neutral-50'
									)}>
									<Input
										type='checkbox'
										id={`diet-${diet.id}`}
										className='sr-only'
										checked={selectedDiets.includes(
											diet.id
										)}
										onChange={() =>
											toggleSelection(
												diet.id,
												setSelectedDiets
											)
										}
									/>
									{diet.label}
								</Label>
							))}
						</div>
					</CardContent>
				</Card>

				{/* ===== Bouton de sauvegarde ===== */}
				<div className='flex justify-center pt-4 pb-8'>
					<Button
						onClick={savePreferences}
						className='w-full max-w-md h-12 bg-gradient-to-r from-success-50 to-success-50 hover:from-success-50/90 hover:to-success-50/90 text-neutral-50 shadow-lg hover:shadow-xl transition-all duration-300'
						disabled={isSaving}>
						{isSaving ? (
							<>
								<Loader2 className='size-4 mr-2 animate-spin' />
								Enregistrement...
							</>
						) : (
							<>
								<Save className='size-4 mr-2' />
								Enregistrer les modifications
							</>
						)}
					</Button>
				</div>
			</div>
		</div>
	);
};

export default DietaryRestrictionsPage;
