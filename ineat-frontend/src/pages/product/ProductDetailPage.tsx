import { useEffect, useState, type FC } from 'react';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import {
	ArrowLeft,
	Beaker,
	Leaf,
	Loader2,
	MapPin,
	Package,
	PencilLine,
	SearchX,
	Trash2,
	Heart,
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
	formatExpiryLabel,
} from '@/utils/dateHelpers';
import { NutritionInfoCard } from '@/features/product/NutritionInfoCard';
import { IngredientsCard } from '@/features/product/IngredientsCard';
import { EditInventoryItemModal } from '@/features/inventory/EditInventoryItemModal';
import { Button, buttonVariants } from '@/components/ui/button';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import ExpiryBadge from '@/components/common/ExpiryBadge';
import NutriScore from '@/components/common/NutriScore';
import ScoreBadge from '@/components/common/ScoreBadge';
import WidgetCard from '@/components/common/WidgetCard';
import { UpdateInventoryItemData } from '@/schemas';
import { getUserFacingErrorMessage } from '@/utils/errorMessages';

const ProductDetailPage: FC = () => {
	const { productId } = useParams({ from: '/app/inventory/$productId' });
	const navigate = useNavigate();
	const items = useInventoryItems();
	const isLoading = useInventoryLoading();
	const {
		fetchInventoryItems,
		removeInventoryItem,
		updateInventoryItem,
		updateInventoryFavorite,
	} = useInventoryActions();

	// État pour le modal de modification
	const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
	const [isUpdating, setIsUpdating] = useState<boolean>(false);
	const [isUpdatingFavorite, setIsUpdatingFavorite] = useState(false);
	const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	// Charger les données au montage du composant si elles ne sont pas déjà chargées
	useEffect(() => {
		if (items.length === 0 && !isLoading) {
			fetchInventoryItems();
		}
	}, [fetchInventoryItems, items.length, isLoading]);

	// Trouver l'élément correspondant au productId
	const inventoryItem = items.find((item) => item.id === productId);

	// Calculer le statut d'expiration
	const expiryStatus = calculateExpiryStatus(inventoryItem?.expiryDate);

	// Obtenir le texte descriptif du Nutriscore
	const getNutriscoreText = (score: string | undefined): string => {
		const descriptions: Record<string, string> = {
			A: 'Excellentes qualités nutritionnelles',
			B: 'Bonnes qualités nutritionnelles',
			C: 'Qualités nutritionnelles moyennes',
			D: 'Qualités nutritionnelles insuffisantes',
			E: 'Mauvaises qualités nutritionnelles',
		};
		return descriptions[score || ''] || 'Information non disponible';
	};

	// Obtenir le texte descriptif de l'Eco-score
	const getEcoscoreText = (score: string | undefined): string => {
		const descriptions: Record<string, string> = {
			A: 'Impact environnemental faible',
			B: 'Impact environnemental limité',
			C: 'Impact environnemental modéré',
			D: 'Impact environnemental élevé',
			E: 'Impact environnemental très élevé',
		};
		return descriptions[score || ''] || 'Information non disponible';
	};

	const getNovascoreText = (score: string | undefined): string => {
		const descriptions: Record<string, string> = {
			GROUP_1: 'Aliments non transformés ou transformés minimalement',
			GROUP_2: 'Ingrédients culinaires transformés',
			GROUP_3: 'Aliments transformés',
			GROUP_4: 'Produits et boissons ultra-transformés',
		};
		return descriptions[score || ''] || 'Information non disponible';
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
				return quantity === 1 ? `${quantity} unité` : `${quantity} unités`;
			default:
				return `${quantity} ${unitType.toLowerCase()}`;
		}
	};

	// Gérer l'ouverture du modal de modification
	const handleOpenEditModal = (): void => {
		setIsEditModalOpen(true);
	};

	// Gérer la fermeture du modal de modification
	const handleCloseEditModal = (): void => {
		setIsEditModalOpen(false);
	};

	// Gérer la mise à jour du produit
	const handleUpdateProduct = async (
		updates: UpdateInventoryItemData,
	): Promise<void> => {
		if (!inventoryItem) return;

		setIsUpdating(true);

		try {
			await updateInventoryItem(inventoryItem.id, updates);
			toast.success('Produit mis à jour avec succès');
			setIsEditModalOpen(false);
		} catch (error) {
			toast.error(
				getUserFacingErrorMessage(
					error,
					'Impossible de mettre à jour le produit. Veuillez réessayer.',
				),
			);
		} finally {
			setIsUpdating(false);
		}
	};

	// Supprimer le produit (après confirmation dans la boîte de dialogue)
	const handleDelete = async (): Promise<void> => {
		if (!inventoryItem) return;

		setIsDeleting(true);
		try {
			await removeInventoryItem(inventoryItem.id);
			toast.success("Produit supprimé de l'inventaire");
			navigate({ to: '/app/inventory' });
		} catch (error) {
			toast.error(
				getUserFacingErrorMessage(
					error,
					'Impossible de supprimer le produit. Veuillez réessayer.',
				),
			);
		} finally {
			setIsDeleting(false);
			setIsConfirmingDelete(false);
		}
	};

	const handleToggleFavorite = async (): Promise<void> => {
		if (!inventoryItem) return;

		setIsUpdatingFavorite(true);
		try {
			await updateInventoryFavorite(
				inventoryItem.id,
				!inventoryItem.isFavorite
			);
			toast.success(
				inventoryItem.isFavorite
					? 'Produit retiré des favoris'
					: 'Produit ajouté aux favoris'
			);
		} catch (error) {
			toast.error(
				getUserFacingErrorMessage(error, 'Impossible de modifier ce favori.'),
			);
		} finally {
			setIsUpdatingFavorite(false);
		}
	};

	const backLink = (
		<Button asChild variant='ghost' className='-ml-3 self-start'>
			<Link to='/app/inventory'>
				<ArrowLeft aria-hidden='true' />
				Inventaire
			</Link>
		</Button>
	);

	// S'il n'y a pas d'élément trouvé et qu'on n'est pas en train de charger
	if (!inventoryItem && !isLoading) {
		return (
			<div className='mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-12 lg:py-6'>
				{backLink}
				<div className='card flex flex-col items-center gap-3 px-6 py-12 text-center'>
					<span className='flex size-14 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700'>
						<SearchX className='size-7' aria-hidden='true' />
					</span>
					<h1 className='type-h2 text-neutral-900'>Produit introuvable</h1>
					<p className='max-w-md text-neutral-700'>
						Ce produit n'existe pas ou a été supprimé de votre inventaire.
					</p>
				</div>
			</div>
		);
	}

	// Afficher un état de chargement
	if (isLoading || !inventoryItem) {
		return (
			<p role='status' className='flex min-h-[60vh] items-center justify-center gap-3 text-neutral-600'>
				<Loader2 className='size-6 animate-spin text-accent-600' aria-hidden='true' />
				Chargement du produit…
			</p>
		);
	}

	const purchaseLots =
		inventoryItem.lots && inventoryItem.lots.length > 0
			? inventoryItem.lots
			: [
					{
						id: inventoryItem.id,
						quantity: inventoryItem.quantity,
						expiryDate: inventoryItem.expiryDate,
						expiryDateSource: inventoryItem.expiryDateSource,
						purchaseDate: inventoryItem.purchaseDate,
						purchasePrice: inventoryItem.purchasePrice,
						storageLocation: inventoryItem.storageLocation,
						packageStatus: inventoryItem.packageStatus,
						preparationStatus: inventoryItem.preparationStatus,
						notes: inventoryItem.notes,
						createdAt: inventoryItem.createdAt,
						updatedAt: inventoryItem.updatedAt,
					},
				];
	const totalPurchasePrice = purchaseLots.reduce(
		(total, lot) => total + (lot.purchasePrice ?? 0),
		0,
	);
	const hasSeveralLots = purchaseLots.length > 1;
	const { product } = inventoryItem;
	const isEstimated = inventoryItem.expiryDateSource === 'ESTIMATED';
	const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

	const formatPrice = (price: number): string =>
		new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);

	return (
		<div className='mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:gap-6 lg:px-12 lg:py-6'>
			<div className='flex items-center justify-between gap-3'>
				{backLink}
				<Button
					variant='secondary'
					size='icon'
					onClick={handleToggleFavorite}
					disabled={isUpdatingFavorite}
					aria-label='Favori'
					aria-pressed={inventoryItem.isFavorite}
					className={inventoryItem.isFavorite ? 'border-danger-600 text-danger-600' : undefined}>
					<Heart
						className={inventoryItem.isFavorite ? 'fill-current' : undefined}
						aria-hidden='true'
					/>
				</Button>
			</div>

			{/* ===== EN-TÊTE PRODUIT ===== */}
			<section aria-labelledby='product-title' className='card flex flex-col gap-4 p-4 sm:flex-row sm:p-5'>
				<span className='flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-50 text-brand-800 sm:size-32'>
					{product.imageUrl ? (
						<img src={product.imageUrl} alt='' className='size-full object-cover' />
					) : (
						<Package className='size-12' aria-hidden='true' />
					)}
				</span>
				<div className='flex min-w-0 flex-1 flex-col gap-3'>
					<div>
						<h1 id='product-title' className='type-h1 text-neutral-900'>
							{product.name}
						</h1>
						{product.brand && <p className='text-neutral-600'>{product.brand}</p>}
					</div>

					<ul className='flex flex-wrap gap-2 text-sm'>
						<li className='inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-900'>
							<Package className='size-4' aria-hidden='true' />
							{formatUnit(inventoryItem.quantity, product.unitType)}
						</li>
						{inventoryItem.storageLocation && (
							<li className='inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 font-medium text-neutral-900'>
								<MapPin className='size-4' aria-hidden='true' />
								{capitalize(inventoryItem.storageLocation)}
							</li>
						)}
					</ul>

					<div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
						<ExpiryBadge status={expiryStatus}>
							{formatExpiryLabel(inventoryItem.expiryDate)}
						</ExpiryBadge>
						{inventoryItem.expiryDate && (
							<p className='text-sm text-neutral-700'>
								Péremption le {formatDate(inventoryItem.expiryDate)}
								{isEstimated && <span className='text-neutral-600'> · date estimée</span>}
							</p>
						)}
					</div>
				</div>
			</section>

			<div className='grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-6'>
				<div className='flex min-w-0 flex-col gap-4 lg:gap-6'>
					{/* ===== SCORES ===== */}
					<WidgetCard title='Scores'>
						<ul className='divide-y divide-neutral-200'>
							<li className='flex items-center gap-4 pb-3'>
								{product.nutriscore ? (
									<NutriScore score={product.nutriscore} />
								) : (
									<span className='rounded-md bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700'>
										Nutri-Score inconnu
									</span>
								)}
								<p className='text-sm text-neutral-700'>{getNutriscoreText(product.nutriscore)}</p>
							</li>
							<li className='flex items-center gap-3 py-3'>
								<Leaf className='size-5 shrink-0 text-accent-700' aria-hidden='true' />
								<div className='min-w-0 flex-1'>
									<p className='font-medium text-neutral-900'>Environnement</p>
									<p className='text-sm text-neutral-600'>{getEcoscoreText(product.ecoscore)}</p>
								</div>
								<ScoreBadge type='eco' score={product.ecoscore ?? ''} size='md' />
							</li>
							<li className='flex items-center gap-3 pt-3'>
								<Beaker className='size-5 shrink-0 text-accent-700' aria-hidden='true' />
								<div className='min-w-0 flex-1'>
									<p className='font-medium text-neutral-900'>Transformation (NOVA)</p>
									<p className='text-sm text-neutral-600'>{getNovascoreText(product.novascore)}</p>
								</div>
								<ScoreBadge type='nova' score={product.novascore ?? ''} size='md' />
							</li>
						</ul>
					</WidgetCard>

					{product.nutrients && (
						<NutritionInfoCard nutrients={product.nutrients} unitType={product.unitType} />
					)}

					{product.ingredients && <IngredientsCard ingredients={product.ingredients} />}
				</div>

				<div className='flex min-w-0 flex-col gap-4 lg:gap-6'>
					{/* ===== ACHATS ===== */}
					<WidgetCard
						title='Achats'
						subtitle={
							hasSeveralLots
								? `${purchaseLots.length} lots · ${formatUnit(inventoryItem.quantity, product.unitType)} au total${
										totalPurchasePrice > 0 ? ` · ${formatPrice(totalPurchasePrice)}` : ''
									}`
								: undefined
						}>
						<ul className='flex flex-col gap-3'>
							{purchaseLots.map((lot, index) => (
								<li key={lot.id} className='rounded-md border border-neutral-200 p-3'>
									<div className='flex items-baseline justify-between gap-3'>
										<p className='font-medium text-neutral-900'>
											{hasSeveralLots ? `Lot ${index + 1}` : formatUnit(lot.quantity, product.unitType)}
											{hasSeveralLots && (
												<span className='font-normal text-neutral-600'>
													{' '}· {formatUnit(lot.quantity, product.unitType)}
												</span>
											)}
										</p>
										<p className='text-sm font-medium text-neutral-900'>
											{lot.purchasePrice !== undefined && lot.purchasePrice !== null
												? formatPrice(lot.purchasePrice)
												: 'Prix non renseigné'}
										</p>
									</div>
									<dl className='mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm'>
										<dt className='text-neutral-600'>Acheté le</dt>
										<dd className='text-neutral-900'>{formatDate(lot.purchaseDate)}</dd>
										<dt className='text-neutral-600'>Péremption</dt>
										<dd className='text-neutral-900'>
											{lot.expiryDate ? formatDate(lot.expiryDate) : 'Non renseignée'}
										</dd>
										{lot.storageLocation && (
											<>
												<dt className='text-neutral-600'>Rangement</dt>
												<dd className='text-neutral-900'>{capitalize(lot.storageLocation)}</dd>
											</>
										)}
									</dl>
								</li>
							))}
						</ul>
					</WidgetCard>

					{inventoryItem.notes && (
						<WidgetCard title='Notes'>
							<p className='whitespace-pre-line text-neutral-700'>{inventoryItem.notes}</p>
						</WidgetCard>
					)}

					{/* ===== ACTIONS ===== */}
					<div className='flex gap-3'>
						<Button variant='secondary' onClick={handleOpenEditModal} className='flex-1'>
							<PencilLine aria-hidden='true' />
							Modifier
						</Button>
						<Button variant='error' onClick={() => setIsConfirmingDelete(true)} className='flex-1'>
							<Trash2 aria-hidden='true' />
							Supprimer
						</Button>
					</div>
				</div>
			</div>

			{/* ===== MODAL DE MODIFICATION ===== */}
			<EditInventoryItemModal
				item={inventoryItem}
				isOpen={isEditModalOpen}
				onClose={handleCloseEditModal}
				onSubmit={handleUpdateProduct}
				isSubmitting={isUpdating}
			/>

			<AlertDialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Supprimer {product.name} ?</AlertDialogTitle>
						<AlertDialogDescription>
							Ce produit sera retiré de votre inventaire. Cette action est définitive.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							className={buttonVariants({ variant: 'error' })}
							disabled={isDeleting}
							onClick={(event) => {
								event.preventDefault();
								void handleDelete();
							}}>
							{isDeleting ? 'Suppression…' : 'Supprimer'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default ProductDetailPage;
