import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import {
	ArrowDownRight,
	ArrowRight,
	ArrowUpRight,
	BookMarked,
	CheckCircle2,
	ChefHat,
	CreditCard,
	Settings,
	Sparkles,
	Target,
	Utensils,
	WandSparkles,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getDietaryLabel } from '@/constants/dietary';
import { ProfileInsights, userService } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import { getInitials } from '@/utils/ui-utils';

const goalLabels = {
	REDUCE_WASTE: 'Réduire le gaspillage',
	SAVE_MONEY: 'Économiser',
	EAT_BETTER: 'Mieux manger',
	FIND_MEAL_IDEAS: 'Trouver des idées de repas',
} as const;

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 2,
});

const formatMonth = (month: string, style: 'short' | 'long' = 'short') =>
	new Intl.DateTimeFormat('fr-FR', {
		month: style,
		timeZone: 'UTC',
	}).format(new Date(`${month}-01T00:00:00.000Z`));

function SpendingChart({ data }: { data: ProfileInsights['spendingTrend'] }) {
	const width = 600;
	const height = 190;
	const padding = { top: 24, right: 24, bottom: 42, left: 24 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;
	const maximum = Math.max(...data.map((point) => point.total), 1);
	const points = data.map((point, index) => ({
		...point,
		x: padding.left + (chartWidth * index) / Math.max(data.length - 1, 1),
		y: padding.top + chartHeight - (point.total / maximum) * chartHeight,
	}));
	const path = points
		.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
		.join(' ');

	return (
		<div>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				className='h-auto w-full'
				role='img'
				aria-label='Dépenses mensuelles des six derniers mois'>
				{[0, 1, 2, 3].map((line) => {
					const y = padding.top + (chartHeight * line) / 3;
					return (
						<line
							key={line}
							x1={padding.left}
							x2={width - padding.right}
							y1={y}
							y2={y}
					className='stroke-gray-200'
							strokeWidth='1'
						/>
					);
				})}
				<path
					d={path}
					fill='none'
					className='stroke-success-50'
					strokeWidth='3'
					strokeLinecap='round'
					strokeLinejoin='round'
				/>
				{points.map((point) => (
					<g key={point.month}>
						<circle
							cx={point.x}
							cy={point.y}
							r='5'
							className='fill-success-50 stroke-white'
							strokeWidth='2'>
							<title>{`${formatMonth(point.month, 'long')} : ${currencyFormatter.format(point.total)}`}</title>
						</circle>
						<text
							x={point.x}
							y={height - 12}
							textAnchor='middle'
							className='fill-neutral-600 text-[13px] capitalize'>
							{formatMonth(point.month)}
						</text>
					</g>
				))}
			</svg>
			<ul className='sr-only'>
				{data.map((point) => (
					<li key={point.month}>{`${formatMonth(point.month, 'long')} : ${currencyFormatter.format(point.total)}`}</li>
				))}
			</ul>
		</div>
	);
}

const ProfilePage = () => {
	const user = useAuthStore((state) => state.user);
	const insightsQuery = useQuery({
		queryKey: ['profile', 'insights'],
		queryFn: userService.getProfileInsights,
	});
	const insights = insightsQuery.data;
	const restrictions = [
		...(user?.preferences?.allergens ?? []),
		...(user?.preferences?.diets ?? []),
	];
	const currentMonth = insights?.spendingTrend.at(-1);
	const previousMonth = insights?.spendingTrend.at(-2);
	const spendingChange =
		currentMonth && previousMonth && previousMonth.total > 0
			? ((currentMonth.total - previousMonth.total) / previousMonth.total) * 100
			: null;
	const planLabel = user?.effectivePlan === 'PREMIUM' ? 'Premium' : 'Gratuit';
	const hasSpending = insights?.spendingTrend.some((point) => point.total > 0);

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 pb-16'>
			<div className='mx-auto max-w-5xl space-y-6 px-4 py-8'>
				<section className='relative rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8'>
					<Link
						to='/app/settings'
						aria-label='Ouvrir les paramètres'
						className='absolute right-4 top-4 rounded-full border border-neutral-200 p-2 text-neutral-600 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-50'>
						<Settings className='size-5' />
					</Link>
					<div className='flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left'>
						<div className='flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-2xl font-semibold text-white'>
							{user?.avatarUrl ? (
								<img
									src={user.avatarUrl}
									alt='Photo de profil'
									className='size-full object-cover'
								/>
							) : (
								getInitials(user?.firstName ?? '', user?.lastName ?? '')
							)}
						</div>
						<div>
							<h1 className='text-3xl font-bold text-neutral-900'>
								{user?.firstName} {user?.lastName}
							</h1>
							<p className='mt-1 text-neutral-500'>{user?.email}</p>
							<Badge className='mt-3 text-white'>{planLabel}</Badge>
						</div>
					</div>
				</section>

				<section aria-labelledby='recipe-stats-title'>
					<div className='mb-3 flex items-center gap-2'>
						<ChefHat className='size-5 text-success-50' />
						<h2 id='recipe-stats-title' className='text-xl font-semibold'>
							Mes recettes
						</h2>
					</div>
					<div className='grid gap-4 sm:grid-cols-2'>
						{[
							{
								label: 'Recettes enregistrées',
								value: insights?.recipes.saved,
								icon: BookMarked,
							},
							{
								label: 'Recettes réalisées',
								value: insights?.recipes.completed,
								icon: CheckCircle2,
							},
						].map((stat) => (
							<Link
								key={stat.label}
								to='/app/recipes'
								className='group rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-success-50/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-50'>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-3'>
										<div className='rounded-lg bg-success-50/20 p-3 text-success-50'>
											<stat.icon className='size-5' />
										</div>
										<div>
											<p className='text-3xl font-bold text-neutral-900'>
												{insightsQuery.isLoading ? '…' : (stat.value ?? 0)}
											</p>
											<p className='text-sm text-neutral-500'>{stat.label}</p>
										</div>
									</div>
									<ArrowRight className='size-5 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-success-50' />
								</div>
							</Link>
						))}
					</div>
					{insightsQuery.isError && (
						<p className='mt-3 text-sm text-error-100'>
							Les statistiques de recettes sont temporairement indisponibles.
						</p>
					)}
				</section>

				<div className='grid gap-6 lg:grid-cols-2'>
					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<Sparkles className='size-5 text-success-50' />
								Ma personnalisation
							</CardTitle>
						</CardHeader>
						<CardContent className='divide-y divide-neutral-200 p-0'>
							<Link
								to='/app/settings/personal-info'
								className='group flex items-center justify-between px-6 py-4 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success-50'>
								<div className='flex items-center gap-3'>
									<Utensils className='size-5 text-neutral-500' />
									<div>
										<p className='text-sm text-neutral-500'>Nombre de couverts</p>
										<p className='font-medium'>{user?.defaultServings ?? 4}</p>
									</div>
								</div>
								<ArrowRight className='size-4 text-neutral-400 group-hover:text-success-50' />
							</Link>
							<Link
								to='/app/settings/personal-info'
								className='group flex items-center justify-between px-6 py-4 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success-50'>
								<div className='flex items-center gap-3'>
									<Target className='size-5 text-neutral-500' />
									<div>
										<p className='text-sm text-neutral-500'>Objectif principal</p>
										<p className='font-medium'>
											{user?.primaryGoal
												? goalLabels[user.primaryGoal]
												: 'À définir'}
										</p>
									</div>
								</div>
								<ArrowRight className='size-4 text-neutral-400 group-hover:text-success-50' />
							</Link>
							<Link
								to='/app/settings/diet-restrictions'
								className='group flex items-center justify-between px-6 py-4 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success-50'>
								<div>
									<p className='text-sm text-neutral-500'>Allergies et régimes</p>
									<div className='mt-1 flex flex-wrap gap-1.5'>
										{restrictions.length > 0 ? (
											restrictions.map((restriction) => (
												<Badge key={restriction} variant='secondary'>
													{getDietaryLabel(restriction)}
												</Badge>
											))
										) : (
											<span className='font-medium'>Aucune restriction</span>
										)}
									</div>
								</div>
								<ArrowRight className='size-4 shrink-0 text-neutral-400 group-hover:text-success-50' />
							</Link>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className='flex items-center gap-2'>
								<CreditCard className='size-5 text-success-50' />
								Formule et quotas
							</CardTitle>
						</CardHeader>
						<CardContent className='divide-y divide-neutral-200 p-0'>
							<Link
								to='/app/subscription'
								className='group flex items-center justify-between px-6 py-4 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success-50'>
								<div>
									<p className='text-sm text-neutral-500'>Formule actuelle</p>
									<p className='font-semibold'>{planLabel}</p>
								</div>
								<ArrowRight className='size-4 text-neutral-400 group-hover:text-success-50' />
							</Link>
							<Link
								to='/app/recipes/suggestions'
								className='group flex items-center justify-between px-6 py-4 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success-50'>
								<div className='flex items-center gap-3'>
									<WandSparkles className='size-5 text-neutral-500' />
									<div>
										<p className='text-sm text-neutral-500'>Générations IA restantes</p>
										<p className='font-semibold'>
											{user?.capabilities.aiRecipeGenerationRemaining ?? 0}
										</p>
									</div>
								</div>
								<ArrowRight className='size-4 text-neutral-400 group-hover:text-success-50' />
							</Link>
							<Link
								to='/app/inventory/add/drive'
								className='group flex items-center justify-between px-6 py-4 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-success-50'>
								<div>
									<p className='text-sm text-neutral-500'>Imports Drive restants</p>
									<p className='font-semibold'>
										{user?.capabilities.driveImportsRemaining ?? 0}
									</p>
								</div>
								<ArrowRight className='size-4 text-neutral-400 group-hover:text-success-50' />
							</Link>
						</CardContent>
					</Card>
				</div>

				<section aria-labelledby='spending-title'>
					<Link
						to='/app/budget'
						className='group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success-50'>
						<Card className='transition group-hover:border-success-50/50 group-hover:shadow-md'>
							<CardHeader className='pb-2'>
								<div className='flex items-start justify-between gap-4'>
									<div>
										<CardTitle id='spending-title'>Évolution des dépenses</CardTitle>
										<p className='mt-1 text-sm text-neutral-500'>Six derniers mois</p>
									</div>
									<ArrowRight className='size-5 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-success-50' />
								</div>
							</CardHeader>
							<CardContent>
								{insightsQuery.isLoading ? (
									<div className='flex h-48 items-center justify-center text-neutral-500'>
										Chargement des dépenses…
									</div>
								) : insightsQuery.isError ? (
									<div className='flex h-48 items-center justify-center text-error-100'>
										Les dépenses sont temporairement indisponibles.
									</div>
								) : insights ? (
									<>
										<div className='mb-2 flex flex-wrap items-end gap-x-3 gap-y-1'>
											<p className='text-2xl font-bold'>
												{currencyFormatter.format(currentMonth?.total ?? 0)}
											</p>
											<p className='pb-0.5 text-sm capitalize text-neutral-500'>
												{currentMonth && formatMonth(currentMonth.month, 'long')}
											</p>
											{spendingChange !== null && (
												<span
											className={`flex items-center gap-1 pb-0.5 text-sm font-medium ${spendingChange <= 0 ? 'text-success-50' : 'text-neutral-300'}`}>
													{spendingChange <= 0 ? (
														<ArrowDownRight className='size-4' />
													) : (
														<ArrowUpRight className='size-4' />
													)}
													{Math.abs(spendingChange).toFixed(0)} % vs mois précédent
												</span>
											)}
										</div>
										{!hasSpending && (
											<p className='mb-2 text-sm text-neutral-500'>
												Aucune dépense enregistrée sur cette période.
											</p>
										)}
										<SpendingChart data={insights.spendingTrend} />
									</>
								) : null}
							</CardContent>
						</Card>
					</Link>
				</section>
			</div>
		</div>
	);
};

export default ProfilePage;
