import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CircleDollarSign, Mail, Package, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { notificationService } from '@/services/notificationService';
import type { NotificationPreferences } from '@/services/notificationService';

function PreferenceRow({
	title,
	description,
	checked,
	disabled = false,
	onCheckedChange,
	icon,
}: {
	title: string;
	description: string;
	checked: boolean;
	disabled?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	icon: ReactNode;
}) {
	return (
		<div className='flex items-center justify-between gap-4 border-b border-neutral-100 py-4 last:border-0'>
			<div className='flex min-w-0 gap-3'>
				<div className='mt-0.5 text-success-600'>{icon}</div>
				<div>
					<p className='font-medium text-neutral-900'>{title}</p>
					<p className='text-sm text-neutral-600'>{description}</p>
				</div>
			</div>
			<Switch
				checked={checked}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
				aria-label={title}
			/>
		</div>
	);
}

export default function NotificationSettingsPage() {
	const queryClient = useQueryClient();
	const { data: preferences, isLoading, isError } = useQuery({
		queryKey: ['notifications', 'preferences'],
		queryFn: () => notificationService.getPreferences(),
	});
	const mutation = useMutation({
		mutationFn: (changes: Partial<NotificationPreferences>) =>
			notificationService.updatePreferences(changes),
		onSuccess: (updated) => {
			queryClient.setQueryData(['notifications', 'preferences'], updated);
			queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] });
			queryClient.invalidateQueries({
				queryKey: ['notifications', 'unread-count'],
			});
			toast.success('Préférences enregistrées');
		},
		onError: () => toast.error("Impossible d'enregistrer les préférences"),
	});

	const update = (
		key: keyof NotificationPreferences,
		checked: boolean
	) => mutation.mutate({ [key]: checked });

	if (isLoading) {
		return <div className='p-8 text-center'>Chargement des préférences…</div>;
	}

	if (isError || !preferences) {
		return (
			<div className='p-8 text-center text-error-700'>
				Impossible de charger les préférences de notification.
			</div>
		);
	}

	return (
		<div className='mx-auto max-w-3xl space-y-6 p-4 pb-16'>
			<header>
				<h1 className='text-2xl font-semibold text-neutral-900'>
					Notifications
				</h1>
				<p className='mt-1 text-sm text-neutral-600'>
					Choisissez les alertes que vous souhaitez recevoir.
				</p>
			</header>

			<Card>
				<CardHeader>
					<CardTitle>Récapitulatifs email</CardTitle>
				</CardHeader>
				<CardContent>
					<PreferenceRow
						title='Récapitulatif hebdomadaire'
						description='Chaque dimanche à 18 h : produits à consommer, budget et derniers ajouts.'
						checked={preferences.weeklyDigestEnabled}
						disabled={mutation.isPending}
						onCheckedChange={(checked) =>
							update('weeklyDigestEnabled', checked)
						}
						icon={<Mail className='size-5' />}
					/>
					<PreferenceRow
						title='Récapitulatif quotidien'
						description='Chaque matin : produits urgents et nouveaux seuils budgétaires.'
						checked={preferences.dailyDigestEnabled}
						disabled={mutation.isPending}
						onCheckedChange={(checked) =>
							update('dailyDigestEnabled', checked)
						}
						icon={<Mail className='size-5' />}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Canaux</CardTitle>
				</CardHeader>
				<CardContent>
					<PreferenceRow
						title="Notifications dans l'application"
						description='Alertes accessibles depuis la cloche.'
						checked={preferences.inAppEnabled}
						onCheckedChange={(checked) => update('inAppEnabled', checked)}
						icon={<Bell className='size-5' />}
					/>
					<PreferenceRow
						title='Email'
						description='Recevez les alertes métier importantes par email.'
						checked={preferences.emailEnabled}
						disabled={mutation.isPending}
						onCheckedChange={(checked) => update('emailEnabled', checked)}
						icon={<Mail className='size-5' />}
					/>
					<PreferenceRow
						title='Push'
						description='Bientôt disponible sur les appareils compatibles.'
						checked={preferences.pushEnabled}
						disabled
						icon={<Smartphone className='size-5' />}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Types d’alertes in-app</CardTitle>
				</CardHeader>
				<CardContent>
					<PreferenceRow
						title='Péremption'
						description='Produits bientôt périmés ou déjà expirés.'
						checked={preferences.expiry}
						disabled={!preferences.inAppEnabled || mutation.isPending}
						onCheckedChange={(checked) => update('expiry', checked)}
						icon={<Package className='size-5' />}
					/>
					<PreferenceRow
						title='Budget'
						description='Seuils de consommation et dépassements.'
						checked={preferences.budget}
						disabled={!preferences.inAppEnabled || mutation.isPending}
						onCheckedChange={(checked) => update('budget', checked)}
						icon={<CircleDollarSign className='size-5' />}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
