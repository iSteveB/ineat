import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { useInventoryStore } from '@/stores/inventoryStore';
import { format, differenceInDays } from 'date-fns';
import { StorageLocation } from '@/types/product';

// Définition de la route avec le paramètre productId
export const Route = createFileRoute('/app/inventory/$productId')({
	component: ProductDetailPage,
});

function ProductDetailPage() {
	const { productId } = Route.useParams();
	const navigate = useNavigate();
	const { items, fetchInventoryItems, isLoading } = useInventoryStore();
	const [showIngredients, setShowIngredients] = useState(false);

	// Charger les données au montage du composant si elles ne sont pas déjà chargées
	useEffect(() => {
		if (items.length === 0 && !isLoading) {
			fetchInventoryItems();
		}
	}, [fetchInventoryItems, items.length, isLoading]);

	// Trouver l'élément correspondant au productId
	const inventoryItem = items.find((item) => item.id === productId);

	// S'il n'y a pas d'élément trouvé et qu'on n'est pas en train de charger
	if (!inventoryItem && !isLoading) {
		return (
			<div className='flex flex-col items-center justify-center h-screen bg-primary-50 p-4'>
				<p className='text-xl mb-4'>Produit non trouvé</p>
				<button
					onClick={() => navigate({ to: '/app/inventory' })}
					className='flex items-center gap-2 px-4 py-2 bg-success-50 text-neutral-50 rounded-md'>
					<ArrowLeft size={18} />
					Retour à l'inventaire
				</button>
			</div>
		);
	}

	// Afficher un état de chargement
	if (isLoading || !inventoryItem) {
		return (
			<div className='flex justify-center items-center h-screen bg-primary-50'>
				<div className='animate-spin rounded-full size-12 border-b-2 border-success-50'></div>
			</div>
		);
	}

	// Calcul des jours restants avant expiration
	const daysRemaining = inventoryItem.expiryDate
		? differenceInDays(inventoryItem.expiryDate, new Date())
		: null;

	// Formatage des jours restants
	const expiryText =
		daysRemaining !== null
			? daysRemaining >= 0
				? `J-${daysRemaining}`
				: `Expiré depuis ${Math.abs(daysRemaining)}j`
			: '';

	// Couleur du badge d'expiration
	const getExpiryStatusColor = (days: number): string => {
		if (days < 0) return 'bg-error-100 text-neutral-50'; // Expiré
		if (days <= 2) return 'bg-error-50 text-neutral-50'; // Critique
		if (days <= 5) return 'bg-warning-50 text-neutral-50'; // Attention
		return 'bg-success-50 text-neutral-50'; // OK
	};

	// Obtenir le texte pour le storage location
	const getStorageLocationText = (location?: StorageLocation): string => {
		if (!location) return 'Non spécifié';

		const locationMap: Record<StorageLocation, string> = {
			FRESH: 'Frigo',
			FREEZER: 'Congélateur',
			PANTRY: 'Placard',
			ALL: 'Tous',
		};

		return locationMap[location];
	};

	return (
		<div className='flex flex-col bg-primary-50 min-h-screen'>
			{/* En-tête avec titre et bouton de retour */}
			<div className='p-4 flex items-center gap-4'>
				<button
					onClick={() => navigate({ to: '/app/inventory' })}
					className='size-10 flex items-center justify-center rounded-full bg-neutral-50 shadow-sm'>
					<ArrowLeft size={20} />
				</button>
				<h1 className='text-2xl font-bold font-display'>Mes Stocks</h1>
			</div>

			{/* Contenu principal dans une carte */}
			<div className='flex-1 mx-4 mb-4 bg-white rounded-2xl shadow-sm overflow-hidden'>
				{/* Section image du produit */}
				<div className='p-4 flex justify-center bg-primary-50 border border-neutral-100'>
					<div className='size-48 relative'>
						{inventoryItem.imageUrl ? (
							<img
								src={inventoryItem.imageUrl}
								alt={inventoryItem.name}
								className='size-full object-contain'
							/>
						) : (
							<div className='size-full flex items-center justify-center bg-neutral-50 rounded-md'>
								<Package
									size={64}
									className='text-neutral-200'
								/>
							</div>
						)}
					</div>
				</div>

				{/* Titre et sous-titre du produit */}
				<div className='p-6'>
					<h2 className='text-2xl font-bold mb-1'>
						{inventoryItem.name}
						{inventoryItem.quantity &&
						inventoryItem.unitType === 'L'
							? ` ${inventoryItem.quantity}L`
							: ''}
					</h2>
					<p className='text-lg text-neutral-200 mb-3'>
						{inventoryItem.brand}
					</p>

					{/* État du stock et date d'expiration */}
					<div className='flex justify-between items-center'>
						<div>
							<p className='text-lg font-semibold'>En Stock</p>
							<p className='text-lg'>
								{inventoryItem.quantity}
								{inventoryItem.quantity &&
								inventoryItem.quantity > 1
									? ' bouteilles'
									: ' bouteille'}
							</p>
							<p className='text-sm text-neutral-200'>
								{getStorageLocationText(
									inventoryItem.storageLocation
								)}
							</p>
						</div>

						{inventoryItem.expiryDate && (
							<div className='flex flex-col items-end'>
								<p className='text-sm text-neutral-200'>
									À consommer avant :
								</p>
								<div className='flex items-center gap-2'>
									<span className='font-medium'>
										{format(
											inventoryItem.expiryDate,
											'dd/MM/yyyy'
										)}
									</span>
									<span
										className={`${
											daysRemaining !== null
												? getExpiryStatusColor(
														daysRemaining
												  )
												: ''
										} px-3 py-1 rounded-lg text-sm font-medium`}>
										{expiryText}
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Ligne de séparation */}
					<div className='border-b border-neutral-100 my-4'></div>

					{/* Section ingrédients avec toggle */}
					<div>
						<button
							className='w-full flex items-center justify-between py-2'
							onClick={() =>
								setShowIngredients(!showIngredients)
							}>
							<h3 className='text-lg font-semibold'>
								Ingrédients
							</h3>
							{showIngredients ? (
								<ChevronUp size={20} />
							) : (
								<ChevronDown size={20} />
							)}
						</button>

						{showIngredients && (
							<div className='py-2 text-sm text-neutral-300'>
								{inventoryItem.ingredients &&
								inventoryItem.ingredients.length > 0 ? (
									<ul className='list-disc pl-5 space-y-1'>
										{inventoryItem.ingredients.map(
											(ingredient, index) => (
												<li key={index}>
													{ingredient}
												</li>
											)
										)}
									</ul>
								) : (
									<p>
										Informations sur les ingrédients non
										disponibles
									</p>
								)}

								{/* Allergènes si disponibles */}
								{inventoryItem.allergens &&
									inventoryItem.allergens.length > 0 && (
										<div className='mt-3'>
											<p className='font-medium mb-1'>
												Allergènes :
											</p>
											<ul className='list-disc pl-5'>
												{inventoryItem.allergens.map(
													(allergen, index) => (
														<li
															key={index}
															className='text-error-50'>
															{allergen}
														</li>
													)
												)}
											</ul>
										</div>
									)}
							</div>
						)}
					</div>

					{/* Ligne de séparation */}
					<div className='border-b border-neutral-100 my-4'></div>

					{/* Informations nutritionnelles */}
					<div>
						<h3 className='text-lg font-semibold mb-3'>
							Pour 100{' '}
							{inventoryItem.unitType === 'L' ||
							inventoryItem.unitType === 'ML'
								? 'mL'
								: 'g'}
						</h3>

						<div className='space-y-2'>
							{inventoryItem.nutrients ? (
								<>
									{inventoryItem.nutrients.fat !==
										undefined && (
										<p className='text-sm'>
											{(inventoryItem.nutrients.fat ?? 0).toString()}g de
											matière grasse
										</p>
									)}
									{inventoryItem.nutrients.saturatedFat !==
										undefined && (
										<p className='text-sm'>
											{
												(inventoryItem.nutrients
													.saturatedFat?? 0).toString()
											}
											g d'acide gras saturés
										</p>
									)}
									{inventoryItem.nutrients.salt !==
										undefined && (
										<p className='text-sm'>
											{(inventoryItem.nutrients.salt ?? 0).toString()}g de
											sel
										</p>
									)}
									{inventoryItem.nutrients.sugar !==
										undefined && (
										<p className='text-sm'>
											{(inventoryItem.nutrients.sugar?? 0).toString()}g de
											sucres
										</p>
									)}
									{inventoryItem.nutrients.calories !==
										undefined && (
										<p className='text-sm'>
											{(inventoryItem.nutrients.calories?? 0).toString()}{' '}
											kcal
										</p>
									)}
								</>
							) : (
								<p className='text-sm text-neutral-200'>
									Informations nutritionnelles non disponibles
								</p>
							)}
						</div>
					</div>

					{/* Ligne de séparation */}
					<div className='border-b border-neutral-100 my-4'></div>

					{/* Nutriscore */}
					<div>
						<h3 className='text-lg font-semibold mb-1'>
							Nutri-score
						</h3>
						<p className='text-lg font-medium ${getNutriscoreColor(inventoryItem.nutriscore)}'>
							{inventoryItem.nutriscore || '?'} :{' '}
							{inventoryItem.nutriscore === 'E'
								? 'Mauvaises qualités nutritionnelles'
								: inventoryItem.nutriscore === 'A'
								? 'Excellentes qualités nutritionnelles'
								: inventoryItem.nutriscore === 'B'
								? 'Bonnes qualités nutritionnelles'
								: inventoryItem.nutriscore === 'C'
								? 'Qualités nutritionnelles moyennes'
								: inventoryItem.nutriscore === 'D'
								? 'Qualités nutritionnelles insuffisantes'
								: 'Information nutritionnelle non disponible'}
						</p>
					</div>

					{/* EcoScore (si disponible) */}
					<div className='mt-4'>
						<h3 className='text-lg font-semibold mb-1'>
							Eco-score
						</h3>
						<p className='text-lg font-medium ${getNutriscoreColor(inventoryItem.ecoScore as NutriScore)}'>
							{inventoryItem.ecoScore || '?'} :{' '}
							{inventoryItem.ecoScore === 'E'
								? 'Impact environnemental très élevé'
								: inventoryItem.ecoScore === 'D'
								? 'Impact environnemental élevé'
								: inventoryItem.ecoScore === 'C'
								? 'Impact environnemental modéré'
								: inventoryItem.ecoScore === 'B'
								? 'Impact environnemental limité'
								: inventoryItem.ecoScore === 'A'
								? 'Impact environnemental faible'
								: 'Information environnementale non disponible'}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default ProductDetailPage;
