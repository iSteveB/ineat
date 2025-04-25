import {
	Product,
	Budget,
	User,
	NutriscoreHistory,
	DashboardData,
	ExpiryStatus,
	ProductWithExpiryStatus,
  ExpiryStatusType,
  NutriScore,
} from '../types/types';

import { daysFromNow, calculateExpiryStatus } from '@/utils/utils';



// Mock des produits
export const mockProducts: Product[] = [
	{
		id: '1',
		name: 'Lait demi-écrémé',
		brand: 'Candia',
		category: 'produits laitiers',
		nutriscore: 'B',
		ecoscore: 'B',
		quantity: 1,
		unit: 'L',
		expiryDate: daysFromNow(5),
		purchaseDate: daysFromNow(-3),
		price: 1.19,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '2',
		name: 'Yaourt nature',
		brand: 'Danone',
		category: 'produits laitiers',
		nutriscore: 'A',
		ecoscore: 'B',
		quantity: 4,
		unit: 'pots',
		expiryDate: daysFromNow(7),
		purchaseDate: daysFromNow(-2),
		price: 1.99,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '3',
		name: 'Steak haché 5%',
		brand: 'Charal',
		category: 'viandes',
		nutriscore: 'B',
		ecoscore: 'C',
		quantity: 2,
		unit: 'pièces',
		expiryDate: daysFromNow(5),
		purchaseDate: daysFromNow(-1),
		price: 4.95,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '4',
		name: 'Pommes Golden',
		brand: 'Producteurs locaux',
		category: 'fruits',
		nutriscore: 'A',
		ecoscore: 'A',
		quantity: 1,
		unit: 'kg',
		expiryDate: daysFromNow(10),
		purchaseDate: daysFromNow(-3),
		price: 2.39,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '5',
		name: 'Pâtes Penne',
		brand: 'Barilla',
		category: 'épicerie',
		nutriscore: 'B',
		ecoscore: 'B',
		quantity: 1,
		unit: 'paquet',
		expiryDate: daysFromNow(180),
		purchaseDate: daysFromNow(-10),
		price: 1.15,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '6',
		name: 'Pain de mie',
		brand: 'Jacquet',
		category: 'épicerie',
		nutriscore: 'C',
		ecoscore: 'C',
		quantity: 1,
		unit: 'paquet',
		expiryDate: daysFromNow(4),
		purchaseDate: daysFromNow(-5),
		price: 1.85,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '7',
		name: 'Saumon fumé',
		brand: 'Labeyrie',
		category: 'poissons',
		nutriscore: 'C',
		ecoscore: 'D',
		quantity: 1,
		unit: 'paquet',
		expiryDate: daysFromNow(3),
		purchaseDate: daysFromNow(-2),
		price: 6.95,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '8',
		name: "Jus d'orange",
		brand: 'Tropicana',
		category: 'boissons',
		nutriscore: 'C',
		ecoscore: 'C',
		quantity: 1,
		unit: 'L',
		expiryDate: daysFromNow(6),
		purchaseDate: daysFromNow(-7),
		price: 2.49,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '9',
		name: 'Haricots verts',
		brand: 'Bonduelle',
		category: 'légumes',
		nutriscore: 'A',
		ecoscore: 'B',
		quantity: 2,
		unit: 'conserves',
		expiryDate: daysFromNow(365),
		purchaseDate: daysFromNow(-15),
		price: 1.19,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '10',
		name: 'Emmental râpé',
		brand: 'Président',
		category: 'produits laitiers',
		nutriscore: 'D',
		ecoscore: 'C',
		quantity: 1,
		unit: 'sachet',
		expiryDate: daysFromNow(12),
		purchaseDate: daysFromNow(-4),
		price: 2.29,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '11',
		name: 'Tomates',
		brand: 'Producteurs locaux',
		category: 'légumes',
		nutriscore: 'A',
		ecoscore: 'A',
		quantity: 0.5,
		unit: 'kg',
		expiryDate: daysFromNow(5),
		purchaseDate: daysFromNow(-2),
		price: 1.99,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '12',
		name: 'Bananes',
		brand: 'Chiquita',
		category: 'fruits',
		nutriscore: 'A',
		ecoscore: 'C',
		quantity: 1,
		unit: 'kg',
		expiryDate: daysFromNow(4),
		purchaseDate: daysFromNow(-3),
		price: 1.79,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '13',
		name: 'Chips nature',
		brand: "Lay's",
		category: 'épicerie',
		nutriscore: 'E',
		ecoscore: 'D',
		quantity: 1,
		unit: 'paquet',
		expiryDate: daysFromNow(60),
		purchaseDate: daysFromNow(-5),
		price: 1.95,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '14',
		name: 'Chocolat noir',
		brand: 'Lindt',
		category: 'épicerie',
		nutriscore: 'D',
		ecoscore: 'C',
		quantity: 2,
		unit: 'tablettes',
		expiryDate: daysFromNow(90),
		purchaseDate: daysFromNow(-10),
		price: 2.19,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '15',
		name: 'Fromage blanc',
		brand: 'Yoplait',
		category: 'produits laitiers',
		nutriscore: 'A',
		ecoscore: 'B',
		quantity: 1,
		unit: 'pot',
		expiryDate: daysFromNow(8),
		purchaseDate: daysFromNow(-2),
		price: 1.69,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '16',
		name: 'Jambon blanc',
		brand: 'Herta',
		category: 'viandes',
		nutriscore: 'C',
		ecoscore: 'C',
		quantity: 1,
		unit: 'paquet',
		expiryDate: daysFromNow(2),
		purchaseDate: daysFromNow(-4),
		price: 2.85,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '17',
		name: 'Pâte à pizza',
		brand: 'Marie',
		category: 'plats préparés',
		nutriscore: 'C',
		ecoscore: 'C',
		quantity: 1,
		unit: 'pièce',
		expiryDate: daysFromNow(-1),
		purchaseDate: daysFromNow(-5),
		price: 2.19,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '18',
		name: 'Eau minérale',
		brand: 'Evian',
		category: 'boissons',
		nutriscore: 'A',
		ecoscore: 'C',
		quantity: 6,
		unit: 'bouteilles',
		expiryDate: daysFromNow(365),
		purchaseDate: daysFromNow(-14),
		price: 3.15,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '19',
		name: 'Céréales muesli',
		brand: 'Quaker',
		category: 'épicerie',
		nutriscore: 'B',
		ecoscore: 'B',
		quantity: 1,
		unit: 'boîte',
		expiryDate: daysFromNow(120),
		purchaseDate: daysFromNow(-20),
		price: 3.45,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '20',
		name: 'Glace vanille',
		brand: 'Häagen-Dazs',
		category: 'surgelés',
		nutriscore: 'D',
		ecoscore: 'C',
		quantity: 1,
		unit: 'pot',
		expiryDate: daysFromNow(90),
		purchaseDate: daysFromNow(-7),
		price: 4.95,
		storageLocation: 'Surgelé',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '21',
		name: 'Concombre',
		brand: 'Producteurs locaux',
		category: 'légumes',
		nutriscore: 'A',
		ecoscore: 'A',
		quantity: 1,
		unit: 'pièce',
		expiryDate: daysFromNow(6),
		purchaseDate: daysFromNow(-1),
		price: 0.99,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '22',
		name: 'Pizza surgelée',
		brand: 'Buitoni',
		category: 'surgelés',
		nutriscore: 'C',
		ecoscore: 'C',
		quantity: 2,
		unit: 'pièces',
		expiryDate: daysFromNow(120),
		purchaseDate: daysFromNow(-10),
		price: 3.99,
		storageLocation: 'Surgelé',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '23',
		name: 'Riz basmati',
		brand: "Uncle Ben's",
		category: 'épicerie',
		nutriscore: 'A',
		ecoscore: 'B',
		quantity: 1,
		unit: 'kg',
		expiryDate: daysFromNow(365),
		purchaseDate: daysFromNow(-30),
		price: 2.79,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '24',
		name: 'Beurre doux',
		brand: 'Président',
		category: 'produits laitiers',
		nutriscore: 'D',
		ecoscore: 'C',
		quantity: 1,
		unit: 'plaquette',
		expiryDate: daysFromNow(15),
		purchaseDate: daysFromNow(-5),
		price: 2.15,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '25',
		name: 'Filet de poulet',
		brand: 'Loué',
		category: 'viandes',
		nutriscore: 'A',
		ecoscore: 'B',
		quantity: 0.4,
		unit: 'kg',
		expiryDate: daysFromNow(-3),
		purchaseDate: daysFromNow(-3),
		price: 5.29,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '26',
		name: 'Crème fraîche',
		brand: 'Elle & Vire',
		category: 'produits laitiers',
		nutriscore: 'C',
		ecoscore: 'C',
		quantity: 1,
		unit: 'pot',
		expiryDate: daysFromNow(9),
		purchaseDate: daysFromNow(-2),
		price: 1.59,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '27',
		name: 'Kiwi',
		brand: 'Zespri',
		category: 'fruits',
		nutriscore: 'A',
		ecoscore: 'C',
		quantity: 4,
		unit: 'pièces',
		expiryDate: daysFromNow(7),
		purchaseDate: daysFromNow(-3),
		price: 2.99,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '28',
		name: "Huile d'olive",
		brand: 'Puget',
		category: 'épicerie',
		nutriscore: 'C',
		ecoscore: 'B',
		quantity: 1,
		unit: 'bouteille',
		expiryDate: daysFromNow(180),
		purchaseDate: daysFromNow(-45),
		price: 4.99,
		storageLocation: 'Sec',
		imageUrl: '',
		isOpen: true,
	},
	{
		id: '29',
		name: 'Poisson pané',
		brand: 'Findus',
		category: 'surgelés',
		nutriscore: 'B',
		ecoscore: 'C',
		quantity: 1,
		unit: 'boîte',
		expiryDate: daysFromNow(180),
		purchaseDate: daysFromNow(-20),
		price: 3.49,
		storageLocation: 'Surgelé',
		imageUrl: '',
		isOpen: false,
	},
	{
		id: '30',
		name: 'Œufs',
		brand: 'Loué',
		category: 'produits laitiers',
		nutriscore: 'A',
		ecoscore: 'B',
		quantity: 6,
		unit: 'pièces',
		expiryDate: daysFromNow(15),
		purchaseDate: daysFromNow(-3),
		price: 2.85,
		storageLocation: 'Frais',
		imageUrl: '',
		isOpen: false,
	},
];

