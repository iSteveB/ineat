import { useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Package } from 'lucide-react';
import {
	useInventoryItems,
	useInventoryLoading,
	useInventoryActions,
} from '@/stores/inventoryStore';
import {
	calculateExpiryStatus,
	formatDate,
	formatRelativeDate,
	getExpiryStatusColor,
} from '@/utils/dateHelpers';
import { toast } from 'sonner';

// Définition de la route avec le paramètre productId
export const Route = createFileRoute('/app/inventory/$productId')({
	component: ProductDetailPage,
});

function ProductDetailPage() {
	const { productId } = Route.useParams();
	const navigate = useNavigate();
	const items = useInventoryItems();
	const isLoading = useInventoryLoading();
	const { fetchInventoryItems, removeInventoryItem } = useInventoryActions();

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
					className='flex items-center gap-2 px-4 py-2 bg-accent text-neutral-50 rounded-full'>
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
				<div className='animate-spin rounded-full size-12 border-b-2 border-accent'></div>
			</div>
		);
	}

	// Calculer le statut d'expiration
	const expiryStatus = calculateExpiryStatus(inventoryItem.expiryDate);
	const expiryColorClass = getExpiryStatusColor(expiryStatus);

	// Formatage de l'unité
	const formatUnit = (quantity: number, unitType: string): string => {
		switch (unitType) {
			case 'KG':
				return `${quantity} kg`;
			case 'G':
				return `${quantity} g`;
			case 'L':
				return `${quantity} L`;
			case 'ML':
				return `${quantity} mL`;
			case 'UNIT':
				return quantity === 1
					? `${quantity} unité`
					: `${quantity} unités`;
			default:
				return `${quantity} ${unitType.toLowerCase()}`;
		}
	};

	// Obtenir la classe CSS pour le Nutriscore
	const getNutriscoreClass = (score: string | undefined): string => {
		if (!score) return 'bg-neutral-200 text-neutral-300';

		const classes: Record<string, string> = {
			A: 'bg-nutriscore-a text-neutral-50',
			B: 'bg-nutriscore-b text-neutral-50',
			C: 'bg-nutriscore-c text-neutral-300',
			D: 'bg-nutriscore-d text-neutral-50',
			E: 'bg-nutriscore-e text-neutral-50',
		};

		return classes[score] || 'bg-neutral-200 text-neutral-300';
	};

	// Obtenir le texte descriptif du Nutriscore
	const getNutriscoreText = (score: string | undefined): string => {
		const descriptions: Record<string, string> = {
			A: 'Excellentes qualités nutritionnelles',
			B: 'Bonnes qualités nutritionnelles',
			C: 'Qualités nutritionnelles moyennes',
			D: 'Qualités nutritionnelles insuffisantes',
			E: 'Mauvaises qualités nutritionnelles',
		};

		return (
			descriptions[score || ''] ||
			'Information nutritionnelle non disponible'
		);
	};

	// Obtenir le texte descriptif de l'Eco-score
	const getEcoScoreText = (score: string | undefined): string => {
		const descriptions: Record<string, string> = {
			A: 'Impact environnemental faible',
			B: 'Impact environnemental limité',
			C: 'Impact environnemental modéré',
			D: 'Impact environnemental élevé',
			E: 'Impact environnemental très élevé',
		};

		return (
			descriptions[score || ''] ||
			'Information environnementale non disponible'
		);
	};

	// Supprimer le produit
	const handleDelete = async () => {
		if (
			confirm(
				'Êtes-vous sûr de vouloir supprimer ce produit de votre inventaire ?'
			)
		) {
			try {
				await removeInventoryItem(inventoryItem.id);
				toast.success("Produit supprimé de l'inventaire");
				navigate({ to: '/app/inventory' });
			} catch (error: Error | unknown) {
				if (error instanceof Error) {
					toast.error(error.message);
				} else {
					toast.error('Erreur lors de la suppression du produit');
				}
			}
		}
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
				<h1 className='text-2xl font-bold font-display'>
					Détail du produit
				</h1>
			</div>

			{/* Contenu principal dans une carte */}
			<div className='flex-1 mx-4 mb-4 bg-neutral-50 rounded-2xl shadow-sm overflow-hidden'>
				{/* Section image du produit */}
				<div className='p-6 flex justify-center bg-primary-50 border-b border-neutral-100'>
					<div className='size-48 relative'>
						{inventoryItem.product.imageUrl ? (
							<img
								src={inventoryItem.product.imageUrl}
								alt={inventoryItem.product.name}
								className='size-full object-contain'
							/>
						) : (
							<div className='size-full flex items-center justify-center bg-neutral-100 rounded-lg'>
								<Package
									size={64}
									className='text-neutral-200'
								/>
							</div>
						)}
					</div>
				</div>

				{/* Informations du produit */}
				<div className='p-6 space-y-6'>
					{/* Titre et marque */}
					<div>
						<h2 className='text-2xl font-bold mb-1'>
							{inventoryItem.product.name}
						</h2>
						{inventoryItem.product.brand && (
							<p className='text-lg text-neutral-200'>
								{inventoryItem.product.brand}
							</p>
						)}
					</div>

					{/* État du stock et date d'expiration */}
					<div className='bg-primary-50 rounded-xl p-4'>
						<div className='flex justify-between items-start'>
							<div>
								<p className='text-sm text-neutral-200 mb-1'>
									Quantité en stock
								</p>
								<p className='text-lg font-semibold'>
									{formatUnit(
										inventoryItem.quantity,
										inventoryItem.product.unitType
									)}
								</p>
								{inventoryItem.storageLocation && (
									<p className='text-sm text-neutral-200 mt-1'>
										📍 {inventoryItem.storageLocation}
									</p>
								)}
							</div>

							{inventoryItem.expiryDate && (
								<div className='text-right'>
									<p className='text-sm text-neutral-200 mb-1'>
										Date de péremption
									</p>
									<p className='font-medium'>
										{formatDate(inventoryItem.expiryDate)}
									</p>
									<span
										className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-medium ${expiryColorClass}`}>
										{formatRelativeDate(
											inventoryItem.expiryDate
										)}
									</span>
								</div>
							)}
						</div>
					</div>

					{/* Scores nutritionnels et environnementaux */}
					<div className='grid grid-cols-2 gap-4'>
						{/* Nutriscore */}
						<div className='bg-primary-50 rounded-xl p-4'>
							<h3 className='text-sm text-neutral-200 mb-2'>
								Nutri-score
							</h3>
							<div className='flex items-center gap-3'>
								<div
									className={`size-12 rounded-full flex items-center justify-center font-bold text-lg ${getNutriscoreClass(
										inventoryItem.product.nutriscore
									)}`}>
									{inventoryItem.product.nutriscore || '?'}
								</div>
								<p className='text-xs flex-1'>
									{getNutriscoreText(
										inventoryItem.product.nutriscore
									)}
								</p>
							</div>
						</div>

						{/* Eco-score */}
						<div className='bg-primary-50 rounded-xl p-4'>
							<h3 className='text-sm text-neutral-200 mb-2'>
								Eco-score
							</h3>
							<div className='flex items-center gap-3'>
								<div
									className={`size-12 rounded-full flex items-center justify-center font-bold text-lg ${getNutriscoreClass(
										inventoryItem.product.ecoScore
									)}`}>
									{inventoryItem.product.ecoScore || '?'}
								</div>
								<p className='text-xs flex-1'>
									{getEcoScoreText(
										inventoryItem.product.ecoScore
									)}
								</p>
							</div>
						</div>
					</div>

					{/* Informations nutritionnelles */}
					{inventoryItem.product.nutrients &&
						Object.keys(inventoryItem.product.nutrients).length >
							0 && (
							<div className='bg-primary-50 rounded-xl p-4'>
								<h3 className='font-semibold mb-3'>
									Valeurs nutritionnelles pour 100{' '}
									{inventoryItem.product.unitType === 'L' ||
									inventoryItem.product.unitType === 'ML'
										? 'mL'
										: 'g'}
								</h3>
								<div className='space-y-2 text-sm'>
									{inventoryItem.product.nutrients
										.energy !== undefined && (
										<div className='flex justify-between'>
											<span>Énergie</span>
											<span className='font-medium'>
												{
													inventoryItem.product
														.nutrients.energy
												}{' '}
												kcal
											</span>
										</div>
									)}
									{inventoryItem.product.nutrients.fats !==
										undefined && (
										<div className='flex justify-between'>
											<span>Matières grasses</span>
											<span className='font-medium'>
												{
													inventoryItem.product
														.nutrients.fats
												}{' '}
												g
											</span>
										</div>
									)}
									{inventoryItem.product.nutrients
										.carbohydrates !== undefined && (
										<div className='flex justify-between'>
											<span>Glucides</span>
											<span className='font-medium'>
												{
													inventoryItem.product
														.nutrients.carbohydrates
												}{' '}
												g
											</span>
										</div>
									)}
									{inventoryItem.product.nutrients
										.proteins !== undefined && (
										<div className='flex justify-between'>
											<span>Protéines</span>
											<span className='font-medium'>
												{
													inventoryItem.product
														.nutrients.proteins
												}{' '}
												g
											</span>
										</div>
									)}
									{inventoryItem.product.nutrients.salt !==
										undefined && (
										<div className='flex justify-between'>
											<span>Sel</span>
											<span className='font-medium'>
												{
													inventoryItem.product
														.nutrients.salt
												}{' '}
												g
											</span>
										</div>
									)}
								</div>
							</div>
						)}

					{/* Informations d'achat */}
					<div className='bg-primary-50 rounded-xl p-4'>
						<h3 className='font-semibold mb-3'>
							Informations d'achat
						</h3>
						<div className='space-y-2 text-sm'>
							<div className='flex justify-between'>
								<span>Date d'achat</span>
								<span className='font-medium'>
									{formatDate(inventoryItem.purchaseDate)}
								</span>
							</div>
							{inventoryItem.purchasePrice && (
								<div className='flex justify-between'>
									<span>Prix d'achat</span>
									<span className='font-medium'>
										{inventoryItem.purchasePrice.toFixed(2)}{' '}
										€
									</span>
								</div>
							)}
						</div>
					</div>

					{/* Notes */}
					{inventoryItem.notes && (
						<div className='bg-primary-50 rounded-xl p-4'>
							<h3 className='font-semibold mb-2'>Notes</h3>
							<p className='text-sm'>{inventoryItem.notes}</p>
						</div>
					)}

					{/* Bouton de suppression */}
					<button
						onClick={handleDelete}
						className='w-full py-3 bg-error-50 text-neutral-50 rounded-xl font-medium hover:bg-error-100 transition-colors'>
						Supprimer de l'inventaire
					</button>
				</div>
			</div>
		</div>
	);
}

export default ProductDetailPage;
