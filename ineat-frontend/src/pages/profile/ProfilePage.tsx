import { Link } from '@tanstack/react-router';
import {
	Settings,
	Leaf,
	Award,
	Clock,
	TrendingUp,
	ChefHat,
	ShoppingCart,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getInitials } from '@/utils/ui-utils'; 

// TODO: Données fictives pour la démo - à remplacer par de vraies données
const mockStatistics = {
	savedMoney: 127.5,
	productsCount: 87,
	daysStreak: 14,
	wasteReduction: 75, // pourcentage
	memberSince: 'Janvier 2024',
	topCategories: ['Produits laitiers', 'Fruits & Légumes', 'Céréales'],
	nutritionalScore: 'B',
	recentProducts: [
		{
			id: '1',
			name: 'Yaourt Nature',
			date: '15/05/2025',
			expires: '22/05/2025',
		},
		{
			id: '2',
			name: 'Pain complet',
			date: '14/05/2025',
			expires: '18/05/2025',
		},
		{
			id: '3',
			name: 'Lait demi-écrémé',
			date: '12/05/2025',
			expires: '19/05/2025',
		},
	],
	recentRecipes: [
		'Salade Grecque',
		'Pâtes Carbonara',
		'Smoothie Fraise-Banane',
	],
};

const ProfilePage = () => {
	const user = useAuthStore((state) => state.user);
	const isPremium = user?.subscription === 'PREMIUM';

	//TODO: Récupérer les restrictions alimentaires (à implémenter)
	const dietaryRestrictions = ['Sans Gluten', 'Végétarien'];

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 pb-16'>
			{/* Header */}
			<div className='bg-neutral-50 pt-8 pb-12 relative shadow-sm border-b border-gray-200'>
				<div className='flex flex-col items-center space-y-4'>
					<div className='size-32 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden border-4 border-primary-100 shadow-lg'>
						{user?.avatarUrl ? (
							<img
								src={user.avatarUrl || '/placeholder.svg'}
								alt='Photo de profil'
								className='size-full object-cover'
							/>
						) : (
							<span className='text-4xl font-semibold text-neutral-50'>
								{getInitials(
									user?.firstName || '',
									user?.lastName || ''
								)}
							</span>
						)}
					</div>

					<div className='text-center'>
						<h1 className='text-3xl font-bold text-gray-900'>
							{user?.firstName} {user?.lastName}
						</h1>
						<p className='text-gray-600 mt-1'>
							Membre depuis {mockStatistics.memberSince}
						</p>

						{isPremium && (
							<Badge
								variant='outline'
								className='mt-2 bg-primary-100 border-0 text-neutral-50 px-3 py-1 shadow-md'>
								Premium
							</Badge>
						)}

						{/* Restrictions alimentaires */}
						<div className='flex justify-center gap-2 mt-3'>
							{dietaryRestrictions.map((restriction) => (
								<Badge
									key={restriction}
									variant='secondary'
									className='bg-success-50/10 text-success-50 border-0'>
									{restriction}
								</Badge>
							))}
						</div>
					</div>
				</div>

				{/* Bouton paramètres */}
				<Link
					to='/app/settings'
					className='absolute top-4 right-4 p-2 rounded-full bg-gray-50 hover:bg-gray-100 border border-gray-200 shadow-sm transition-colors'>
					<Settings className='size-5 text-gray-600' />
				</Link>
			</div>

			{/* Contenu principal */}
			<div className='px-4 py-6 space-y-6 -mt-6'>
				{/* Carte statistiques */}
				<Card className='shadow-xl border-0 bg-neutral-50'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 text-gray-900'>
							<TrendingUp className='size-5 text-success-50' />
							Mes statistiques
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='grid grid-cols-2 gap-4'>
							<div className='flex flex-col items-center p-3 bg-gray-50 rounded-lg border border-gray-100'>
								<ShoppingCart className='size-6 text-success-50 mb-1' />
								<span className='text-xl font-bold text-gray-900'>
									{mockStatistics.productsCount}
								</span>
								<span className='text-xs text-gray-600'>
									Produits enregistrés
								</span>
							</div>

							<div className='flex flex-col items-center p-3 bg-gray-50 rounded-lg border border-gray-100'>
								<Award className='size-6 text-success-50 mb-1' />
								<span className='text-xl font-bold text-gray-900'>
									{mockStatistics.daysStreak} jours
								</span>
								<span className='text-xs text-gray-600'>
									Streak d'utilisation
								</span>
							</div>
						</div>

						<div className='space-y-2'>
							<div className='flex justify-between'>
								<span className='text-sm font-medium text-gray-700'>
									Économies réalisées
								</span>
								<span className='text-sm font-bold text-success-50'>
									{mockStatistics.savedMoney.toFixed(2)} €
								</span>
							</div>

							<div className='space-y-1'>
								<div className='flex justify-between text-sm text-gray-700'>
									<span>Réduction du gaspillage</span>
									<span>
										{mockStatistics.wasteReduction}%
									</span>
								</div>
								<Progress
									value={mockStatistics.wasteReduction}
									className='h-2 [&>*]:bg-success-50' 
								/>
							</div>
						</div>

						<div className='flex items-center gap-2 justify-center mt-2 text-gray-700'>
							<Leaf className='size-5 text-success-50' />
							<span className='font-medium'>
								Impact écologique positif!
							</span>
						</div>
					</CardContent>
				</Card>

				{/* Carte Habitudes alimentaires */}
				<Card className='shadow-xl border-0 bg-neutral-50'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 text-gray-900'>
							<ChefHat className='size-5 text-success-50' />
							Habitudes alimentaires
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='space-y-2'>
							<span className='text-sm font-medium text-gray-700'>
								Catégories préférées
							</span>
							<div className='flex flex-wrap gap-2'>
								{mockStatistics.topCategories.map(
									(category) => (
										<Badge
											key={category}
											variant='outline'
											className='bg-gray-50 border border-gray-100 text-gray-700'>
											{category}
										</Badge>
									)
								)}
							</div>
						</div>

						<div className='space-y-2'>
							<div className='flex justify-between'>
								<span className='text-sm font-medium text-gray-700'>
									Nutriscore moyen
								</span>
								<div className='flex items-center'>
									<Badge
										className={`size-6 rounded-full flex items-center justify-center font-bold ${
											mockStatistics.nutritionalScore ===
											'A'
												? 'bg-emerald-600'
												: mockStatistics.nutritionalScore ===
												  'B'
												? 'bg-green-500'
												: mockStatistics.nutritionalScore ===
												  'C'
												? 'bg-yellow-500'
												: mockStatistics.nutritionalScore ===
												  'D'
												? 'bg-orange-500'
												: 'bg-red-500'
										} text-neutral-50`}>
										{mockStatistics.nutritionalScore}
									</Badge>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Carte Activités récentes */}
				<Card className='shadow-xl border-0 bg-neutral-50'>
					<CardHeader>
						<CardTitle className='flex items-center gap-2 text-gray-900'>
							<Clock className='size-5 text-success-50' />
							Activités récentes
						</CardTitle>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='space-y-2'>
							<h3 className='text-sm font-medium text-gray-700'>
								Derniers produits ajoutés
							</h3>
							<div className='space-y-2'>
								{mockStatistics.recentProducts.map(
									(product) => (
										<div
											key={product.id}
											className='flex justify-between items-center py-2 border-b border-gray-200 last:border-0 text-gray-700'>
											<span>{product.name}</span>
											<span className='text-xs text-gray-600'>
												{product.date}
											</span>
										</div>
									)
								)}
							</div>
						</div>

						<div className='space-y-2'>
							<h3 className='text-sm font-medium text-gray-700'>
								Recettes consultées
							</h3>
							<div className='flex flex-wrap gap-2'>
								{mockStatistics.recentRecipes.map((recipe) => (
									<Badge
										key={recipe}
										variant='outline'
										className='bg-gray-50 border border-gray-100 text-gray-700'>
										{recipe}
									</Badge>
								))}
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default ProfilePage;