// Enrichir les produits avec leur statut d'expiration
export const mockProductsWithExpiryStatus: ProductWithExpiryStatus[] =
	mockProducts.map((product) => ({
		...product,
		expiryStatus: calculateExpiryStatus(product.expiryDate),
	}));

// Mock du budget
export const mockBudget: Budget = {
	id: '1',
	userId: 'user1',
	amount: 300,
	spent: 185.42,
	periodStart: new Date(new Date().setDate(1)), // Premier jour du mois courant
	periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), // Dernier jour du mois courant
	expenses: [],
};

// Mock de l'utilisateur
export const mockUser: User = {
	id: 'user1',
	firstName: 'Sophie',
	lastName: 'Martin',
	email: 'sophie.martin@example.com',
	profileType: 'family',
	subscription: 'premium',
	preferences: {
		diet: 'omnivore',
		allergies: ['arachides'],
		dislikedIngredients: ['oignons'],
	},
};

// Mock de l'historique du Nutriscore
export const mockNutriscoreHistory: NutriscoreHistory[] = [
	{
		date: new Date(new Date().setDate(new Date().getDate() - 30)),
		score: 3.2,
	},
	{
		date: new Date(new Date().setDate(new Date().getDate() - 25)),
		score: 3.3,
	},
	{
		date: new Date(new Date().setDate(new Date().getDate() - 20)),
		score: 3.4,
	},
	{
		date: new Date(new Date().setDate(new Date().getDate() - 15)),
		score: 3.5,
	},
	{
		date: new Date(new Date().setDate(new Date().getDate() - 10)),
		score: 3.6,
	},
	{
		date: new Date(new Date().setDate(new Date().getDate() - 5)),
		score: 3.7,
	},
	{ date: new Date(), score: 3.8 },
];

