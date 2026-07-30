import { useQuery } from '@tanstack/react-query';
import { BarChart3, Shield, Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminKeys } from '@/pages/admin/adminKeys';
import { adminService } from '@/services/adminService';

export default function AdminPage() {
	const dashboardQuery = useQuery({
		queryKey: adminKeys.dashboard,
		queryFn: adminService.getDashboard,
	});
	const dashboard = dashboardQuery.data;

	if (dashboardQuery.isError) {
		return (
			<AdminState
				title='Vue d’ensemble indisponible'
				description='Les indicateurs administratifs ne peuvent pas être chargés.'
			/>
		);
	}

	return (
		<div className='space-y-6'>
			<header className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<p className='text-sm font-medium text-primary'>Administration</p>
					<h1 className='text-2xl font-semibold text-neutral-900'>
						Vue d’ensemble
					</h1>
				</div>
				<Badge variant='outline' className='w-fit gap-1'>
					<Shield className='size-3' />
					Rôle ADMIN
				</Badge>
			</header>

			<section className='grid gap-4 md:grid-cols-3'>
				<MetricCard
					icon={<Users className='size-5 text-primary' />}
					label='Utilisateurs'
					value={dashboard?.users.total ?? 0}
					loading={dashboardQuery.isLoading}
				/>
				<MetricCard
					icon={<Shield className='size-5 text-primary' />}
					label='Admins'
					value={dashboard?.users.admins ?? 0}
					loading={dashboardQuery.isLoading}
				/>
				<MetricCard
					icon={<BarChart3 className='size-5 text-primary' />}
					label='Trials expirés'
					value={dashboard?.users.expiredTrials ?? 0}
					loading={dashboardQuery.isLoading}
				/>
			</section>

			<Card>
				<CardHeader>
					<CardTitle>Répartition des plans</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='grid gap-3 sm:grid-cols-3'>
						<PlanPill label='Free' value={dashboard?.users.free ?? 0} />
						<PlanPill label='Trial' value={dashboard?.users.trial ?? 0} />
						<PlanPill label='Premium' value={dashboard?.users.premium ?? 0} />
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

function MetricCard({
	icon,
	label,
	value,
	loading,
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
	loading: boolean;
}) {
	return (
		<Card>
			<CardContent className='flex items-center gap-3 p-4'>
				<div className='rounded-md bg-primary/10 p-2'>{icon}</div>
				<div>
					<p className='text-sm text-neutral-600'>{label}</p>
					<p className='text-2xl font-semibold text-neutral-900'>
						{loading ? '—' : value}
					</p>
				</div>
			</CardContent>
		</Card>
	);
}

function PlanPill({ label, value }: { label: string; value: number }) {
	return (
		<div className='rounded-lg border border-neutral-200 bg-neutral-50 p-3'>
			<p className='text-sm text-neutral-600'>{label}</p>
			<p className='text-xl font-semibold text-neutral-900'>{value}</p>
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
				<h1 className='text-xl font-semibold text-neutral-900'>{title}</h1>
				<p className='mt-2 text-sm text-neutral-600'>{description}</p>
			</CardContent>
		</Card>
	);
}
