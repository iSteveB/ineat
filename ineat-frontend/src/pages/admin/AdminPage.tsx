import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import {
	Activity,
	AlertTriangle,
	FileText,
	Shield,
	Sparkles,
	TrendingDown,
	TrendingUp,
	Users,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminKeys } from '@/pages/admin/adminKeys';
import { adminService, type AdminDashboard } from '@/services/adminService';

const attentionLabels: Record<
	AdminDashboard['attention'][number]['type'],
	string
> = {
	FAILED_JOBS: 'jobs en échec',
	FAILED_WEBHOOKS: 'webhooks Stripe en échec',
	FAILED_NOTIFICATIONS: 'notifications en échec',
	FAILED_INVOICES: 'factures en échec',
};

const dateInputValue = (date: Date) => date.toISOString().slice(0, 10);

export default function AdminPage() {
	const navigate = useNavigate();
	const search = useSearch({ from: '/app/admin/' });
	const dashboardQuery = useQuery({
		queryKey: adminKeys.dashboardQuery(search),
		queryFn: () => adminService.getDashboard(search),
		enabled: search.period !== 'custom' || Boolean(search.from && search.to),
	});
	const dashboard = dashboardQuery.data;

	const setPeriod = (period: typeof search.period) => {
		if (period !== 'custom') {
			navigate({ to: '/app/admin', search: { period } });
			return;
		}
		const to = new Date();
		const from = new Date(to.getTime() - 29 * 24 * 60 * 60_000);
		navigate({
			to: '/app/admin',
			search: {
				period,
				from: search.from ?? dateInputValue(from),
				to: search.to ?? dateInputValue(to),
			},
		});
	};

	return (
		<div className='space-y-6'>
			<header className='flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between'>
				<div>
					<p className='text-sm font-medium text-primary'>Administration</p>
					<h1 className='text-2xl font-semibold text-neutral-900'>
						Vue d’ensemble
					</h1>
					<p className='mt-1 text-sm text-neutral-600'>
						Usage, abonnements et incidents nécessitant une action.
					</p>
				</div>
				<div className='flex flex-wrap items-center gap-2'>
					<label className='text-sm font-medium text-neutral-700'>
						<span className='sr-only'>Période</span>
						<select
							aria-label='Période'
							value={search.period}
							onChange={(event) =>
								setPeriod(event.target.value as typeof search.period)
							}
							className='h-10 rounded-md border border-neutral-200 bg-neutral-50 px-3'
						>
							<option value='7d'>7 jours</option>
							<option value='30d'>30 jours</option>
							<option value='90d'>90 jours</option>
							<option value='custom'>Personnalisée</option>
						</select>
					</label>
					<Badge variant='outline' className='gap-1'>
						<Shield className='size-3' /> ADMIN
					</Badge>
				</div>
			</header>

			{search.period === 'custom' && (
				<div className='flex flex-wrap gap-3 rounded-lg border bg-neutral-50 p-3'>
					<DateField
						label='Du'
						value={search.from ?? ''}
						onChange={(from) =>
							navigate({
								to: '/app/admin',
								search: { ...search, from },
							})
						}
					/>
					<DateField
						label='Au'
						value={search.to ?? ''}
						onChange={(to) =>
							navigate({
								to: '/app/admin',
								search: { ...search, to },
							})
						}
					/>
				</div>
			)}

			{dashboardQuery.isError && (
				<AdminState
					title='Vue d’ensemble indisponible'
					description='Les indicateurs administratifs ne peuvent pas être chargés.'
				/>
			)}
			{dashboardQuery.isLoading && <DashboardSkeleton />}
			{dashboard && <DashboardContent dashboard={dashboard} />}
		</div>
	);
}

