import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Percent, RotateCcw } from 'lucide-react';
import { type FormEvent, useState } from 'react';
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
import {
	adminService,
	type AdminUser,
	type CreatePromotionCodeInput,
} from '@/services/adminService';

type SubscriptionAction = {
	user: AdminUser;
	cancelAtPeriodEnd: boolean;
};

const emptyForm: CreatePromotionCodeInput = {
	code: '',
	name: '',
	discountType: 'PERCENT',
	percentOff: 20,
	duration: 'ONCE',
	firstTimeOnly: false,
	reason: '',
};

const formatDate = (value: string | null) =>
	value
		? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(
				new Date(value)
			)
		: 'Aucune';

const formatDiscount = (promotion: {
	percentOff: number | null;
	amountOff: number | null;
	currency: string | null;
}) =>
	promotion.percentOff !== null
		? `${promotion.percentOff} %`
		: promotion.amountOff !== null
			? new Intl.NumberFormat('fr-FR', {
					style: 'currency',
					currency: promotion.currency ?? 'EUR',
				}).format(promotion.amountOff / 100)
			: 'Voir dans Stripe';

export default function AdminSubscriptionsPage() {
	const queryClient = useQueryClient();
	const [form, setForm] = useState<CreatePromotionCodeInput>(emptyForm);
	const [createConfirmationOpen, setCreateConfirmationOpen] = useState(false);
	const [promotionToDeactivate, setPromotionToDeactivate] = useState<
		string | null
	>(null);
	const [subscriptionAction, setSubscriptionAction] =
		useState<SubscriptionAction | null>(null);
	const [actionReason, setActionReason] = useState('');

	const promotionsQuery = useQuery({
		queryKey: adminKeys.promotions,
		queryFn: adminService.listPromotionCodes,
	});
	const subscribersQuery = useQuery({
		queryKey: adminKeys.premiumUsers,
		queryFn: () => adminService.listUsers({ plan: 'PREMIUM', pageSize: 50 }),
	});
	const refreshPromotions = () =>
		queryClient.invalidateQueries({ queryKey: adminKeys.promotions });
	const createMutation = useMutation({
		mutationFn: adminService.createPromotionCode,
		onSuccess: () => {
			refreshPromotions();
			setForm(emptyForm);
			setCreateConfirmationOpen(false);
			toast.success('Code promotionnel créé dans Stripe');
		},
		onError: (error: Error) => toast.error(error.message),
	});
	const deactivateMutation = useMutation({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			adminService.deactivatePromotionCode(id, reason),
		onSuccess: () => {
			refreshPromotions();
			closeActionDialog();
			toast.success('Code promotionnel désactivé');
		},
		onError: (error: Error) => toast.error(error.message),
	});
	const subscriptionMutation = useMutation({
		mutationFn: ({
			user,
			cancelAtPeriodEnd,
			reason,
		}: SubscriptionAction & { reason: string }) =>
			adminService.setSubscriptionCancellation(
				user.id,
				cancelAtPeriodEnd,
				reason
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminKeys.usersRoot });
			closeActionDialog();
			toast.success('Commande transmise à Stripe');
		},
		onError: (error: Error) => toast.error(error.message),
	});

	const submitPromotion = (event: FormEvent) => {
		event.preventDefault();
		setCreateConfirmationOpen(true);
	};
	const confirmPromotionCreation = () => {
		createMutation.mutate({
			...form,
			code: form.code.trim().toUpperCase(),
			name: form.name.trim(),
			reason: form.reason.trim(),
			expiresAt: form.expiresAt || undefined,
			stripeCustomerId: form.stripeCustomerId?.trim() || undefined,
		});
	};
	const closeActionDialog = () => {
		setPromotionToDeactivate(null);
		setSubscriptionAction(null);
		setActionReason('');
	};
	const confirmAction = () => {
		if (actionReason.trim().length < 3) return;
		if (promotionToDeactivate) {
			deactivateMutation.mutate({
				id: promotionToDeactivate,
				reason: actionReason.trim(),
			});
		} else if (subscriptionAction) {
			subscriptionMutation.mutate({
				...subscriptionAction,
				reason: actionReason.trim(),
			});
		}
	};

	const promotions = promotionsQuery.data ?? [];
	const subscribers = subscribersQuery.data?.items ?? [];
	return (
		<div className='space-y-8'>
			<header>
				<p className='text-sm font-medium text-primary'>Stripe</p>
				<h1 className='text-2xl font-semibold text-neutral-900'>
					Promotions et abonnements
				</h1>
				<p className='mt-1 text-sm text-neutral-600'>
					Les droits restent en lecture seule dans InEat. Toutes les commandes
					ci-dessous sont exécutées chez Stripe.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<Percent className='size-5' /> Créer une promotion
					</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'
						onSubmit={submitPromotion}
					>
						<Field label='Code'>
							<Input
								required
								minLength={3}
								pattern='[A-Za-z0-9-]+'
								value={form.code}
								onChange={(e) => setForm({ ...form, code: e.target.value })}
								placeholder='BIENVENUE20'
							/>
						</Field>
						<Field label='Nom de campagne'>
							<Input
								required
								minLength={3}
								value={form.name}
								onChange={(e) => setForm({ ...form, name: e.target.value })}
								placeholder='Offre de bienvenue'
							/>
						</Field>
						<Field label='Type de remise'>
							<NativeSelect
								value={form.discountType}
								onChange={(value) =>
									setForm({
										...form,
										discountType: value as 'PERCENT' | 'FIXED',
									})
								}
								options={[
									['PERCENT', 'Pourcentage'],
									['FIXED', 'Montant fixe'],
								]}
							/>
						</Field>
						<Field
							label={
								form.discountType === 'PERCENT'
									? 'Pourcentage'
									: 'Montant en centimes'
							}
						>
							<Input
								required
								type='number'
								min={1}
								max={form.discountType === 'PERCENT' ? 100 : undefined}
								value={
									form.discountType === 'PERCENT'
										? (form.percentOff ?? '')
										: (form.amountOff ?? '')
								}
								onChange={(e) =>
									setForm(
										form.discountType === 'PERCENT'
											? {
													...form,
													percentOff: Number(e.target.value),
													amountOff: undefined,
												}
											: {
													...form,
													amountOff: Number(e.target.value),
													percentOff: undefined,
												}
									)
								}
							/>
						</Field>
						<Field label='Durée'>
							<NativeSelect
								value={form.duration}
								onChange={(value) =>
									setForm({
										...form,
										duration: value as CreatePromotionCodeInput['duration'],
									})
								}
								options={[
									['ONCE', 'Une fois'],
									['REPEATING', 'Plusieurs mois'],
									['FOREVER', 'Sans limite de durée'],
								]}
							/>
						</Field>
						{form.duration === 'REPEATING' && (
							<Field label='Nombre de mois'>
								<Input
									required
									type='number'
									min={1}
									max={36}
									value={form.durationInMonths ?? ''}
									onChange={(e) =>
										setForm({
											...form,
											durationInMonths: Number(e.target.value),
										})
									}
								/>
							</Field>
						)}
						<Field label="Date d'expiration">
							<Input
								type='datetime-local'
								value={form.expiresAt ?? ''}
								onChange={(e) =>
									setForm({
										...form,
										expiresAt: e.target.value
											? new Date(e.target.value).toISOString()
											: undefined,
									})
								}
							/>
						</Field>
						<Field label="Nombre maximal d'utilisations">
							<Input
								type='number'
								min={1}
								value={form.maxRedemptions ?? ''}
								onChange={(e) =>
									setForm({
										...form,
										maxRedemptions: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
							/>
						</Field>
						<Field label='Client Stripe (facultatif)'>
							<Input
								value={form.stripeCustomerId ?? ''}
								onChange={(e) =>
									setForm({ ...form, stripeCustomerId: e.target.value })
								}
								placeholder='cus_…'
							/>
						</Field>
						<label className='flex items-center gap-2 self-end pb-2 text-sm text-neutral-700'>
							<input
								type='checkbox'
								checked={form.firstTimeOnly}
								onChange={(e) =>
									setForm({ ...form, firstTimeOnly: e.target.checked })
								}
							/>{' '}
							Première transaction uniquement
						</label>
						<div className='md:col-span-2 xl:col-span-4'>
							<Field label='Justification obligatoire'>
								<Textarea
									required
									minLength={3}
									value={form.reason}
									onChange={(e) => setForm({ ...form, reason: e.target.value })}
									placeholder='Campagne validée pour…'
								/>
							</Field>
						</div>
						<div className='md:col-span-2 xl:col-span-4'>
							<Button type='submit' disabled={createMutation.isPending}>
								Créer dans Stripe
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Codes promotionnels</CardTitle>
				</CardHeader>
				<CardContent className='p-0'>
					{promotionsQuery.isLoading ? (
						<p className='p-6 text-sm'>Chargement…</p>
					) : promotionsQuery.isError ? (
						<div className='space-y-3 p-6 text-sm text-error-700'>
							<p>Impossible de charger les promotions Stripe.</p>
							<Button
								variant='outline'
								size='sm'
								onClick={() => promotionsQuery.refetch()}
							>
								Réessayer
							</Button>
						</div>
					) : promotions.length === 0 ? (
						<p className='p-6 text-sm text-neutral-600'>
							Aucun code promotionnel.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Code</TableHead>
									<TableHead>Remise</TableHead>
									<TableHead>État</TableHead>
									<TableHead>Utilisations</TableHead>
									<TableHead>Expiration</TableHead>
									<TableHead>Portée</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{promotions.map((promotion) => (
									<TableRow key={promotion.id}>
										<TableCell>
											<p className='font-mono font-medium'>{promotion.code}</p>
											<p className='text-xs text-neutral-500'>
												{promotion.name}
											</p>
										</TableCell>
										<TableCell>{formatDiscount(promotion)}</TableCell>
										<TableCell>
											<Badge
												variant={promotion.active ? 'secondary' : 'outline'}
											>
												{promotion.active ? 'Actif' : 'Inactif'}
											</Badge>
										</TableCell>
										<TableCell>
											{promotion.timesRedeemed}
											{promotion.maxRedemptions
												? ` / ${promotion.maxRedemptions}`
												: ''}
										</TableCell>
										<TableCell>{formatDate(promotion.expiresAt)}</TableCell>
										<TableCell>
											{promotion.customerId ?? 'Tous les clients'}
										</TableCell>
										<TableCell>
											{promotion.active && (
												<Button
													variant='outline'
													size='sm'
													onClick={() => setPromotionToDeactivate(promotion.id)}
												>
													<Ban className='size-4' /> Désactiver
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Abonnements Premium</CardTitle>
				</CardHeader>
				<CardContent className='p-0'>
					{subscribersQuery.isLoading ? (
						<p className='p-6 text-sm'>Chargement…</p>
					) : subscribersQuery.isError ? (
						<div className='space-y-3 p-6 text-sm text-error-700'>
							<p>Impossible de charger les abonnements.</p>
							<Button
								variant='outline'
								size='sm'
								onClick={() => subscribersQuery.refetch()}
							>
								Réessayer
							</Button>
						</div>
					) : subscribers.length === 0 ? (
						<p className='p-6 text-sm text-neutral-600'>
							Aucun abonnement Premium.
						</p>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Utilisateur</TableHead>
									<TableHead>Échéance</TableHead>
									<TableHead>État Stripe</TableHead>
									<TableHead />
								</TableRow>
							</TableHeader>
							<TableBody>
								{subscribers.map((user) => (
									<TableRow key={user.id}>
										<TableCell>
											<p className='font-medium'>
												{user.firstName} {user.lastName}
											</p>
											<p className='text-xs text-neutral-500'>{user.email}</p>
										</TableCell>
										<TableCell>
											{formatDate(user.currentPeriodEndsAt)}
										</TableCell>
										<TableCell>
											{user.stripeSubscriptionId ? (
												<Badge variant='outline'>
													{user.cancelAtPeriodEnd
														? 'Annulation programmée'
														: 'Actif'}
												</Badge>
											) : (
												<span className='text-xs text-neutral-500'>
													Non associé
												</span>
											)}
										</TableCell>
										<TableCell>
											{user.stripeSubscriptionId && (
												<Button
													variant='outline'
													size='sm'
													onClick={() =>
														setSubscriptionAction({
															user,
															cancelAtPeriodEnd: !user.cancelAtPeriodEnd,
														})
													}
												>
													{user.cancelAtPeriodEnd ? (
														<>
															<RotateCcw className='size-4' /> Retirer
															l’annulation
														</>
													) : (
														<>
															<Ban className='size-4' /> Annuler à l’échéance
														</>
													)}
												</Button>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<AlertDialog
				open={Boolean(promotionToDeactivate || subscriptionAction)}
				onOpenChange={(open) => !open && closeActionDialog()}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirmer la commande Stripe</AlertDialogTitle>
						<AlertDialogDescription>
							Cette action modifie un objet Stripe et sera enregistrée dans le
							journal d’audit.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<Field label='Justification obligatoire'>
						<Textarea
							value={actionReason}
							onChange={(e) => setActionReason(e.target.value)}
						/>
					</Field>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={closeActionDialog}>
							Annuler
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={
								actionReason.trim().length < 3 ||
								deactivateMutation.isPending ||
								subscriptionMutation.isPending
							}
							onClick={confirmAction}
						>
							Confirmer
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog
				open={createConfirmationOpen}
				onOpenChange={setCreateConfirmationOpen}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Créer le code {form.code.trim().toUpperCase()} dans Stripe ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							La remise sera immédiatement disponible dans Checkout. Ses
							paramètres financiers ne pourront plus être modifiés.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Revenir au formulaire</AlertDialogCancel>
						<AlertDialogAction
							disabled={createMutation.isPending}
							onClick={confirmPromotionCreation}
						>
							Confirmer la création
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<Label className='flex flex-col items-stretch gap-1.5'>
			<span>{label}</span>
			{children}
		</Label>
	);
}

function NativeSelect({
	value,
	onChange,
	options,
}: {
	value: string;
	onChange: (value: string) => void;
	options: Array<[string, string]>;
}) {
	return (
		<select
			className='h-9 w-full rounded-md border bg-white px-3 text-sm'
			value={value}
			onChange={(e) => onChange(e.target.value)}
		>
			{options.map(([optionValue, label]) => (
				<option key={optionValue} value={optionValue}>
					{label}
				</option>
			))}
		</select>
	);
}
