import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/profile/diet-restrictions/')({
	component: DietaryRestrictionsPage,
});

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

function DietaryRestrictionsPage() {
	// État pour les allergènes et régimes sélectionnés
	const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
	const [selectedDiets, setSelectedDiets] = useState<string[]>([]);

	// Gestionnaires d'événements
	const toggleAllergen = (id: string) => {
		setSelectedAllergens((prev) =>
			prev.includes(id)
				? prev.filter((item) => item !== id)
				: [...prev, id]
		);
	};

	const toggleDiet = (id: string) => {
		setSelectedDiets((prev) =>
			prev.includes(id)
				? prev.filter((item) => item !== id)
				: [...prev, id]
		);
	};

	// Fonction de sauvegarde
	const savePreferences = () => {
		console.log('Allergènes:', selectedAllergens);
		console.log('Régimes:', selectedDiets);
		// Ici, vous appelleriez votre API pour sauvegarder les préférences
	};

	return (
		<div className='min-h-screen bg-primary-50 pb-16'>
			{/* Header avec bouton retour */}
			<div className='px-4 py-3 bg-neutral-50 flex items-center border-b sticky top-0 z-10'>
				<Link to='/app/profile' className='mr-2'>
					<ChevronLeft className='size-5' />
				</Link>
				<h1 className='text-lg font-semibold'>
					Restrictions alimentaires
				</h1>
			</div>

			<div className='p-4 space-y-6'>
				{/* Section Allergies et intolérances */}
				<section>
					<h2 className='text-xl font-semibold mb-4'>
						Allergies et intolérances
					</h2>
					<p className='text-neutral-200 mb-4'>
						Sélectionnez les aliments auxquels vous êtes allergique
						ou intolérant.
					</p>

					<div className='grid grid-cols-3 sm:grid-cols-3 gap-3'>
						{allergens.map((allergen) => (
							<button
								key={allergen.id}
								onClick={() => toggleAllergen(allergen.id)}
								className={cn(
									'h-12 flex items-center justify-center rounded-lg border-2 transition-colors',
									selectedAllergens.includes(allergen.id)
										? 'border-success-50 bg-success-50 bg-opacity-10 text-success-50 font-semibold'
										: 'border-neutral-100 text-neutral-200'
								)}>
								{allergen.label}
							</button>
						))}
					</div>
				</section>

				{/* Section Régimes alimentaires */}
				<section>
					<h2 className='text-xl font-semibold mb-4'>
						Régimes alimentaires
					</h2>
					<p className='text-neutral-200 mb-4'>
						Sélectionnez les régimes alimentaires que vous suivez.
					</p>

					<div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
						{diets.map((diet) => (
							<button
								key={diet.id}
								onClick={() => toggleDiet(diet.id)}
								className={cn(
									'h-12 flex items-center justify-center rounded-lg border-2 transition-colors',
									selectedDiets.includes(diet.id)
										? 'border-success-50 bg-success-50 bg-opacity-10 text-success-50 font-semibold'
										: 'border-neutral-100 text-neutral-200'
								)}>
								{diet.label}
							</button>
						))}
					</div>
				</section>

				{/* Bouton de sauvegarde */}
				<Button
					onClick={savePreferences}
					className='w-full bg-success-50 hover:bg-success-50/80 text-neutral-50 py-3 rounded-lg font-semibold mt-8'>
					Enregistrer les modifications
				</Button>
			</div>
		</div>
	);
}