function DashboardContent({ dashboard }: { dashboard: AdminDashboard }) {
	const navigate = useNavigate();
	const usersSearch = {
		page: 1 as const,
		pageSize: 25 as const,
		sort: 'createdAt' as const,
		order: 'desc' as const,
	};
	const openAttention = (type: AdminDashboard['attention'][number]['type']) => {
		if (type === 'FAILED_JOBS') {
			navigate({
				to: '/app/admin/operations',
				search: { jobState: 'failed' },
			});
			return;
		}
		const incident = {
			FAILED_INVOICES: 'INVOICE',
			FAILED_NOTIFICATIONS: 'NOTIFICATION',
			FAILED_WEBHOOKS: 'STRIPE_WEBHOOK',
		}[type] as 'INVOICE' | 'NOTIFICATION' | 'STRIPE_WEBHOOK';
		navigate({ to: '/app/admin/operations', search: { incident } });
	};
	return (
		<>
			<section className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
				<MetricCard
					icon={Users}
					label='Utilisateurs actifs'
					value={dashboard.users.active}
					detail={`sur ${dashboard.users.total} comptes`}
					onClick={() =>
						navigate({
							to: '/app/admin/users',
							search: {
								...usersSearch,
								activeFrom: dashboard.period.from,
								activeTo: dashboard.period.to,
							},
						})
					}
				/>
				<MetricCard
					icon={dashboard.users.growthRate >= 0 ? TrendingUp : TrendingDown}
					label='Nouvelles inscriptions'
					value={dashboard.users.new}
					detail={`${dashboard.users.growthRate >= 0 ? '+' : ''}${dashboard.users.growthRate} % vs période précédente`}
					onClick={() =>
						navigate({
							to: '/app/admin/users',
							search: {
								...usersSearch,
								createdFrom: dashboard.period.from,
								createdTo: dashboard.period.to,
							},
						})
					}
				/>
				<MetricCard
					icon={Sparkles}
					label='Premium actifs'
					value={dashboard.subscriptions.premium}
					detail={`${dashboard.subscriptions.activeTrials} trials actifs`}
					onClick={() =>
						navigate({
							to: '/app/admin/users',
							search: { ...usersSearch, plan: 'PREMIUM' },
						})
					}
				/>
				<MetricCard
					icon={Activity}
					label='Conversion Trial → Premium'
					value={`${dashboard.subscriptions.conversionRate} %`}
					detail={`${dashboard.subscriptions.conversions} conversion(s)`}
					onClick={() => navigate({ to: '/app/admin/subscriptions' })}
				/>
			</section>

			<section className='grid gap-4 lg:grid-cols-3'>
				<TrendCard
					title='Inscriptions'
					series={[
						{
							label: 'Inscriptions',
							color: 'bg-primary',
							points: dashboard.trends.registrations.map((point) => ({
								date: point.date,
								value: point.value,
							})),
						},
					]}
				/>
				<TrendCard
					title='Abonnements'
					series={[
						{
							label: 'Trials',
							color: 'bg-amber-500',
							points: dashboard.trends.subscriptions.map((point) => ({
								date: point.date,
								value: point.trials,
							})),
						},
						{
							label: 'Conversions',
							color: 'bg-success-500',
							points: dashboard.trends.subscriptions.map((point) => ({
								date: point.date,
								value: point.conversions,
							})),
						},
					]}
				/>
				<TrendCard
					title='Opérations'
					series={[
						{
							label: 'Succès',
							color: 'bg-success-500',
							points: dashboard.trends.operations.map((point) => ({
								date: point.date,
								value: point.successes,
							})),
						},
						{
							label: 'Échecs',
							color: 'bg-error-500',
							points: dashboard.trends.operations.map((point) => ({
								date: point.date,
								value: point.failures,
							})),
						},
					]}
				/>
			</section>

			<section className='grid gap-4 lg:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Usage produit</CardTitle>
					</CardHeader>
					<CardContent className='grid gap-3 sm:grid-cols-3'>
						<UsageValue
							label='Factures traitées'
							value={dashboard.usage.invoicesProcessed}
							icon={FileText}
						/>
						<UsageValue
							label='Générations IA'
							value={dashboard.usage.aiGenerations}
						/>
						<UsageValue
							label='Imports Drive'
							value={dashboard.usage.driveImports}
						/>
						<p className='text-xs text-neutral-500 sm:col-span-3'>
							Les usages IA et Drive sont mesurés depuis l’activation du journal
							d’usage.
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>À traiter</CardTitle>
					</CardHeader>
					<CardContent className='space-y-3'>
						{dashboard.attention.length === 0 ? (
							<p className='text-sm text-success-700'>
								Aucun incident détecté.
							</p>
						) : (
							dashboard.attention.map((item) => (
								<button
									type='button'
									key={item.type}
									onClick={() => openAttention(item.type)}
									aria-label={`Voir ${attentionLabels[item.type]}`}
									className='flex w-full items-center justify-between rounded-lg border border-error-100 bg-error-50/40 p-3 text-left transition hover:border-error-300 hover:bg-error-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
								>
									<p className='flex items-center gap-2 text-sm text-neutral-800'>
										<AlertTriangle className='size-4 text-error-600' />
										{attentionLabels[item.type]}
									</p>
									<Badge variant='outline'>{item.count}</Badge>
								</button>
							))
						)}
					</CardContent>
				</Card>
			</section>
		</>
	);
}

