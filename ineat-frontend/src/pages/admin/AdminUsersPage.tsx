import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { adminKeys } from '@/pages/admin/adminKeys';
import type { SubscriptionPlan, UserRole } from '@/schemas';
import { adminService, type AdminUser } from '@/services/adminService';

const roleOptions: UserRole[] = ['USER', 'ADMIN'];
const planOptions: SubscriptionPlan[] = ['FREE', 'TRIAL', 'PREMIUM'];
const quotaLabel: Record<string, string> = {
	AI_RECIPE_GENERATION: 'IA recettes',
	DRIVE_IMPORT: 'Drive',
};

type PendingAdminChange =
	| {
			type: 'role';
			user: AdminUser;
			previousValue: UserRole;
			newValue: UserRole;
	  }
	| {
			type: 'plan';
			user: AdminUser;
			previousValue: SubscriptionPlan;
			newValue: SubscriptionPlan;
	  };

const formatDate = (date: string | null) => {
	if (!date) return 'Non défini';
	return new Intl.DateTimeFormat('fr-FR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
	}).format(new Date(date));
};

export default function AdminUsersPage() {
	const queryClient = useQueryClient();
	const [pendingChange, setPendingChange] =
		useState<PendingAdminChange | null>(null);
	const [changeReason, setChangeReason] = useState('');
	const usersQuery = useQuery({
		queryKey: adminKeys.users,
		queryFn: adminService.listUsers,
	});

	const closeDialog = () => {
		setPendingChange(null);
		setChangeReason('');
	};
	const mutationOptions = {
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminKeys.users });
			queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
			closeDialog();
		},
		onError: (error: Error) => toast.error(error.message || 'Action impossible'),
	};
	const updateRoleMutation = useMutation({
		mutationFn: ({
			userId,
			role,
			reason,
		}: {
			userId: string;
			role: UserRole;
			reason: string;
		}) => adminService.updateUserRole(userId, role, reason),
		...mutationOptions,
		onSuccess: () => {
			mutationOptions.onSuccess();
			toast.success('Rôle mis à jour');
		},
	});
	const updatePlanMutation = useMutation({
		mutationFn: ({
			userId,
			subscriptionPlan,
			reason,
		}: {
			userId: string;
			subscriptionPlan: SubscriptionPlan;
			reason: string;
		}) =>
			adminService.updateSubscriptionPlan(
				userId,
				subscriptionPlan,
				reason
			),
		...mutationOptions,
		onSuccess: () => {
			mutationOptions.onSuccess();
			toast.success('Plan mis à jour');
		},
	});

	const isMutationPending =
		updateRoleMutation.isPending || updatePlanMutation.isPending;
	const canConfirmChange = changeReason.trim().length >= 3;
	const users = usersQuery.data ?? [];
	const confirmChange = () => {
		if (!pendingChange || !canConfirmChange || isMutationPending) return;
		if (pendingChange.type === 'role') {
			updateRoleMutation.mutate({
				userId: pendingChange.user.id,
				role: pendingChange.newValue,
				reason: changeReason.trim(),
			});
			return;
		}
		updatePlanMutation.mutate({
			userId: pendingChange.user.id,
			subscriptionPlan: pendingChange.newValue,
			reason: changeReason.trim(),
		});
	};

	return (
		<div className='space-y-6'>
			<header>
				<p className='text-sm font-medium text-primary'>Administration</p>
				<h1 className='text-2xl font-semibold text-neutral-900'>Utilisateurs</h1>
				<p className='mt-1 text-sm text-neutral-600'>
					Consultez les comptes, leurs droits et leurs quotas.
				</p>
			</header>
			<Card>
				<CardHeader>
					<CardTitle>Comptes InEat</CardTitle>
				</CardHeader>
				<CardContent className='space-y-4'>
					{usersQuery.isLoading && (
						<p className='text-sm text-neutral-600'>Chargement…</p>
					)}
					{usersQuery.isError && (
						<p className='text-sm text-error-600'>
							Impossible de charger les utilisateurs.
						</p>
					)}
					{!usersQuery.isLoading && !usersQuery.isError && users.length === 0 && (
						<p className='text-sm text-neutral-600'>Aucun utilisateur.</p>
					)}
					{users.map((adminUser) => (
						<UserRow
							key={adminUser.id}
							user={adminUser}
							disabled={isMutationPending}
							onRoleChange={(role) => {
								setChangeReason('');
								setPendingChange({
									type: 'role',
									user: adminUser,
									previousValue: adminUser.role,
									newValue: role,
								});
							}}
							onPlanChange={(subscriptionPlan) => {
								setChangeReason('');
								setPendingChange({
									type: 'plan',
									user: adminUser,
									previousValue: adminUser.subscriptionPlan,
									newValue: subscriptionPlan,
								});
							}}
						/>
					))}
				</CardContent>
			</Card>
			<ChangeConfirmationDialog
				change={pendingChange}
				reason={changeReason}
				pending={isMutationPending}
				onReasonChange={setChangeReason}
				onCancel={closeDialog}
				onConfirm={confirmChange}
			/>
		</div>
	);
}

function ChangeConfirmationDialog({
	change,
	reason,
	pending,
	onReasonChange,
	onCancel,
	onConfirm,
}: {
	change: PendingAdminChange | null;
	reason: string;
	pending: boolean;
	onReasonChange: (value: string) => void;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<AlertDialog
			open={Boolean(change)}
			onOpenChange={(open) => !open && !pending && onCancel()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className='text-neutral-900'>
						Confirmer la modification
					</AlertDialogTitle>
					<AlertDialogDescription className='text-neutral-600'>
						{change
							? `${change.user.firstName} ${change.user.lastName} : ${change.previousValue} → ${change.newValue}`
							: ''}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className='space-y-2'>
					<Label htmlFor='admin-change-reason'>Justification</Label>
					<Textarea
						id='admin-change-reason'
						value={reason}
						onChange={(event) => onReasonChange(event.target.value)}
						placeholder='Pourquoi cette modification est-elle nécessaire ?'
						maxLength={500}
						disabled={pending}
					/>
					<p className='text-xs text-neutral-500'>
						Cette justification sera conservée dans le journal d’audit.
					</p>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
					<AlertDialogAction
						disabled={reason.trim().length < 3 || pending}
						onClick={(event) => {
							event.preventDefault();
							onConfirm();
						}}>
						{pending ? 'Modification…' : 'Confirmer'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function UserRow({
	user,
	onRoleChange,
	onPlanChange,
	disabled,
}: {
	user: AdminUser;
	onRoleChange: (role: UserRole) => void;
	onPlanChange: (subscriptionPlan: SubscriptionPlan) => void;
	disabled: boolean;
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
						<span className='mb-1 block font-medium text-neutral-700'>Rôle</span>
						<select
							value={user.role}
							disabled={disabled}
							onChange={(event) => onRoleChange(event.target.value as UserRole)}
							className='w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 disabled:opacity-60'>
							{roleOptions.map((role) => (
								<option key={role} value={role}>
									{role}
								</option>
							))}
						</select>
					</label>
					<label className='text-sm'>
						<span className='mb-1 block font-medium text-neutral-700'>Plan</span>
						<select
							value={user.subscriptionPlan}
							disabled={disabled}
							onChange={(event) =>
								onPlanChange(event.target.value as SubscriptionPlan)
							}
							className='w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 disabled:opacity-60'>
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
