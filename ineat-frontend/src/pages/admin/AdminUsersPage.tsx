import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { adminKeys } from '@/pages/admin/adminKeys';
import type { SubscriptionPlan, UserRole } from '@/schemas';
import {
	adminService,
	type AdminUser,
	type AdminUsersQuery,
} from '@/services/adminService';

type PendingAdminChange = {
	type: 'role';
	user: AdminUser;
	previousValue: UserRole;
	newValue: UserRole;
};

const formatDate = (value: string | null) =>
	value
		? new Intl.DateTimeFormat('fr-FR', {
				day: '2-digit',
				month: 'short',
				year: 'numeric',
			}).format(new Date(value))
		: 'Jamais';

export default function AdminUsersPage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const search = useSearch({ from: '/app/admin/users/' });
	const [searchValue, setSearchValue] = useState(search.search ?? '');
	const [pendingChange, setPendingChange] = useState<PendingAdminChange | null>(
		null
	);
	const [changeReason, setChangeReason] = useState('');
	const query: AdminUsersQuery = search;
	const usersQuery = useQuery({
		queryKey: adminKeys.users(query),
		queryFn: () => adminService.listUsers(query),
		placeholderData: (previous) => previous,
	});

	useEffect(() => setSearchValue(search.search ?? ''), [search.search]);
	useEffect(() => {
		const normalized = searchValue.trim();
		if (normalized === (search.search ?? '')) return;
		const timeout = window.setTimeout(() => {
			navigate({
				to: '/app/admin/users',
				search: {
					...search,
					page: 1,
					search: normalized || undefined,
				},
				replace: true,
			});
		}, 350);
		return () => window.clearTimeout(timeout);
	}, [navigate, search, searchValue]);

	const updateSearch = (values: Partial<typeof search>) =>
		navigate({
			to: '/app/admin/users',
			search: { ...search, ...values },
		});
	const closeDialog = () => {
		setPendingChange(null);
		setChangeReason('');
	};
	const mutationOptions = {
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminKeys.usersRoot });
			queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
			closeDialog();
		},
		onError: (error: Error) =>
			toast.error(error.message || 'Action impossible'),
	};
	const updateRoleMutation = useMutation({
		mutationFn: (change: { userId: string; role: UserRole; reason: string }) =>
			adminService.updateUserRole(change.userId, change.role, change.reason),
		...mutationOptions,
		onSuccess: () => {
			mutationOptions.onSuccess();
			toast.success('Rôle mis à jour');
		},
	});
	const isMutationPending = updateRoleMutation.isPending;
	const confirmChange = () => {
		if (!pendingChange || changeReason.trim().length < 3 || isMutationPending)
			return;
		updateRoleMutation.mutate({
			userId: pendingChange.user.id,
			role: pendingChange.newValue,
			reason: changeReason.trim(),
		});
	};

	const pageData = usersQuery.data;
	const users = pageData?.items ?? [];
	const pagination = pageData?.pagination;
	return (
		<div className="space-y-6">
			<header>
				<p className="text-sm font-medium text-primary">Administration</p>
				<h1 className="text-2xl font-semibold text-neutral-900">
					Utilisateurs
				</h1>
				<p className="mt-1 text-sm text-neutral-600">
					{pagination?.totalItems ?? 0} compte(s) correspondant aux critères.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Recherche et filtres</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
					{(search.activeFrom || search.createdFrom) && (
						<div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm md:col-span-2 xl:col-span-5">
							<p>
								<strong>
									{search.activeFrom
										? 'Actifs sur la période'
										: 'Inscrits sur la période'}
								</strong>{' '}
								· {formatRange(search.activeFrom ?? search.createdFrom)} au{' '}
								{formatRange(search.activeTo ?? search.createdTo)}
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={() =>
									updateSearch({
										page: 1,
										activeFrom: undefined,
										activeTo: undefined,
										createdFrom: undefined,
										createdTo: undefined,
									})
								}
							>
								Retirer le filtre de période
							</Button>
						</div>
					)}
					<label className="relative xl:col-span-2">
						<span className="sr-only">Rechercher un utilisateur</span>
						<Search className="pointer-events-none absolute left-3 top-3 size-4 text-neutral-400" />
						<Input
							value={searchValue}
							onChange={(event) => setSearchValue(event.target.value)}
							placeholder="Nom ou e-mail"
							className="pl-9"
						/>
					</label>
					<FilterSelect
						label="Rôle"
						value={search.role ?? ''}
						onChange={(role) =>
							updateSearch({ page: 1, role: (role || undefined) as UserRole })
						}
						options={['USER', 'ADMIN']}
					/>
					<FilterSelect
						label="Plan"
						value={search.plan ?? ''}
						onChange={(plan) =>
							updateSearch({
								page: 1,
								plan: (plan || undefined) as SubscriptionPlan,
							})
						}
						options={['FREE', 'TRIAL', 'PREMIUM']}
					/>
					<FilterSelect
						label="Statut abonnement"
						value={search.status ?? ''}
						onChange={(status) =>
							updateSearch({
								page: 1,
								status: (status || undefined) as typeof search.status,
							})
						}
						options={['ACTIVE', 'EXPIRED', 'CANCELLED']}
					/>
					<FilterSelect
						label="Accès au compte"
						value={search.accountStatus ?? ''}
						onChange={(accountStatus) =>
							updateSearch({
								page: 1,
								accountStatus: (accountStatus ||
									undefined) as typeof search.accountStatus,
							})
						}
						options={[
							'ACTIVE',
							'SUSPENDED',
							'BANNED',
							'PENDING_DELETION',
							'ANONYMIZED',
						]}
					/>
					<FilterSelect
						label="Trier par"
						value={search.sort}
						onChange={(sort) =>
							updateSearch({
								page: 1,
								sort: sort as typeof search.sort,
							})
						}
						options={['createdAt', 'email', 'lastName']}
						allowAll={false}
					/>
					<FilterSelect
						label="Ordre"
						value={search.order}
						onChange={(order) =>
							updateSearch({
								page: 1,
								order: order as typeof search.order,
							})
						}
						options={['desc', 'asc']}
						allowAll={false}
					/>
					<FilterSelect
						label="Résultats par page"
						value={String(search.pageSize)}
						onChange={(pageSize) =>
							updateSearch({
								page: 1,
								pageSize: Number(pageSize) as typeof search.pageSize,
							})
						}
						options={['10', '25', '50']}
						allowAll={false}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardContent className="p-0">
					{usersQuery.isLoading && (
						<p className="p-6 text-sm text-neutral-600">Chargement…</p>
					)}
					{usersQuery.isError && (
						<p className="p-6 text-sm text-error-600">
							Impossible de charger les utilisateurs.
						</p>
					)}
					{!usersQuery.isLoading &&
						!usersQuery.isError &&
						users.length === 0 && (
							<p className="p-6 text-sm text-neutral-600">Aucun utilisateur.</p>
						)}
					{users.length > 0 && (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Utilisateur</TableHead>
									<TableHead>Plan effectif</TableHead>
									<TableHead>Accès</TableHead>
									<TableHead>Activité</TableHead>
									<TableHead>Usage</TableHead>
									<TableHead>Rôle</TableHead>
									<TableHead>Plan déclaré</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{users.map((adminUser) => (
									<TableRow key={adminUser.id}>
										<TableCell>
											<Link
												to="/app/admin/users/$userId"
												params={{ userId: adminUser.id }}
												search={search}
												className="font-medium text-neutral-900 hover:underline"
											>
												{adminUser.firstName} {adminUser.lastName}
											</Link>
											<p className="text-xs text-neutral-500">
												{adminUser.email}
											</p>
										</TableCell>
										<TableCell>
											<Badge variant="secondary">
												{adminUser.effectivePlan}
											</Badge>
											<p className="mt-1 text-xs text-neutral-500">
												{adminUser.subscriptionStatus}
											</p>
										</TableCell>
										<TableCell>
											<Badge
												variant={
													adminUser.accountStatus === 'ACTIVE'
														? 'outline'
														: 'error'
												}
											>
												{adminUser.accountStatus}
											</Badge>
										</TableCell>
										<TableCell>{formatDate(adminUser.lastActiveAt)}</TableCell>
										<TableCell>
											{adminUser.counts.inventoryItems} article(s)
											<p className="text-xs text-neutral-500">
												{adminUser.counts.invoices} facture(s)
											</p>
										</TableCell>
										<TableCell>
											<InlineSelect
												label={`Rôle de ${adminUser.email}`}
												value={adminUser.role}
												disabled={isMutationPending}
												onChange={(role) => {
													setChangeReason('');
													setPendingChange({
														type: 'role',
														user: adminUser,
														previousValue: adminUser.role,
														newValue: role as UserRole,
													});
												}}
												options={['USER', 'ADMIN']}
											/>
										</TableCell>
										<TableCell>
											<Badge variant="outline">
												{adminUser.subscriptionPlan}
											</Badge>
											<p className="mt-1 text-xs text-neutral-500">
												Lecture seule · synchronisé par Stripe
											</p>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{pagination && (
				<div className="flex flex-wrap items-center justify-between gap-3">
					<p className="text-sm text-neutral-600">
						Page {pagination.page} sur {pagination.totalPages}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={pagination.page <= 1}
							onClick={() => updateSearch({ page: pagination.page - 1 })}
						>
							<ChevronLeft className="size-4" /> Précédent
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={pagination.page >= pagination.totalPages}
							onClick={() => updateSearch({ page: pagination.page + 1 })}
						>
							Suivant <ChevronRight className="size-4" />
						</Button>
					</div>
				</div>
			)}

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

function formatRange(value?: string) {
	return value
		? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
				new Date(value)
			)
		: '—';
}

function FilterSelect({
	label,
	value,
	options,
	onChange,
	allowAll = true,
}: {
	label: string;
	value: string;
	options: string[];
	onChange: (value: string) => void;
	allowAll?: boolean;
}) {
	return (
		<label className="text-sm font-medium text-neutral-700">
			<span className="sr-only">{label}</span>
			<select
				aria-label={label}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm"
			>
				{allowAll && <option value="">Tous · {label}</option>}
				{options.map((option) => (
					<option key={option}>{option}</option>
				))}
			</select>
		</label>
	);
}

function InlineSelect({
	label,
	value,
	options,
	disabled,
	onChange,
}: {
	label: string;
	value: string;
	options: string[];
	disabled: boolean;
	onChange: (value: string) => void;
}) {
	return (
		<select
			aria-label={label}
			value={value}
			disabled={disabled}
			onChange={(event) => onChange(event.target.value)}
			className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-sm disabled:opacity-60"
		>
			{options.map((option) => (
				<option key={option}>{option}</option>
			))}
		</select>
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
			onOpenChange={(open) => !open && !pending && onCancel()}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle className="text-neutral-900">
						Confirmer la modification
					</AlertDialogTitle>
					<AlertDialogDescription className="text-neutral-600">
						{change
							? `${change.user.firstName} ${change.user.lastName} : ${change.previousValue} → ${change.newValue}`
							: ''}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="space-y-2">
					<Label htmlFor="admin-change-reason">Justification</Label>
					<Textarea
						id="admin-change-reason"
						value={reason}
						onChange={(event) => onReasonChange(event.target.value)}
						placeholder="Pourquoi cette modification est-elle nécessaire ?"
						maxLength={500}
						disabled={pending}
					/>
				</div>
				<AlertDialogFooter>
					<AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
					<AlertDialogAction
						disabled={reason.trim().length < 3 || pending}
						onClick={(event) => {
							event.preventDefault();
							onConfirm();
						}}
					>
						{pending ? 'Modification…' : 'Confirmer'}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
