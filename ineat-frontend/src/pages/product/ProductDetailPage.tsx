import { useEffect, type FC } from 'react';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
	ArrowLeft,
	Package,
	MapPin,
	Calendar,
	ShoppingCart,
	Trash2,
	Edit3,
	Star,
	Leaf,
	Zap,
	AlertTriangle,
	CheckCircle2,
	Clock,
	Heart,
	Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
	useInventoryItems,
	useInventoryLoading,
	useInventoryActions,
} from '@/stores/inventoryStore';
import {
	calculateExpiryStatus,
	formatDate,
	formatRelativeDate,
} from '@/utils/dateHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const ProductDetailPage: FC = () => {
	const { productId } = useParams({ from: '/app/inventory/$productId' });
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

	// Calculer le statut d'expiration
	const expiryStatus = inventoryItem?.expiryDate
		? calculateExpiryStatus(inventoryItem.expiryDate)
		: 'Inconnu';

	// Obtenir les couleurs selon le statut d'expiration
	const getExpiryColors = (status: string) => {
		switch (status) {
			case 'EXPIRED':
				return {
					bg: 'bg-gradient-to-r from-red-500 to-red-600',
					text: 'text-neutral-50',
					icon: <AlertTriangle className='size-5' />,
					badge: 'bg-red-100 text-red-800 border-red-200',
				};
			case 'CRITICAL':
				return {
					bg: 'bg-gradient-to-r from-orange-500 to-orange-600',
					text: 'text-neutral-50',
					icon: <Clock className='size-5' />,
					badge: 'bg-orange-100 text-orange-800 border-orange-200',
				};
			case 'WARNING':
				return {
					bg: 'bg-gradient-to-r from-yellow-500 to-yellow-600',
					text: 'text-neutral-50',
					icon: <Clock className='size-5' />,
					badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
				};
			case 'GOOD':
				return {
					bg: 'bg-gradient-to-r from-emerald-500 to-green-600',
					text: 'text-neutral-50',
					icon: <CheckCircle2 className='size-5' />,
					badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
				};
			default:
				return {
					bg: 'bg-gradient-to-r from-gray-500 to-gray-600',
					text: 'text-neutral-50',
					icon: <Clock className='size-5' />,
					badge: 'bg-gray-100 text-gray-800 border-gray-200',
				};
		}
	};

	// Obtenir la classe CSS pour le Nutriscore
	const getNutriscoreColors = (score: string | undefined) => {
		switch (score) {
			case 'A':
				return 'bg-gradient-to-br from-emerald-500 to-green-600 text-neutral-50';
			case 'B':
				return 'bg-gradient-to-br from-lime-500 to-green-500 text-neutral-50';
			case 'C':
				return 'bg-gradient-to-br from-yellow-400 to-orange-400 text-gray-800';
			case 'D':
				return 'bg-gradient-to-br from-orange-500 to-red-500 text-neutral-50';
			case 'E':
				return 'bg-gradient-to-br from-red-500 to-red-600 text-neutral-50';
			default:
				return 'bg-gradient-to-br from-gray-400 to-gray-500 text-neutral-50';
		}
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

	// Supprimer le produit
	const handleDelete = async () => {
		if (!inventoryItem) return;

		if (
			confirm(
				'Êtes-vous sûr de vouloir supprimer ce produit de votre inventaire ?'
			)
		) {
			try {
				await removeInventoryItem(inventoryItem.id);
				toast.success("Produit supprimé de l'inventaire");
				navigate({ to: '/app/inventory' });
			} catch (error) {
				if (error instanceof Error) {
					toast.error(error.message);
				} else {
					toast.error('Erreur lors de la suppression du produit');
				}
			}
		}
	};

	// S'il n'y a pas d'élément trouvé et qu'on n'est pas en train de charger
	if (!inventoryItem && !isLoading) {
		return (
			<div className='flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-6'>
				<div className='text-center space-y-6'>
					<div className='relative'>
						<div className='size-24 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center'>
							<Package className='size-12 text-gray-400' />
						</div>
						<div className='absolute -top-2 -right-2 size-8 bg-gradient-to-r from-red-400 to-red-500 rounded-full flex items-center justify-center shadow-lg'>
							<AlertTriangle className='size-4 text-neutral-50' />
						</div>
					</div>
					<div className='space-y-3'>
						<h2 className='text-2xl font-bold text-gray-900'>
							Produit non trouvé
						</h2>
						<p className='text-gray-600 max-w-md'>
							Ce produit n'existe pas ou a été supprimé de votre
							inventaire.
						</p>
					</div>
					<Button
						onClick={() => navigate({ to: '/app/inventory' })}
						className='flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-neutral-50 shadow-lg hover:shadow-xl transition-all duration-300'>
						<ArrowLeft className='size-4' />
						Retour à l'inventaire
					</Button>
				</div>
			</div>
		);
	}

	// Afficher un état de chargement
	if (isLoading || !inventoryItem) {
		return (
			<div className='flex flex-col justify-center items-center h-screen bg-gradient-to-br from-gray-50 to-blue-50/30'>
				<div className='text-center space-y-6'>
					<div className='relative'>
						<div className='size-20 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600' />
						<div className='absolute inset-0 size-20 border-4 border-transparent rounded-full animate-pulse border-t-blue-400' />
					</div>
					<div className='space-y-2'>
						<p className='text-gray-700 font-medium'>
							Chargement du produit...
						</p>
						<p className='text-sm text-gray-500'>
							Récupération des informations détaillées
						</p>
					</div>
				</div>
			</div>
		);
	}

	const expiryColors = getExpiryColors(expiryStatus);

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30'>
			{/* ===== HEADER ===== */}
			<div className='relative overflow-hidden bg-neutral-50 border-b border-gray-200 shadow-sm'>
				<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-purple-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

				<div className='relative px-6 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						<Button
							variant='ghost'
							size='sm'
							onClick={() => navigate({ to: '/app/inventory' })}
							className='size-10 p-0 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 shadow-sm'>
							<ArrowLeft className='size-5' />
						</Button>
						<div>
							<h1 className='text-2xl font-bold text-gray-900'>
								Détail du produit
							</h1>
							<p className='text-sm text-gray-600'>
								Informations complètes
							</p>
						</div>
					</div>

					<div className='flex items-center gap-2'>
						<Button
							variant='ghost'
							size='sm'
							className='size-10 p-0 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 shadow-sm'>
							<Share2 className='size-4' />
						</Button>
						<Button
							variant='ghost'
							size='sm'
							className='size-10 p-0 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 shadow-sm'>
							<Heart className='size-4' />
						</Button>
					</div>
				</div>
			</div>

			<div className='px-6 py-6 space-y-6'>
				{/* ===== IMAGE ET INFORMATIONS PRINCIPALES ===== */}
				<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-gray-50/50 shadow-xl'>
					<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/20 to-purple-100/20 rounded-full blur-3xl -translate-y-16 translate-x-16' />

					<CardContent className='p-6'>
						<div className='flex flex-col gap-6'>
							{' '}
							{/* Image du produit */}
							<div className='flex-shrink-0'>
								<div className='relative'>
									<div className='size-48 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-lg'>
										{inventoryItem.product.imageUrl ? (
											<img
												src={
													inventoryItem.product
														.imageUrl ||
													'/placeholder.svg'
												}
												alt={inventoryItem.product.name}
												className='size-full object-cover'
											/>
										) : (
											<div className='size-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100'>
												<Package className='size-16 text-blue-600' />
											</div>
										)}
									</div>

									{/* Badge de statut d'expiration */}
									<div className='absolute -top-2 -right-2'>
										<div
											className={`size-6 rounded-full ${expiryColors.bg} shadow-lg animate-pulse`}
										/>
									</div>
								</div>
							</div>
							{/* Informations principales (Titre, Marque) */}
							<div className='flex-1 space-y-4'>
								<div>
									<h2 className='text-3xl font-bold text-gray-900 mb-2'>
										{inventoryItem.product.name}
									</h2>
									{inventoryItem.product.brand && (
										<p className='text-lg font-medium text-gray-600'>
											{inventoryItem.product.brand}
										</p>
									)}
								</div>
							</div>
							{/* Quantité et lieu de stockage */}
							<div className='flex flex-wrap gap-4'>
								<div className='flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl'>
									<Package className='size-4 text-blue-600' />
									<span className='font-semibold text-blue-800'>
										{formatUnit(
											inventoryItem.quantity,
											inventoryItem.product.unitType
										)}
									</span>
								</div>

								{inventoryItem.storageLocation && (
									<div className='flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl'>
										<MapPin className='size-4 text-green-600' />
										<span className='font-semibold text-green-800'>
											{inventoryItem.storageLocation
												.charAt(0)
												.toUpperCase() +
												inventoryItem.storageLocation.slice(
													1
												)}
										</span>
									</div>
								)}
							</div>
							{/* Date d'expiration */}
							{inventoryItem.expiryDate && (
								<div className='space-y-3'>
									<div className='flex items-center gap-2'>
										<Calendar className='size-4 text-gray-600' />
										<span className='text-sm font-medium text-gray-600'>
											Date de péremption
										</span>
									</div>
									<div className='flex items-center gap-4'>
										<span className='text-lg font-bold text-gray-900'>
											{formatDate(
												inventoryItem.expiryDate
											)}
										</span>
										<div
											className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${expiryColors.badge}`}>
											{expiryColors.icon}
											<span className='font-semibold text-sm'>
												{formatRelativeDate(
													inventoryItem.expiryDate
												)}
											</span>
										</div>
									</div>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* ===== SCORES NUTRITIONNELS ===== */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					{/* Nutriscore */}
					<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-green-50/50 shadow-xl'>
						<div className='absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-100/30 to-emerald-100/30 rounded-full blur-2xl -translate-y-8 translate-x-8' />

						<CardContent className='p-6'>
							<div className='flex items-center gap-4'>
								<div className='relative'>
									<div
										className={`size-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${getNutriscoreColors(
											inventoryItem.product.nutriscore
										)}`}>
										{inventoryItem.product.nutriscore ||
											'?'}
									</div>
									<div className='absolute -top-1 -right-1 size-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg'>
										<Zap className='size-3 text-neutral-50' />
									</div>
								</div>
								<div className='flex-1'>
									<h3 className='font-bold text-gray-900 mb-1'>
										Nutri-Score
									</h3>
									<p className='text-sm text-gray-600 leading-relaxed'>
										{getNutriscoreText(
											inventoryItem.product.nutriscore
										)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Eco-score */}
					<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-emerald-50/50 shadow-xl'>
						<div className='absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-100/30 to-green-100/30 rounded-full blur-2xl -translate-y-8 translate-x-8' />

						<CardContent className='p-6'>
							<div className='flex items-center gap-4'>
								<div className='relative'>
									<div
										className={`size-16 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${getNutriscoreColors(
											inventoryItem.product.ecoScore
										)}`}>
										{inventoryItem.product.ecoScore || '?'}
									</div>
									<div className='absolute -top-1 -right-1 size-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg'>
										<Leaf className='size-3 text-neutral-50' />
									</div>
								</div>
								<div className='flex-1'>
									<h3 className='font-bold text-gray-900 mb-1'>
										Eco-Score
									</h3>
									<p className='text-sm text-gray-600 leading-relaxed'>
										{getEcoScoreText(
											inventoryItem.product.ecoScore
										)}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* ===== INFORMATIONS NUTRITIONNELLES ===== */}
				{inventoryItem.product.nutrients &&
					Object.keys(inventoryItem.product.nutrients).length > 0 && (
						<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-orange-50/50 shadow-xl'>
							<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100/30 to-yellow-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

							<CardContent className='p-6'>
								<div className='flex items-center gap-3 mb-6'>
									<div className='p-2 rounded-xl bg-orange-50 border border-orange-200'>
										<Star className='size-5 text-orange-600' />
									</div>
									<div>
										<h3 className='font-bold text-gray-900'>
											Valeurs nutritionnelles
										</h3>
										<p className='text-sm text-gray-600'>
											Pour 100{' '}
											{inventoryItem.product.unitType ===
												'L' ||
											inventoryItem.product.unitType ===
												'ML'
												? 'mL'
												: 'g'}
										</p>
									</div>
								</div>

								<div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
									{inventoryItem.product.nutrients.energy !==
										undefined && (
										<div className='bg-gradient-to-r from-red-50 to-orange-50 border border-red-100 rounded-xl p-4'>
											<div className='text-2xl font-bold text-red-700 mb-1'>
												{
													inventoryItem.product
														.nutrients.energy
												}
											</div>
											<div className='text-sm font-medium text-red-600'>
												kcal
											</div>
											<div className='text-xs text-gray-600 mt-1'>
												Énergie
											</div>
										</div>
									)}

									{inventoryItem.product.nutrients.fats !==
										undefined && (
										<div className='bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100 rounded-xl p-4'>
											<div className='text-2xl font-bold text-yellow-700 mb-1'>
												{
													inventoryItem.product
														.nutrients.fats
												}
											</div>
											<div className='text-sm font-medium text-yellow-600'>
												g
											</div>
											<div className='text-xs text-gray-600 mt-1'>
												Matières grasses
											</div>
										</div>
									)}

									{inventoryItem.product.nutrients
										.carbohydrates !== undefined && (
										<div className='bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4'>
											<div className='text-2xl font-bold text-blue-700 mb-1'>
												{
													inventoryItem.product
														.nutrients.carbohydrates
												}
											</div>
											<div className='text-sm font-medium text-blue-600'>
												g
											</div>
											<div className='text-xs text-gray-600 mt-1'>
												Glucides
											</div>
										</div>
									)}

									{inventoryItem.product.nutrients
										.proteins !== undefined && (
										<div className='bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4'>
											<div className='text-2xl font-bold text-green-700 mb-1'>
												{
													inventoryItem.product
														.nutrients.proteins
												}
											</div>
											<div className='text-sm font-medium text-green-600'>
												g
											</div>
											<div className='text-xs text-gray-600 mt-1'>
												Protéines
											</div>
										</div>
									)}

									{inventoryItem.product.nutrients.salt !==
										undefined && (
										<div className='bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl p-4'>
											<div className='text-2xl font-bold text-purple-700 mb-1'>
												{
													inventoryItem.product
														.nutrients.salt
												}
											</div>
											<div className='text-sm font-medium text-purple-600'>
												g
											</div>
											<div className='text-xs text-gray-600 mt-1'>
												Sel
											</div>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					)}

				{/* ===== INFORMATIONS D'ACHAT ===== */}
				<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-blue-50/50 shadow-xl'>
					<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-indigo-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

					<CardContent className='p-6'>
						<div className='flex items-center gap-3 mb-6'>
							<div className='p-2 rounded-xl bg-blue-50 border border-blue-200'>
								<ShoppingCart className='size-5 text-blue-600' />
							</div>
							<div>
								<h3 className='font-bold text-gray-900'>
									Informations d'achat
								</h3>
								<p className='text-sm text-gray-600'>
									Détails de votre achat
								</p>
							</div>
						</div>

						<div className='space-y-4'>
							<div className='flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl'>
								<div className='flex items-center gap-3'>
									<Calendar className='size-4 text-blue-600' />
									<span className='font-medium text-gray-700'>
										Date d'achat
									</span>
								</div>
								<span className='font-bold text-gray-900'>
									{formatDate(inventoryItem.purchaseDate)}
								</span>
							</div>

							{inventoryItem.purchasePrice && (
								<div className='flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl'>
									<div className='flex items-center gap-3'>
										<div className='size-4 bg-green-500 rounded-full' />
										<span className='font-medium text-gray-700'>
											Prix d'achat
										</span>
									</div>
									<span className='font-bold text-green-700 text-lg'>
										{inventoryItem.purchasePrice.toFixed(2)}{' '}
										€
									</span>
								</div>
							)}
						</div>
					</CardContent>
				</Card>

				{/* ===== NOTES ===== */}
				{inventoryItem.notes && (
					<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-white to-purple-50/50 shadow-xl'>
						<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100/30 to-pink-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

						<CardContent className='p-6'>
							<div className='flex items-start gap-3'>
								<div className='p-2 rounded-xl bg-purple-50 border border-purple-200'>
									<Edit3 className='size-5 text-purple-600' />
								</div>
								<div className='flex-1'>
									<h3 className='font-bold text-gray-900 mb-2'>
										Notes personnelles
									</h3>
									<p className='text-gray-700 leading-relaxed bg-purple-50 border border-purple-100 rounded-xl p-4'>
										{inventoryItem.notes}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* ===== ACTIONS ===== */}
				<div className='flex gap-4 pb-8'>
					<Button
						variant='outline'
						className='flex-1 h-12 border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 bg-transparent'>
						<Edit3 className='size-4 mr-2' />
						Modifier
					</Button>

					<Button
						onClick={handleDelete}
						className='flex-1 h-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-neutral-50 shadow-lg hover:shadow-xl transition-all duration-300'>
						<Trash2 className='size-4 mr-2' />
						Supprimer
					</Button>
				</div>
			</div>
		</div>
	);
};

export default ProductDetailPage;