// Fonction pour calculer le Nutriscore moyen actuel
export const calculateAverageNutriscore = (products: Product[]): number => {
	const nutriScoreValues: Record<NutriScore, number> = {
		A: 5,
		B: 4,
		C: 3,
		D: 2,
		E: 1,
	};

	const total = products.reduce(
		(sum, product) => sum + nutriScoreValues[product.nutriscore],
		0
	);
	return total / products.length;
};

// Fonction pour calculer la variation du Nutriscore
export const calculateNutriscoreVariation = (
	history: NutriscoreHistory[]
): number => {
	if (history.length < 2) return 0;

	const currentScore = history[history.length - 1].score;
	const previousScore = history[0].score;

	return ((currentScore - previousScore) / previousScore) * 100;
};

// Dashboard data complète
export const mockDashboardData: DashboardData = {
	user: mockUser,
	inventory: mockProducts,
	budget: mockBudget,
	nutriscoreHistory: mockNutriscoreHistory,
};

// Fonction pour obtenir les produits récemment ajoutés
export const getRecentlyAddedProducts = (
	products: Product[],
	count: number = 5
): Product[] => {
	return [...products]
		.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime())
		.slice(0, count);
};

// Fonction pour obtenir les produits qui expirent bientôt
export const getSoonExpiringProducts = (
	_products: Product[],
	count: number = 5
): ProductWithExpiryStatus[] => {
	return mockProductsWithExpiryStatus
		.filter(
			(p) =>
				p.expiryStatus === ExpiryStatus.WARNING ||
				p.expiryStatus === ExpiryStatus.CRITICAL
		)
		.sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())
		.slice(0, count);
};

// Fonction pour compter les produits par statut d'expiration
export const countProductsByExpiryStatus = (): Record<
	ExpiryStatusType,
	number
> => {
	const counts = {
		[ExpiryStatus.EXPIRED]: 0,
		[ExpiryStatus.CRITICAL]: 0,
		[ExpiryStatus.WARNING]: 0,
		[ExpiryStatus.GOOD]: 0,
	};

	mockProductsWithExpiryStatus.forEach((product) => {
		counts[product.expiryStatus]++;
	});

	return counts;
};
