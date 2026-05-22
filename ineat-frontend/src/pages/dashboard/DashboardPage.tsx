import type { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
	ArrowRight,
	PackagePlus,
	ReceiptText,
	ScanLine,
	TriangleAlert,
} from 'lucide-react';

import { InventoryWidget } from '@/features/inventory/InventoryWidget';
import ScoreWidget from '@/features/score/ScoreWidget';
import { BudgetWidget } from '@/features/budget/BudgetWidget';
import { RecentProductsWidget } from '@/features/product/RecentProductsWidget';
import { ExpiringProductsWidget } from '@/features/product/ExpiringProductsWidget';
import { Button } from '@/components/ui/button';

import { inventoryService } from '@/services/inventoryService';
import { useAuthStore } from '@/stores/authStore';

type DashboardAction = {
	title: string;
	description: string;
	to: '/app/inventory' | '/app/inventory/add';
	tone: 'danger' | 'warning' | 'empty' | 'normal';
};

const Dashboard: FC = () => {
	const { user } = useAuthStore();

	// ===== RÉCUPÉRATION DES DONNÉES =====

	// Récupération de l'inventaire complet pour le ScoreWidget
	const {
		data: scoreInventory = [],
		isLoading: isLoadingInventory,
		error: inventoryError,
	} = useQuery({
		queryKey: ['dashboardScoreInventory'],
		queryFn: () => inventoryService.getInventory({ limit: 100 }),
		staleTime: 5 * 60 * 1000,
	});

	const {
		data: inventoryStats,
		isLoading: isLoadingStats,
		error: statsError,
	} = useQuery({
		queryKey: ['inventoryStats'],
		queryFn: () => inventoryService.getInventoryStats(),
		staleTime: 2 * 60 * 1000,
	});

	// Récupération des produits récents (5 derniers)
	const {
		data: recentProducts = [],
		isLoading: isLoadingRecent,
		error: recentError,
	} = useQuery({
		queryKey: ['recentProducts'],
		queryFn: () => inventoryService.getRecentProducts(5),
		staleTime: 60 * 1000,
	});

	// Récupération des produits qui expirent dans les 7 prochains jours
	const {
		data: expiringProducts = [],
		isLoading: isLoadingExpiring,
		error: expiringError,
	} = useQuery({
		queryKey: ['expiringProducts'],
		queryFn: () =>
			inventoryService.getInventory({ expiringWithinDays: 7, limit: 20 }),
		staleTime: 60 * 1000,
	});

	// ===== CALCULS DÉRIVÉS =====

	// État de chargement global
	const isLoading =
		isLoadingInventory || isLoadingStats || isLoadingRecent || isLoadingExpiring;

	// Gestion des erreurs
	const error = inventoryError || statsError || recentError || expiringError;
	const totalInventoryItems = inventoryStats?.totalItems ?? scoreInventory.length;

	const priorityAction: DashboardAction =
		expiringProducts.length > 0
			? {
					title: `${expiringProducts.length} produit${expiringProducts.length > 1 ? 's' : ''} à traiter`,
					description:
						'Commencez par consommer, déplacer ou retirer les produits qui expirent bientôt.',
					to: '/app/inventory',
					tone: 'warning',
				}
			: totalInventoryItems === 0
				? {
						title: 'Inventaire vide',
						description:
							'Ajoutez votre premier produit pour activer les alertes et le budget alimentaire.',
						to: '/app/inventory/add',
						tone: 'empty',
					}
				: {
						title: 'Inventaire à jour',
						description:
							'Ajoutez vos derniers achats ou importez un ticket pour garder le stock fiable.',
						to: '/app/inventory/add',
						tone: 'normal',
					};

	const actionToneClasses = {
		danger: 'border-red-200 bg-red-50 text-red-800',
		warning: 'border-orange-200 bg-orange-50 text-orange-800',
		empty: 'border-blue-200 bg-blue-50 text-blue-800',
		normal: 'border-emerald-200 bg-emerald-50 text-emerald-800',
	}[priorityAction.tone];

	// ===== GESTION DES ÉTATS =====

	if (isLoading) {
		return (
			<div className='flex justify-center items-center h-screen'>
				<div className='animate-spin rounded-full size-12 border-t-4 border-b-4 border-info-500'></div>
			</div>
		);
	}

	if (error) {
		return (
			<div className='bg-neutral-50 rounded-lg shadow-md p-6 text-center'>
				<p className='text-error-100'>
					Impossible de charger les données du tableau de bord.
				</p>
				<p className='text-error-50 text-sm mt-2'>
					{error instanceof Error ? error.message : 'Erreur inconnue'}
				</p>
				<button
					className='mt-4 px-4 py-2 bg-primary-100 text-neutral-50 rounded hover:bg-primary-100/80'
					onClick={() => window.location.reload()}>
					Réessayer
				</button>
			</div>
		);
	}

	// ===== RENDU DU DASHBOARD =====

	return (
		<div className='p-6 bg-neutral-100 min-h-screen lg:max-w-2/3 2xl:max-w-1/2 lg:m-auto'>
			{/* ===== HEADER ===== */}
			<header className='mb-8'>
				<h1 className='text-3xl font-bold text-neutral-300'>
					Bonjour {user?.firstName || 'Utilisateur'},
				</h1>
				<p className='text-neutral-300/70'>
					Bienvenue sur votre tableau de bord InEat
				</p>
			</header>

			<section
				className='mb-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 shadow-sm'
				aria-labelledby='dashboard-priority-title'>
				<div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
					<div className='space-y-3'>
						<div
							className={`inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm font-medium ${actionToneClasses}`}>
							<TriangleAlert className='size-4' />
							<span id='dashboard-priority-title'>
								{priorityAction.title}
							</span>
						</div>
						<p className='max-w-2xl text-sm text-neutral-700'>
							{priorityAction.description}
						</p>
						<div className='grid grid-cols-3 gap-2 text-sm sm:max-w-md'>
							<div className='rounded-md bg-neutral-100 px-3 py-2'>
								<p className='font-semibold text-neutral-900'>
									{totalInventoryItems}
								</p>
								<p className='text-xs text-neutral-600'>
									en stock
								</p>
							</div>
							<div className='rounded-md bg-neutral-100 px-3 py-2'>
								<p className='font-semibold text-neutral-900'>
									{expiringProducts.length}
								</p>
								<p className='text-xs text-neutral-600'>
									à consommer
								</p>
							</div>
							<div className='rounded-md bg-neutral-100 px-3 py-2'>
								<p className='font-semibold text-neutral-900'>
									{recentProducts.length}
								</p>
								<p className='text-xs text-neutral-600'>
									récents
								</p>
							</div>
						</div>
					</div>

					<div className='grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[420px]'>
						<Button asChild>
							<Link to={priorityAction.to}>
								<ArrowRight className='size-4' />
								Agir maintenant
							</Link>
						</Button>
						<Button asChild variant='outline'>
							<Link to='/app/inventory/add/scan'>
								<ScanLine className='size-4' />
								Scanner
							</Link>
						</Button>
						<Button asChild variant='outline'>
							<Link to='/app/inventory/add/receipt'>
								<ReceiptText className='size-4' />
								Ticket
							</Link>
						</Button>
						<Button
							asChild
							variant='secondary'
							className='sm:col-span-3'>
							<Link to='/app/inventory/add'>
								<PackagePlus className='size-4' />
								Ajouter un produit
							</Link>
						</Button>
					</div>
				</div>
			</section>

			<div className='flex flex-col gap-6'>
				<InventoryWidget
					totalProducts={inventoryStats?.totalItems}
					soonExpiringCount={
						(inventoryStats?.expiryBreakdown.critical ?? 0) +
						(inventoryStats?.expiryBreakdown.warning ?? 0)
					}
					criticalCount={inventoryStats?.expiryBreakdown.critical}
					expiredCount={inventoryStats?.expiryBreakdown.expired}
				/>

				{/* Widget Score avec données réelles */}
				<ScoreWidget inventory={scoreInventory} />

				{/* Widget Budget */}
				<BudgetWidget />

				{/* Widget Produits récents */}
				<RecentProductsWidget products={recentProducts} />

				{/* Widget Produits qui expirent */}
				<ExpiringProductsWidget products={expiringProducts} />
			</div>
		</div>
	);
};

export default Dashboard;
