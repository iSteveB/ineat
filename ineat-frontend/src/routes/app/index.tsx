// Dashboard
import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { InventoryWidget } from '@/features/inventory/components/InventoryWidget';
import NutriscoreWidget from '@/features/nutriscore/NutriscoreWidget';
import { BudgetWidget } from '@/features/budget/BudgetWidget';
import { RecentProductsWidget } from '@/features/product/RecentProductsWidget';
import { ExpiringProductsWidget } from '@/features/product/ExpiringProductsWidget';
import { inventoryService } from '@/services/inventoryService';
import { createFileRoute } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';

export const Route = createFileRoute('/app/')({
	component: () => <Dashboard />,
});

const Dashboard: FC = () => {

	const { user } = useAuthStore();

	// Récupération des produits récents (5 derniers)
	const {
		data: recentProducts = [],
		isLoading: isLoadingRecent,
		error: recentError,
	} = useQuery({
		queryKey: ['recentProducts'],
		queryFn: () => inventoryService.getRecentProducts(5),
	});

	// Récupération des produits qui expirent dans les 7 prochains jours
	const {
		data: expiringProducts = [],
		isLoading: isLoadingExpiring,
		error: expiringError,
	} = useQuery({
		queryKey: ['expiringProducts'],
		queryFn: () => inventoryService.getInventory({ expiringWithinDays: 7 }),
	});

	// Récupération des statistiques d'inventaire
	const {
		data: inventoryStats,
		isLoading: isLoadingStats,
		error: statsError,
	} = useQuery({
		queryKey: ['inventoryStats'],
		queryFn: () => inventoryService.getInventoryStats(),
	});

	// Récupération de l'inventaire complet pour calculer les statistiques
	const {
		data: fullInventory = [],
		isLoading: isLoadingInventory,
		error: inventoryError,
	} = useQuery({
		queryKey: ['fullInventory'],
		queryFn: () => inventoryService.getInventory(),
	});

	// Calcul des données dérivées
	const isLoading =
		isLoadingRecent ||
		isLoadingExpiring ||
		isLoadingStats ||
		isLoadingInventory;
	const error = recentError || expiringError || statsError || inventoryError;

	// Calcul des statistiques Nutriscore
	const nutriscoreData = {
		averageScore: 2.8, // Score numérique (A=5, B=4, C=3, D=2, E=1)
		variation: 2.5, // Variation en pourcentage depuis le mois dernier
	};

	// Données de budget mockées temporairement (à remplacer par un service budget)
	const budget = {
		id: 'mock-budget-id',
		userId: 'mock-user-id',
		amount: 400, // Budget total du mois
		spent: 250, // Montant déjà dépensé (calculé depuis expenses)
		periodStart: new Date(
			new Date().getFullYear(),
			new Date().getMonth(),
			1
		), // 1er du mois
		periodEnd: new Date(
			new Date().getFullYear(),
			new Date().getMonth() + 1,
			0
		), // Dernier jour du mois
		expenses: [
			{
				id: 'expense-1',
				userId: 'mock-user-id',
				amount: 45.5,
				budgetId: 'mock-budget-id',
				date: new Date('2025-06-15'),
				source: 'Supermarché',
				receiptId: 'receipt-1',
			},
			{
				id: 'expense-2',
				userId: 'mock-user-id',
				amount: 120.3,
				budgetId: 'mock-budget-id',
				date: new Date('2025-06-10'),
				source: 'Marché',
			},
			{
				id: 'expense-3',
				userId: 'mock-user-id',
				amount: 84.2,
				budgetId: 'mock-budget-id',
				date: new Date('2025-06-05'),
				source: 'Épicerie',
			},
		],
	};

	// Données utilisateur mockées temporairement (à remplacer par un service user)

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

	return (
		<div className='p-6 bg-neutral-100 min-h-screen lg:max-w-2/3 2xl:max-w-1/2 lg:m-auto'>
			<header className='mb-8'>
				<h1 className='text-3xl font-bold text-neutral-300'>
					Bonjour {user?.firstName || 'Utilisateur'},
				</h1>
				<p className='text-neutral-300/70'>
					Bienvenue sur votre tableau de bord InEat
				</p>
			</header>

			<div className='grid grid-cols-2 gap-6 mb-8'>
				{/* Première rangée de widgets */}
				<InventoryWidget
					totalProducts={
						inventoryStats?.totalItems || fullInventory.length
					}
					soonExpiringCount={Math.max(
						0,
						expiringProducts.length -
							(inventoryStats?.expiringInWeek ?? 0)
					)}
					criticalCount={inventoryStats?.expiringInWeek || 0}
					expiredCount={0} // À calculer depuis fullInventory
				/>

				<NutriscoreWidget
					averageScore={nutriscoreData.averageScore}
					variation={nutriscoreData.variation}
				/>
			</div>

			<div className='mb-8'>
				<BudgetWidget budget={budget} />
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				{/* Deuxième rangée de widgets */}
				<RecentProductsWidget products={recentProducts} />
				<ExpiringProductsWidget products={expiringProducts} />
			</div>
		</div>
	);
};

export default Dashboard;
