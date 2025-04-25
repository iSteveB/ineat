import { useState, useEffect } from 'react';
import {
	DashboardData,
	ProductWithExpiryStatus,
	ExpiryStatus,
	Budget,
	NutriscoreHistory,
} from '@/types/types';
import {
	mockDashboardData,
	mockProductsWithExpiryStatus,
	getRecentlyAddedProducts,
	getSoonExpiringProducts,
	countProductsByExpiryStatus,
	calculateAverageNutriscore,
	calculateNutriscoreVariation,
} from '@/data/mockData';

interface DashboardDataHook {
	dashboardData: DashboardData | null;
	isLoading: boolean;
	error: Error | null;
	recentProducts: ProductWithExpiryStatus[];
	expiringProducts: ProductWithExpiryStatus[];
	expiryCounts: {
		total: number;
		soon: number;
		critical: number;
		expired: number;
	};
	nutriscoreData: {
		average: number;
		variation: number;
	};
	budget: Budget | null;
	nutriscoreHistory: NutriscoreHistory[];
	refreshData: () => Promise<void>;
}

export const useDashboardData = (): DashboardDataHook => {
	const [dashboardData, setDashboardData] = useState<DashboardData | null>(
		null
	);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);
	const [recentProducts, setRecentProducts] = useState<
		ProductWithExpiryStatus[]
	>([]);
	const [expiringProducts, setExpiringProducts] = useState<
		ProductWithExpiryStatus[]
	>([]);
	const [expiryCounts, setExpiryCounts] = useState<{
		total: number;
		soon: number;
		critical: number;
		expired: number;
	}>({ total: 0, soon: 0, critical: 0, expired: 0 });
	const [nutriscoreData, setNutriscoreData] = useState<{
		average: number;
		variation: number;
	}>({ average: 0, variation: 0 });
	const [budget, setBudget] = useState<Budget | null>(null);
	const [nutriscoreHistory, setNutriscoreHistory] = useState<
		NutriscoreHistory[]
	>([]);

	const fetchData = async (): Promise<void> => {
		setIsLoading(true);
		setError(null);

		try {
			// Simuler un appel réseau
			await new Promise((resolve) => setTimeout(resolve, 800));

			// Dans la véritable application, l'appel API se fera ici
			// const response = await apiClient.fetch<DashboardData>('/api/dashboard');
			// const data = response.data;

			// Utiliser les données mockées pour notre exemple
			const data = {
				...mockDashboardData,
				// Utiliser mockProductsWithExpiryStatus au lieu de mockProducts
				inventory: mockProductsWithExpiryStatus,
			};

			setDashboardData(data);
			setBudget(data.budget);
			setNutriscoreHistory(data.nutriscoreHistory);

			// Traiter les données pour les widgets
			// Utiliser directement mockProductsWithExpiryStatus pour éviter les conversions
			const recent = getRecentlyAddedProducts(
				mockProductsWithExpiryStatus,
				3
			) as ProductWithExpiryStatus[];
			setRecentProducts(recent);

			const expiring = getSoonExpiringProducts(
				mockProductsWithExpiryStatus,
				5
			);
			setExpiringProducts(expiring);

			const expiryCountsData = countProductsByExpiryStatus();
			setExpiryCounts({
				total: mockProductsWithExpiryStatus.length,
				soon: expiryCountsData[ExpiryStatus.WARNING],
				critical: expiryCountsData[ExpiryStatus.CRITICAL],
				expired: expiryCountsData[ExpiryStatus.EXPIRED],
			});

			const avgScore = calculateAverageNutriscore(
				mockProductsWithExpiryStatus
			);
			const variation = calculateNutriscoreVariation(
				data.nutriscoreHistory
			);
			setNutriscoreData({
				average: avgScore,
				variation: variation,
			});
		} catch (err) {
			console.error(
				'Erreur lors du chargement des données du dashboard:',
				err
			);
			setError(
				err instanceof Error
					? err
					: new Error('Une erreur inconnue est survenue')
			);
		} finally {
			setIsLoading(false);
		}
	};

	// Charger les données au montage du composant
	useEffect(() => {
		fetchData();
	}, []);

	return {
		dashboardData,
		isLoading,
		error,
		recentProducts,
		expiringProducts,
		expiryCounts,
		nutriscoreData,
		budget,
		nutriscoreHistory,
		refreshData: fetchData,
	};
};