type TrendSeries = {
	label: string;
	color: string;
	points: Array<{ date: string; value: number }>;
};

function TrendCard({
	title,
	series,
}: {
	title: string;
	series: TrendSeries[];
}) {
	const values = series.flatMap((item) =>
		item.points.map((point) => point.value)
	);
	const max = Math.max(1, ...values);
	const dates = Array.from(
		new Set(series.flatMap((item) => item.points.map((p) => p.date)))
	);
	return (
		<Card>
			<CardHeader>
				<CardTitle>{title}</CardTitle>
			</CardHeader>
			<CardContent>
				{dates.length === 0 ? (
					<p className='py-12 text-center text-sm text-neutral-500'>
						Aucune donnée sur la période.
					</p>
				) : (
					<div
						className='flex h-36 items-end gap-1'
						role='img'
						aria-label={`Graphique ${title}`}
					>
						{dates.map((date) => (
							<div
								key={date}
								className='flex h-full min-w-1 flex-1 items-end gap-px'
							>
								{series.map((item) => {
									const value =
										item.points.find((point) => point.date === date)?.value ??
										0;
									return (
										<div
											key={item.label}
											title={`${date} · ${item.label}: ${value}`}
											className={`min-h-px flex-1 rounded-t ${item.color}`}
											style={{ height: `${Math.max(1, (value / max) * 100)}%` }}
										/>
									);
								})}
							</div>
						))}
					</div>
				)}
				<div className='mt-3 flex flex-wrap gap-3'>
					{series.map((item) => (
						<span
							key={item.label}
							className='flex items-center gap-1 text-xs text-neutral-500'
						>
							<span className={`size-2 rounded-full ${item.color}`} />{' '}
							{item.label}
						</span>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function MetricCard({
	icon: Icon,
	label,
	value,
	detail,
	onClick,
}: {
	icon: typeof Users;
	label: string;
	value: number | string;
	detail: string;
	onClick: () => void;
}) {
	return (
		<button
			type='button'
			onClick={onClick}
			aria-label={`Voir ${label.toLowerCase()}`}
			className='h-full rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
		>
			<Card className='h-full transition hover:border-primary/40 hover:shadow-md'>
				<CardContent className='flex gap-3 p-4'>
					<div className='h-fit rounded-lg bg-primary/10 p-2 text-primary'>
						<Icon className='size-5' />
					</div>
					<div>
						<p className='text-sm text-neutral-600'>{label}</p>
						<p className='text-2xl font-semibold text-neutral-900'>{value}</p>
						<p className='text-xs text-neutral-500'>{detail}</p>
					</div>
				</CardContent>
			</Card>
		</button>
	);
}

function UsageValue({
	label,
	value,
	icon: Icon,
}: {
	label: string;
	value: number;
	icon?: typeof FileText;
}) {
	return (
		<div className='rounded-lg border bg-neutral-50 p-3'>
			<p className='flex items-center gap-1 text-xs text-neutral-500'>
				{Icon && <Icon className='size-3' />}
				{label}
			</p>
			<p className='mt-1 text-xl font-semibold text-neutral-900'>{value}</p>
		</div>
	);
}

function DateField({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	return (
		<label className='text-sm text-neutral-700'>
			{label}
			<input
				type='date'
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className='ml-2 h-9 rounded-md border bg-white px-2'
			/>
		</label>
	);
}

function DashboardSkeleton() {
	return (
		<div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
			{Array.from({ length: 4 }).map((_, index) => (
				<div
					key={index}
					className='h-28 animate-pulse rounded-xl bg-neutral-100'
				/>
			))}
		</div>
	);
}

function AdminState({
	title,
	description,
}: {
	title: string;
	description: string;
}) {
	return (
		<Card>
			<CardContent className='p-8 text-center'>
				<h2 className='text-xl font-semibold text-neutral-900'>{title}</h2>
				<p className='mt-2 text-sm text-neutral-600'>{description}</p>
			</CardContent>
		</Card>
	);
}
