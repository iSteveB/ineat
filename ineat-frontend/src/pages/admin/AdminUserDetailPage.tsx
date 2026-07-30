import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import { ArrowLeft, Calendar, FileText, Package, Utensils } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adminKeys } from '@/pages/admin/adminKeys';
import { adminService } from '@/services/adminService';

const formatDate = (value: string | null) =>
	value
		? new Intl.DateTimeFormat('fr-FR', {
				dateStyle: 'medium',
				timeStyle: 'short',
			}).format(new Date(value))
		: 'Non défini';

export default function AdminUserDetailPage() {
	const { userId } = useParams({ from: '/app/admin/users/$userId' });
	const search = useSearch({ from: '/app/admin/users/$userId' });
	const userQuery = useQuery({
		queryKey: adminKeys.user(userId),
		queryFn: () => adminService.getUser(userId),
	});

	if (userQuery.isLoading) {
		return <p className='text-sm text-neutral-600'>Chargement du compte…</p>;
	}
	if (userQuery.isError || !userQuery.data) {
		return (
			<Card>
				<CardContent className='space-y-4 p-8 text-center'>
					<h1 className='text-xl font-semibold text-neutral-900'>
						Utilisateur introuvable
					</h1>
					<p className='text-sm text-neutral-600'>
						Le compte demandé n’existe pas ou n’est plus accessible.
					</p>
					<Button asChild variant='secondary'>
						<Link to='/app/admin/users' search={search}>
							Retour aux utilisateurs
						</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	const user = userQuery.data;
	return (
		<div className='space-y-6'>
			<Button asChild variant='ghost' size='sm'>
				<Link to='/app/admin/users' search={search}>
					<ArrowLeft className='size-4' /> Retour aux utilisateurs
				</Link>
			</Button>
			<header className='flex flex-wrap items-start justify-between gap-4'>
				<div>
					<p className='text-sm font-medium text-primary'>Compte utilisateur</p>
					<h1 className='text-2xl font-semibold text-neutral-900'>
						{user.firstName} {user.lastName}
					</h1>
					<p className='text-sm text-neutral-600'>{user.email}</p>
				</div>
				<div className='flex gap-2'>
					<Badge variant='outline'>{user.role}</Badge>
					<Badge variant='secondary'>{user.effectivePlan} effectif</Badge>
				</div>
			</header>

			<section className='grid gap-4 sm:grid-cols-3'>
				<CountCard icon={Package} label='Articles' value={user.counts.inventoryItems} />
				<CountCard icon={FileText} label='Factures' value={user.counts.invoices} />
				<CountCard icon={Utensils} label='Recettes' value={user.counts.recipes} />
			</section>

			<div className='grid gap-6 xl:grid-cols-2'>
				<Card>
					<CardHeader>
						<CardTitle>Abonnement et droits</CardTitle>
					</CardHeader>
					<CardContent className='grid gap-4 sm:grid-cols-2'>
						<Detail label='Plan déclaré' value={user.subscriptionPlan} />
						<Detail label='Plan effectif' value={user.effectivePlan} />
						<Detail label='Statut' value={user.subscriptionStatus} />
						<Detail label='Fin du trial' value={formatDate(user.trialEndsAt)} />
						<Detail
							label='Fin de période'
							value={formatDate(user.currentPeriodEndsAt)}
						/>
						<Detail label='Dernière activité' value={formatDate(user.lastActiveAt)} />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Quotas récents</CardTitle>
					</CardHeader>
					<CardContent className='space-y-3'>
						{user.quotas.length === 0 && (
							<p className='text-sm text-neutral-600'>Aucun quota enregistré.</p>
						)}
						{user.quotas.map((quota) => (
							<div key={quota.id} className='rounded-lg border p-3'>
								<div className='flex items-center justify-between gap-3'>
									<p className='font-medium text-neutral-900'>{quota.usageType}</p>
									<p className='text-sm text-neutral-600'>
										{quota.usedCount}/{quota.limit}
									</p>
								</div>
								<p className='mt-1 flex items-center gap-1 text-xs text-neutral-500'>
									<Calendar className='size-3' /> Jusqu’au {formatDate(quota.periodEnd)}
								</p>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

function CountCard({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Package;
	label: string;
	value: number;
}) {
	return (
		<Card>
			<CardContent className='flex items-center gap-3 p-4'>
				<Icon className='size-5 text-primary' />
				<div>
					<p className='text-xs text-neutral-500'>{label}</p>
					<p className='text-xl font-semibold text-neutral-900'>{value}</p>
				</div>
			</CardContent>
		</Card>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className='text-xs text-neutral-500'>{label}</p>
			<p className='mt-1 text-sm font-medium text-neutral-900'>{value}</p>
		</div>
	);
}
