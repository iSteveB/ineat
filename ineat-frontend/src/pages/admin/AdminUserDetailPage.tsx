import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearch } from '@tanstack/react-router';
import {
	ArrowLeft,
	Calendar,
	FileText,
	Package,
	ShieldAlert,
	Utensils,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
	const queryClient = useQueryClient();
	const { userId } = useParams({ from: '/app/admin/users/$userId' });
	const search = useSearch({ from: '/app/admin/users/$userId' });
	const userQuery = useQuery({
		queryKey: adminKeys.user(userId),
		queryFn: () => adminService.getUser(userId),
	});
	const [action, setAction] = useState<AccountAction | null>(null);
	const [reason, setReason] = useState('');
	const [suspendedUntil, setSuspendedUntil] = useState('');
	const [cancelSubscription, setCancelSubscription] = useState(true);
	const mutation = useMutation({
		mutationFn: async () => {
			if (!action) return;
			await adminService.updateAccountStatus(userId, action, {
				reason: reason.trim(),
				...(action === 'suspend' && suspendedUntil
					? { suspendedUntil: new Date(suspendedUntil).toISOString() }
					: {}),
			});
			if (
				cancelSubscription &&
				action === 'ban' &&
				userQuery.data?.subscriptionPlan === 'PREMIUM' &&
				!userQuery.data.cancelAtPeriodEnd
			) {
				await adminService.setSubscriptionCancellation(
					userId,
					true,
					reason.trim()
				);
			}
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminKeys.user(userId) });
			queryClient.invalidateQueries({ queryKey: adminKeys.usersRoot });
			queryClient.invalidateQueries({ queryKey: adminKeys.dashboard });
			setAction(null);
			setReason('');
			setSuspendedUntil('');
			toast.success('Statut du compte mis à jour');
		},
		onError: (error: Error) =>
			toast.error(error.message || 'Action impossible'),
	});

	if (userQuery.isLoading) {
		return <p className="text-sm text-neutral-600">Chargement du compte…</p>;
	}
	if (userQuery.isError || !userQuery.data) {
		return (
			<Card>
				<CardContent className="space-y-4 p-8 text-center">
					<h1 className="text-xl font-semibold text-neutral-900">
						Utilisateur introuvable
					</h1>
					<p className="text-sm text-neutral-600">
						Le compte demandé n’existe pas ou n’est plus accessible.
					</p>
					<Button asChild variant="secondary">
						<Link to="/app/admin/users" search={search}>
							Retour aux utilisateurs
						</Link>
					</Button>
				</CardContent>
			</Card>
		);
	}

	const user = userQuery.data;
	return (
		<div className="space-y-6">
			<Button asChild variant="ghost" size="sm">
				<Link to="/app/admin/users" search={search}>
					<ArrowLeft className="size-4" /> Retour aux utilisateurs
				</Link>
			</Button>
			<header className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p className="text-sm font-medium text-primary">Compte utilisateur</p>
					<h1 className="text-2xl font-semibold text-neutral-900">
						{user.firstName} {user.lastName}
					</h1>
					<p className="text-sm text-neutral-600">{user.email}</p>
				</div>
				<div className="flex gap-2">
					<Badge variant="outline">{user.role}</Badge>
					<Badge
						variant={user.accountStatus === 'ACTIVE' ? 'secondary' : 'error'}
					>
						{accountStatusLabels[user.accountStatus]}
					</Badge>
					<Badge variant="secondary">{user.effectivePlan} effectif</Badge>
				</div>
			</header>

			<section className="grid gap-4 sm:grid-cols-3">
				<CountCard
					icon={Package}
					label="Articles"
					value={user.counts.inventoryItems}
				/>
				<CountCard
					icon={FileText}
					label="Factures"
					value={user.counts.invoices}
				/>
				<CountCard
					icon={Utensils}
					label="Recettes"
					value={user.counts.recipes}
				/>
			</section>

			<div className="grid gap-6 xl:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<ShieldAlert className="size-5" /> Accès au compte
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-3 sm:grid-cols-2">
							<Detail
								label="Statut"
								value={accountStatusLabels[user.accountStatus]}
							/>
							<Detail
								label="Suspension jusqu’au"
								value={formatDate(user.suspendedUntil)}
							/>
							<Detail
								label="Suppression prévue"
								value={formatDate(user.deletionScheduledAt)}
							/>
							<Detail
								label="Dernier motif"
								value={user.moderationReason || 'Aucun'}
							/>
						</div>
						<div className="flex flex-wrap gap-2">
							{actionsByStatus[user.accountStatus].map((item) => (
								<Button
									key={item.action}
									variant={item.danger ? 'error' : 'secondary'}
									onClick={() => setAction(item.action)}
								>
									{item.label}
								</Button>
							))}
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Abonnement et droits</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<Detail label="Plan déclaré" value={user.subscriptionPlan} />
						<Detail label="Plan effectif" value={user.effectivePlan} />
						<Detail label="Statut" value={user.subscriptionStatus} />
						<Detail label="Fin du trial" value={formatDate(user.trialEndsAt)} />
						<Detail
							label="Fin de période"
							value={formatDate(user.currentPeriodEndsAt)}
						/>
						<Detail
							label="Dernière activité"
							value={formatDate(user.lastActiveAt)}
						/>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Quotas récents</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						{user.quotas.length === 0 && (
							<p className="text-sm text-neutral-600">
								Aucun quota enregistré.
							</p>
						)}
						{user.quotas.map((quota) => (
							<div key={quota.id} className="rounded-lg border p-3">
								<div className="flex items-center justify-between gap-3">
									<p className="font-medium text-neutral-900">
										{quota.usageType}
									</p>
									<p className="text-sm text-neutral-600">
										{quota.usedCount}/{quota.limit}
									</p>
								</div>
								<p className="mt-1 flex items-center gap-1 text-xs text-neutral-500">
									<Calendar className="size-3" /> Jusqu’au{' '}
									{formatDate(quota.periodEnd)}
								</p>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
			<AlertDialog
				open={Boolean(action)}
				onOpenChange={(open) => !open && !mutation.isPending && setAction(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{action ? actionCopy[action].title : ''}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{action ? actionCopy[action].description : ''}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="space-y-4">
						{action === 'suspend' && (
							<div className="space-y-2">
								<Label htmlFor="suspended-until">
									Fin facultative de suspension
								</Label>
								<Input
									id="suspended-until"
									type="datetime-local"
									value={suspendedUntil}
									onChange={(e) => setSuspendedUntil(e.target.value)}
								/>
							</div>
						)}
						<div className="space-y-2">
							<Label htmlFor="moderation-reason">
								Justification obligatoire
							</Label>
							<Textarea
								id="moderation-reason"
								maxLength={500}
								value={reason}
								onChange={(e) => setReason(e.target.value)}
							/>
						</div>
						{action === 'ban' &&
							user.subscriptionPlan === 'PREMIUM' &&
							!user.cancelAtPeriodEnd && (
								<label className="flex gap-2 rounded-lg border p-3 text-sm">
									<input
										type="checkbox"
										checked={cancelSubscription}
										onChange={(e) => setCancelSubscription(e.target.checked)}
									/>
									<span>
										<strong>
											Programmer l’annulation Stripe en fin de période.
										</strong>{' '}
										Cette commande reste distincte du bannissement.
									</span>
								</label>
							)}
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={mutation.isPending}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={reason.trim().length < 3 || mutation.isPending}
							onClick={(event) => {
								event.preventDefault();
								mutation.mutate();
							}}
						>
							{mutation.isPending ? 'Traitement…' : 'Confirmer'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

type AccountAction =
	| 'suspend'
	| 'activate'
	| 'ban'
	| 'rehabilitate'
	| 'schedule-deletion'
	| 'cancel-deletion';
const accountStatusLabels = {
	ACTIVE: 'Actif',
	SUSPENDED: 'Suspendu',
	BANNED: 'Banni',
	PENDING_DELETION: 'Suppression programmée',
	ANONYMIZED: 'Anonymisé',
} as const;
const actionsByStatus: Record<
	keyof typeof accountStatusLabels,
	Array<{ action: AccountAction; label: string; danger?: boolean }>
> = {
	ACTIVE: [
		{ action: 'suspend', label: 'Suspendre' },
		{ action: 'ban', label: 'Bannir', danger: true },
		{
			action: 'schedule-deletion',
			label: 'Programmer la suppression',
			danger: true,
		},
	],
	SUSPENDED: [
		{ action: 'activate', label: 'Lever la suspension' },
		{ action: 'ban', label: 'Bannir', danger: true },
		{
			action: 'schedule-deletion',
			label: 'Programmer la suppression',
			danger: true,
		},
	],
	BANNED: [
		{ action: 'rehabilitate', label: 'Réhabiliter' },
		{
			action: 'schedule-deletion',
			label: 'Programmer la suppression',
			danger: true,
		},
	],
	PENDING_DELETION: [
		{ action: 'cancel-deletion', label: 'Annuler la suppression' },
	],
	ANONYMIZED: [],
};
const actionCopy: Record<
	AccountAction,
	{ title: string; description: string }
> = {
	suspend: {
		title: 'Suspendre ce compte ?',
		description:
			'L’accès sera immédiatement bloqué et toutes les sessions seront révoquées. L’abonnement Stripe ne sera pas modifié.',
	},
	activate: {
		title: 'Lever la suspension ?',
		description: 'L’utilisateur pourra de nouveau se connecter.',
	},
	ban: {
		title: 'Bannir ce compte ?',
		description:
			'L’accès sera bloqué durablement. Les données ne seront pas supprimées automatiquement.',
	},
	rehabilitate: {
		title: 'Réhabiliter ce compte ?',
		description:
			'Le bannissement sera levé et l’utilisateur pourra se reconnecter.',
	},
	'schedule-deletion': {
		title: 'Programmer la suppression ?',
		description:
			'L’accès sera bloqué immédiatement. La suppression et l’anonymisation sont prévues dans 30 jours et restent annulables jusque-là.',
	},
	'cancel-deletion': {
		title: 'Annuler la suppression ?',
		description:
			'Le compte retrouvera le statut qu’il avait avant la programmation.',
	},
};

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
			<CardContent className="flex items-center gap-3 p-4">
				<Icon className="size-5 text-primary" />
				<div>
					<p className="text-xs text-neutral-500">{label}</p>
					<p className="text-xl font-semibold text-neutral-900">{value}</p>
				</div>
			</CardContent>
		</Card>
	);
}

function Detail({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<p className="text-xs text-neutral-500">{label}</p>
			<p className="mt-1 text-sm font-medium text-neutral-900">{value}</p>
		</div>
	);
}
