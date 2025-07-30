// Dashboard
import { FC } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

// ===== IMPORTS SCHÉMAS ZOD =====
import {
	InventoryStats,
} from '@/schemas';

// ===== IMPORTS COMPOSANTS =====
import { InventoryWidget } from '@/features/inventory/components/InventoryWidget';
import NutriscoreWidget from '@/features/nutriscore/NutriscoreWidget';
import { BudgetWidget } from '@/features/budget/BudgetWidget';
import { RecentProductsWidget } from '@/features/product/RecentProductsWidget';
import { ExpiringProductsWidget } from '@/features/product/ExpiringProductsWidget';

// ===== IMPORTS SERVICES ET STORES =====
import { inventoryService } from '@/services/inventoryService';
import { useAuthStore } from '@/stores/authStore';

// ===== DÉFINITION DE LA ROUTE =====
export const Route = createFileRoute('/app/')({
	component: () => <Dashboard />,
});

// ===== COMPOSANT DASHBOARD =====
const Dashboard: FC = () => {
	const { user } = useAuthStore();

	// ===== RÉCUPÉRATION DES DONNÉES =====

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

	// ===== DONNÉES MOCKÉES CONFORMES AUX SCHÉMAS ZOD =====

	// Données Nutriscore mockées
	const nutriscoreData = {
		averageScore: 2.8, // Score numérique (A=5, B=4, C=3, D=2, E=1)
		variation: 2.5, // Variation en pourcentage depuis le mois dernier
	};

	// ===== CALCULS DÉRIVÉS =====

	// État de chargement global
	const isLoading =
		isLoadingRecent ||
		isLoadingExpiring ||
		isLoadingStats ||
		isLoadingInventory;

	// Gestion des erreurs
	const error = recentError || expiringError || statsError || inventoryError;

	// Calcul des statistiques d'inventaire par défaut si non disponibles
	const defaultInventoryStats: InventoryStats = {
		totalItems: fullInventory.length,
		totalValue: 0,
		totalQuantity: 0,
		averageItemValue: 0,
		expiryBreakdown: {
			good: 0,
			warning: 0,
			critical: 0,
			expired: 0,
			unknown: 0,
		},
		categoryBreakdown: [],
		storageBreakdown: {},
		recentActivity: {
			itemsAddedThisWeek: 0,
			itemsConsumedThisWeek: 0,
		},
	};

	// Fonction utilitaire pour s'assurer que les stats d'inventaire sont conformes
	const ensureValidInventoryStats = (stats: unknown): InventoryStats => {
		if (!stats || typeof stats !== 'object') {
			return defaultInventoryStats;
		}

		const statsObj = stats as Record<string, unknown>;

		// Validation type-safe de l'expiryBreakdown
		const validateExpiryBreakdown = (breakdown: unknown) => {
			if (!breakdown || typeof breakdown !== 'object') {
				return defaultInventoryStats.expiryBreakdown;
			}

			const breakdownObj = breakdown as Record<string, unknown>;
			return {
				good:
					typeof breakdownObj.good === 'number'
						? breakdownObj.good
						: 0,
				warning:
					typeof breakdownObj.warning === 'number'
						? breakdownObj.warning
						: 0,
				critical:
					typeof breakdownObj.critical === 'number'
						? breakdownObj.critical
						: 0,
				expired:
					typeof breakdownObj.expired === 'number'
						? breakdownObj.expired
						: 0,
				unknown:
					typeof breakdownObj.unknown === 'number'
						? breakdownObj.unknown
						: 0,
			};
		};

		// Validation type-safe de recentActivity
		const validateRecentActivity = (activity: unknown) => {
			if (!activity || typeof activity !== 'object') {
				return defaultInventoryStats.recentActivity;
			}

			const activityObj = activity as Record<string, unknown>;
			return {
				itemsAddedThisWeek:
					typeof activityObj.itemsAddedThisWeek === 'number'
						? activityObj.itemsAddedThisWeek
						: 0,
				itemsConsumedThisWeek:
					typeof activityObj.itemsConsumedThisWeek === 'number'
						? activityObj.itemsConsumedThisWeek
						: 0,
				averageDaysToConsumption:
					typeof activityObj.averageDaysToConsumption === 'number'
						? activityObj.averageDaysToConsumption
						: undefined,
			};
		};

		return {
			totalItems:
				typeof statsObj.totalItems === 'number'
					? statsObj.totalItems
					: defaultInventoryStats.totalItems,
			totalValue:
				typeof statsObj.totalValue === 'number'
					? statsObj.totalValue
					: defaultInventoryStats.totalValue,
			totalQuantity:
				typeof statsObj.totalQuantity === 'number'
					? statsObj.totalQuantity
					: defaultInventoryStats.totalQuantity,
			averageItemValue:
				typeof statsObj.averageItemValue === 'number'
					? statsObj.averageItemValue
					: defaultInventoryStats.averageItemValue,
			expiryBreakdown: validateExpiryBreakdown(statsObj.expiryBreakdown),
			categoryBreakdown: Array.isArray(statsObj.categoryBreakdown)
				? statsObj.categoryBreakdown
				: defaultInventoryStats.categoryBreakdown,
			storageBreakdown:
				statsObj.storageBreakdown &&
				typeof statsObj.storageBreakdown === 'object'
					? (statsObj.storageBreakdown as Record<
							string,
							{ count: number; percentage: number }
					  >)
					: defaultInventoryStats.storageBreakdown,
			recentActivity: validateRecentActivity(statsObj.recentActivity),
		};
	};

	const currentInventoryStats = ensureValidInventoryStats(inventoryStats);

	// ===== CALCULS DÉRIVÉS =====

// Utiliser directement les statistiques de l'API
const criticalCount = currentInventoryStats.expiryBreakdown.critical;
const warningCount = currentInventoryStats.expiryBreakdown.warning;
const expiredCount = currentInventoryStats.expiryBreakdown.expired;
const soonExpiringCount = criticalCount + warningCount;

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

			{/* ===== PREMIÈRE RANGÉE DE WIDGETS ===== */}
			<div className='grid grid-cols-2 gap-6 mb-8'>
				<InventoryWidget
					totalProducts={currentInventoryStats.totalItems}
					soonExpiringCount={soonExpiringCount}
					criticalCount={criticalCount}
					expiredCount={expiredCount}
				/>

				<NutriscoreWidget
					averageScore={nutriscoreData.averageScore}
					variation={nutriscoreData.variation}
				/>
			</div>

			{/* ===== WIDGET BUDGET ===== */}
			<div className='mb-8'>
				<BudgetWidget />
			</div>

			{/* ===== DEUXIÈME RANGÉE DE WIDGETS ===== */}
			<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
				<RecentProductsWidget products={recentProducts} />
				<ExpiringProductsWidget products={expiringProducts} />
			</div>
		</div>
	);
};

export default Dashboard;
