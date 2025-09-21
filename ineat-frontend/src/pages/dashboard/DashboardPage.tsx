import type { FC } from 'react';
import { useQuery } from '@tanstack/react-query';

import { InventoryWidget } from '@/features/inventory/components/InventoryWidget';
import NutriscoreWidget from '@/features/nutriscore/NutriscoreWidget';
import { BudgetWidget } from '@/features/budget/BudgetWidget';
import { RecentProductsWidget } from '@/features/product/RecentProductsWidget';
import { ExpiringProductsWidget } from '@/features/product/ExpiringProductsWidget';

import { inventoryService } from '@/services/inventoryService';
import { useAuthStore } from '@/stores/authStore';

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

	// ===== DONNÉES MOCKÉES CONFORMES AUX SCHÉMAS ZOD =====

	// Données Nutriscore mockées
	const nutriscoreData = {
		averageScore: 2.8, // Score numérique (A=5, B=4, C=3, D=2, E=1)
		variation: 2.7, // Variation en pourcentage depuis le mois dernier
	};

	// ===== CALCULS DÉRIVÉS =====

	// État de chargement global (pour les widgets autres que InventoryWidget)
	const isLoading = isLoadingRecent || isLoadingExpiring;

	// Gestion des erreurs
	const error = recentError || expiringError;

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

			<div className='flex flex-col gap-6'>
				<InventoryWidget />

				{/* Widget Nutriscore */}
				<NutriscoreWidget
					averageScore={nutriscoreData.averageScore}
					variation={nutriscoreData.variation}
				/>

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
