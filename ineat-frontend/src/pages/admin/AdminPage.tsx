import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { BarChart3, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	adminService,
	type AdminUser,
} from '@/services/adminService';
import type { SubscriptionPlan, UserRole } from '@/schemas';
import { useAuthStore } from '@/stores/authStore';

const adminKeys = {
	dashboard: ['admin', 'dashboard'] as const,
	users: ['admin', 'users'] as const,
};

const roleOptions: UserRole[] = ['USER', 'ADMIN'];
const planOptions: SubscriptionPlan[] = ['FREE', 'TRIAL', 'PREMIUM'];

const quotaLabel: Record<string, string> = {
	AI_RECIPE_GENERATION: 'IA recettes',
	DRIVE_IMPORT: 'Drive',
};

const formatDate = (date: string | null) => {
	if (!date) return 'Non défini';

	return new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date(date));
};

export default function AdminPage() {
	const user = useAuthStore((state) => state.user);
	const queryClient = useQueryClient();
	const canAccessAdmin = Boolean(user?.capabilities.canAccessAdmin);

	const dashboardQuery = useQuery({
		queryKey: adminKeys.dashboard,
		queryFn: adminService.getDashboard,
		enabled: canAccessAdmin,
	});

	const usersQuery = useQuery({
		queryKey: adminKeys.users,
		queryFn: adminService.listUsers,
		enabled: canAccessAdmin,
	});

	const updateRoleMutation = useMutation({
		mutationFn: ({
			userId,
			role,
		}: {
			userId: string;
			role: UserRole;
		}) => adminService.updateUserRole(userId, role),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminKeys.users });
			queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
			toast.success('Rôle mis à jour');
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Action impossible');
		},
	});

	const updatePlanMutation = useMutation({
		mutationFn: ({
			userId,
			subscriptionPlan,
		}: {
			userId: string;
			subscriptionPlan: SubscriptionPlan;
		}) => adminService.updateSubscriptionPlan(userId, subscriptionPlan),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminKeys.users });
			queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
			toast.success('Plan mis à jour');
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Action impossible');
		},
	});

	if (!canAccessAdmin) {
		return (
			<div className='mx-auto max-w-2xl p-4'>
				<Card>
					<CardContent className='p-8 text-center'>
						<Shield className='mx-auto mb-3 size-8 text-muted-foreground' />
						<h1 className='text-xl font-semibold text-neutral-900'>
							Accès admin requis
						</h1>
						<p className='mt-2 text-sm text-neutral-600'>
							Cette section est réservée aux administrateurs.
						</p>
						<Button asChild className='mt-5' variant='secondary'>
							<Link to='/app'>Retour</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const dashboard = dashboardQuery.data;
	const users = usersQuery.data ?? [];

	return (
		<div className='mx-auto max-w-6xl space-y-6 p-4 pb-28'>
			<header className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<div>
					<p className='text-sm font-medium text-primary'>Administration</p>
					<h1 className='text-2xl font-semibold text-neutral-900'>
						Console minimale
					</h1>
				</div>
				<Badge variant='outline' className='w-fit gap-1'>
					<Shield className='size-3' />
					Role ADMIN
				</Badge>
			</header>

			<section className='grid gap-4 md:grid-cols-3'>
				<MetricCard
					icon={<Users className='size-5 text-primary' />}
					label='Utilisateurs'
					value={dashboard?.users.total ?? 0}
				/>
				<MetricCard
					icon={<Shield className='size-5 text-primary' />}
					label='Admins'
					value={dashboard?.users.admins ?? 0}
				/>
				<MetricCard
					icon={<BarChart3 className='size-5 text-primary' />}
					label='Trials expirés'
					value={dashboard?.users.expiredTrials ?? 0}
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

			<Card>
				<CardHeader>
					<CardTitle>Utilisateurs</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					{usersQuery.isLoading ? (
						<p className='text-sm text-neutral-600'>Chargement...</p>
					) : (
						users.map((adminUser) => (
							<UserRow
								key={adminUser.id}
								user={adminUser}
								onRoleChange={(role) =>
									updateRoleMutation.mutate({
										userId: adminUser.id,
										role,
									})
								}
								onPlanChange={(subscriptionPlan) =>
									updatePlanMutation.mutate({
										userId: adminUser.id,
										subscriptionPlan,
									})
								}
							/>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function MetricCard({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
}) {
	return (
		<Card>
			<CardContent className='flex items-center gap-3 p-4'>
				<div className='rounded-md bg-primary/10 p-2'>{icon}</div>
				<div>
					<p className='text-sm text-neutral-600'>{label}</p>
					<p className='text-2xl font-semibold text-neutral-900'>{value}</p>
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

function UserRow({
	user,
	onRoleChange,
	onPlanChange,
}: {
	user: AdminUser;
	onRoleChange: (role: UserRole) => void;
	onPlanChange: (subscriptionPlan: SubscriptionPlan) => void;
}) {
	return (
		<div className='rounded-lg border border-neutral-200 bg-neutral-50 p-4'>
			<div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
				<div className='min-w-0'>
					<div className='flex flex-wrap items-center gap-2'>
						<h2 className='font-semibold text-neutral-900'>
							{user.firstName} {user.lastName}
						</h2>
						<Badge variant='secondary'>{user.subscriptionStatus}</Badge>
					</div>
					<p className='truncate text-sm text-neutral-600'>{user.email}</p>
					<p className='mt-1 text-xs text-neutral-500'>
						Créé le {formatDate(user.createdAt)}
					</p>
				</div>

				<div className='grid gap-3 sm:grid-cols-2'>
					<label className='text-sm'>
						<span className='mb-1 block font-medium text-neutral-700'>
							Rôle
						</span>
						<select
							value={user.role}
							onChange={(event) =>
								onRoleChange(event.target.value as UserRole)
							}
							className='w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2'>
							{roleOptions.map((role) => (
								<option key={role} value={role}>
									{role}
								</option>
							))}
						</select>
					</label>
					<label className='text-sm'>
						<span className='mb-1 block font-medium text-neutral-700'>
							Plan
						</span>
						<select
							value={user.subscriptionPlan}
							onChange={(event) =>
								onPlanChange(event.target.value as SubscriptionPlan)
							}
							className='w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2'>
							{planOptions.map((plan) => (
								<option key={plan} value={plan}>
									{plan}
								</option>
							))}
						</select>
					</label>
				</div>
			</div>

			<div className='mt-4 grid gap-2 md:grid-cols-2'>
				{user.quotas.length === 0 ? (
					<p className='text-sm text-neutral-600'>Aucun quota consommé.</p>
				) : (
					user.quotas.map((quota) => (
						<div
							key={quota.id}
							className='rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm'>
							<p className='font-medium text-neutral-900'>
								{quotaLabel[quota.usageType] ?? quota.usageType}
							</p>
							<p className='text-neutral-600'>
								{quota.usedCount}/{quota.limit} consommés
							</p>
							<p className='text-xs text-neutral-500'>
								Jusqu’au {formatDate(quota.periodEnd)}
							</p>
						</div>
					))
				)}
			</div>
		</div>
	);
}
