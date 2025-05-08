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
});

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
				<div className='animate-spin rounded-full size-12 border-t-4 border-b-4 border-info-500'></div>
			</div>
		);
	}

	if (error || !budget || !dashboardData) {
		return (
			<div className='bg-neutral-50 rounded-lg shadow-md p-6 text-center'>
				<p className='text-error-100'>
					{error
						? error.message
						: 'Impossible de charger les données du tableau de bord.'}
				</p>
				<button
					className='mt-4 px-4 py-2 border-primary-100 text-neutral-50 rounded hover:bg-primary-100/50'
					onClick={refreshData}>
					Réessayer
				</button>
			</div>
		);
	}

	return (
		<div className='p-6 bg-neutral-100 min-h-screen lg:max-w-2/3 2xl:max-w-1/2 lg:m-auto'>
			<header className='mb-8'>
				<h1 className='text-3xl font-bold text-neutral-300'>
					Bonjour {dashboardData.user.firstName},
				</h1>
				<p className='text-neutral-300/70'>
					Bienvenue sur votre tableau de bord InEat
				</p>
			</header>

			<div className='grid grid-cols-2 gap-6 mb-8'>
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
