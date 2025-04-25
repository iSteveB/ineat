// Dashboard
import { FC } from 'react';
import { InventoryWidget } from '@/features/inventory/InventoryWidget';
import NutriscoreWidget from '@/features/nutriscore/NutriscoreWidget';
import { BudgetWidget } from '@/features/budget/BudgetWidget';
import { RecentProductsWidget } from '@/features/product/RecentProductsWidget';
import { ExpiringProductsWidget } from '@/features/product/ExpiringProductsWidget';
import { useDashboardData } from '@/hooks/useDashboardData';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/app/')({
  component: () => <Dashboard />,
})

const Dashboard: FC = () => {
	const {
		isLoading,
		error,
		dashboardData,
		expiryCounts,
		nutriscoreData,
		budget,
		recentProducts,
		expiringProducts,
		refreshData,
	} = useDashboardData();

	if (isLoading) {
		return (
			<div className='flex justify-center items-center h-screen'>
				<div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500'></div>
			</div>
		);
	}

	if (error || !budget || !dashboardData) {
		return (
			<div className='bg-white rounded-lg shadow-md p-6 text-center'>
				<p className='text-red-500'>
					{error
						? error.message
						: 'Impossible de charger les données du tableau de bord.'}
				</p>
				<button
					className='mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
					onClick={refreshData}>
					Réessayer
				</button>
			</div>
		);
	}

	return (
		<div className='p-6 bg-gray-100 min-h-screen'>
			<header className='mb-8'>
				<h1 className='text-3xl font-bold text-gray-800'>
					Bonjour {dashboardData.user.firstName},
				</h1>
				<p className='text-gray-600'>
					Bienvenue sur votre tableau de bord InEat
				</p>
			</header>

			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8'>
				{/* Première rangée de widgets */}
				<InventoryWidget
					totalProducts={expiryCounts.total}
					soonExpiringCount={expiryCounts.soon}
					criticalCount={expiryCounts.critical}
					expiredCount={expiryCounts.expired}
				/>

				<NutriscoreWidget
					averageScore={nutriscoreData.average}
					variation={nutriscoreData.variation}
				/>

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