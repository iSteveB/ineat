import React, { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
	AlertTriangle,
	ChefHat,
	Check,
	ChevronLeft,
	CreditCard,
	FileText,
	Loader2,
	Lock,
	ShieldCheck,
	Sparkles,
	Wallet,
	X,
	type LucideIcon,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRefreshUser, useUser } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import type { SubscriptionPlan as UserSubscriptionPlan } from '@/schemas';
import {
	billingService,
	type BillingInterval,
} from '@/services/billingService';

// ===== TYPES =====

type SubscriptionType = 'FREE' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY';

interface SubscriptionPlan {
	id: SubscriptionType;
	name: string;
	price: number;
	priceDisplay: string;
	period?: string;
	description: string;
	features: string[];
	limitations?: string[];
	popular?: boolean;
	buttonText: string;
	checkoutInterval?: BillingInterval;
}

const formatDate = (date?: string | null) => {
	if (!date) return null;

	return new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
	}).format(new Date(date));
};

const plural = (count: number, word: string) =>
	`${count} ${word}${count > 1 ? 's' : ''}`;

// ===== DONNÉES DES PLANS =====

const subscriptionPlans: SubscriptionPlan[] = [
	{
		id: 'FREE',
		name: 'Gratuit',
		price: 0,
		priceDisplay: '0 €',
		description: 'Pour découvrir InEat.',
		features: [
			'Inventaire limité à 50 articles',
			'Ajout manuel des produits',
			'Suivi des dates de péremption',
			'Budget alimentaire manuel',
		],
		limitations: [
			'Pas de recettes',
			'Pas de génération IA de recettes',
			'Pas d’import de facture Drive',
		],
		buttonText: 'Plan actuel',
	},
	{
		id: 'PREMIUM_MONTHLY',
		name: 'Premium mensuel',
		price: 5.99,
		priceDisplay: '5,99 €',
		period: '/mois',
		description: 'Sans engagement, facturé chaque mois.',
		features: [
			'Tout le plan Gratuit',
			'Inventaire jusqu’à 500 articles',
			'Recettes depuis l’inventaire',
			'100 générations IA de recettes par mois',
			'25 imports Drive par mois',
			'Synchronisation avec le budget alimentaire',
		],
		buttonText: 'Commencer Premium',
		checkoutInterval: 'MONTHLY',
	},
	{
		id: 'PREMIUM_YEARLY',
		name: 'Premium annuel',
		price: 59.99,
		priceDisplay: '59,99 €',
		period: '/an',
		description: 'Soit 5,00 € par mois : environ 2 mois offerts.',
		features: [
			'Tout le plan Premium mensuel',
			'Inventaire jusqu’à 500 articles',
			'100 générations IA de recettes par mois',
			'25 imports Drive par mois',
			'Annulation possible avant le renouvellement',
		],
		popular: true,
		buttonText: 'Choisir l’annuel',
		checkoutInterval: 'YEARLY',
	},
];

const highlights: { icon: LucideIcon; title: string; text: string }[] = [
	{
		icon: ChefHat,
		title: 'Recettes et IA',
		text: 'Des idées de repas avec ce que vous avez déjà, et un quota toujours visible.',
	},
	{
		icon: FileText,
		title: 'Import Drive',
		text: 'Importez vos factures Drive pour remplir votre inventaire d’un coup.',
	},
	{
		icon: Wallet,
		title: 'Budget synchronisé',
		text: 'Les achats importés mettent votre budget alimentaire à jour.',
	},
];

// ===== SOUS-COMPOSANTS =====

const QuotaCard = ({
	label,
	value,
	warning,
}: {
	label: string;
	value: string;
	warning?: string;
}) => (
	<li
		className={cn(
			'card flex flex-col gap-1 p-4',
			warning && 'border-warning-700/30 bg-warning-50'
		)}>
		<span className='text-xs font-semibold uppercase tracking-wide text-neutral-600'>
			{label}
		</span>
		<span className='type-h3 text-neutral-900'>{value}</span>
		{warning && (
			<span className='flex items-start gap-1.5 text-sm text-warning-700'>
				<AlertTriangle className='mt-0.5 size-4 shrink-0' aria-hidden='true' />
				{warning}
			</span>
		)}
	</li>
);

const Spinner = () => <Loader2 className='animate-spin' aria-hidden='true' />;

// ===== COMPOSANT PRINCIPAL =====

/**
 * Page Abonnement : statut, quotas, formules et gestion Stripe.
 */
export const SubscriptionPage: React.FC = () => {
	const { data: user, isLoading: userLoading } = useUser();
	const refreshUser = useRefreshUser();
	const [isProcessing, setIsProcessing] = useState(false);
	const [isTrialStarting, setIsTrialStarting] = useState(false);
	const [isPortalOpening, setIsPortalOpening] = useState(false);

	const currentPlan: UserSubscriptionPlan = user?.subscriptionPlan || 'FREE';
	const effectivePlan = user?.effectivePlan || 'FREE';
	const isPremium = effectivePlan === 'PREMIUM';
	const isTrial = currentPlan === 'TRIAL';
	const isTrialExpired =
		currentPlan === 'TRIAL' && user?.subscriptionStatus === 'EXPIRED';
	const isPremiumExpired =
		currentPlan === 'PREMIUM' && user?.subscriptionStatus === 'EXPIRED';
	const canStartTrial = currentPlan === 'FREE' && !isPremium && !isTrialExpired;
	const capabilities = user?.capabilities;
	const trialEndsAt = formatDate(user?.trialEndsAt);
	const currentPeriodEndsAt = formatDate(user?.currentPeriodEndsAt);
	const isCancelledAtPeriodEnd =
		user?.subscriptionStatus === 'CANCELLED' && Boolean(user?.cancelAtPeriodEnd);
	const aiQuotaReached = Boolean(
		capabilities &&
			isPremium &&
			capabilities.canGenerateAiRecipes &&
			capabilities.aiRecipeGenerationRemaining === 0
	);
	const aiImageQuotaReached = Boolean(
		capabilities &&
			isPremium &&
			capabilities.canGenerateAiRecipes &&
			capabilities.aiRecipeImageGenerationRemaining === 0
	);
	const driveQuotaReached = Boolean(
		capabilities &&
			isPremium &&
			capabilities.canImportDrive &&
			capabilities.driveImportsRemaining === 0
	);

	// ===== HANDLERS =====

	const handleSubscribe = async (plan: SubscriptionPlan) => {
		if (plan.id === 'FREE' && currentPlan === 'FREE' && !isTrialExpired) {
			toast.info('Vous êtes déjà sur ce plan');
			return;
		}

		if (!plan.checkoutInterval) {
			toast.info('Ce changement de plan sera bientôt disponible.');
			return;
		}

		setIsProcessing(true);

		try {
			const checkoutSession = await billingService.createCheckoutSession(
				plan.checkoutInterval
			);
			window.location.assign(checkoutSession.url);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Erreur lors de la souscription';
			toast.error(errorMessage);
		} finally {
			setIsProcessing(false);
		}
	};

	const handleStartTrial = async () => {
		setIsTrialStarting(true);

		try {
			await billingService.startTrial();
			await refreshUser();
			toast.success('Votre essai Premium est actif pendant 3 jours.');
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Impossible d'activer l'essai gratuit.";
			toast.error(errorMessage);
		} finally {
			setIsTrialStarting(false);
		}
	};

	const handleManageSubscription = async () => {
		setIsPortalOpening(true);

		try {
			const portalSession = await billingService.createPortalSession();
			window.location.assign(portalSession.url);
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: "Impossible d'ouvrir la gestion de l'abonnement.";
			toast.error(errorMessage);
		} finally {
			setIsPortalOpening(false);
		}
	};

	// ===== RENDU =====

	const renderPlanStatus = () => {
		if (isPremiumExpired) {
			return (
				<Alert variant='warning'>
					<AlertTriangle aria-hidden='true' />
					<AlertTitle>Paiement non confirmé</AlertTitle>
					<AlertDescription>
						Vos données sont conservées. Choisissez une offre Premium pour réactiver
						l’accès.
					</AlertDescription>
				</Alert>
			);
		}

		if (isTrialExpired) {
			return (
				<Alert variant='warning'>
					<AlertTriangle aria-hidden='true' />
					<AlertDescription>
						Votre essai Premium est terminé. Vos données sont conservées.
					</AlertDescription>
				</Alert>
			);
		}

		if (isTrial) {
			return (
				<Alert variant='success' role='status'>
					<Sparkles aria-hidden='true' />
					<AlertDescription>
						Essai actif : vous avez les droits Premium jusqu’au{' '}
						{trialEndsAt ?? 'terme de l’essai'}.
					</AlertDescription>
				</Alert>
			);
		}

		if (isCancelledAtPeriodEnd) {
			return (
				<Alert variant='warning' role='status'>
					<AlertTriangle aria-hidden='true' />
					<AlertDescription>
						Votre abonnement restera actif jusqu’au{' '}
						{currentPeriodEndsAt ?? 'terme de la période payée'}.
					</AlertDescription>
				</Alert>
			);
		}

		if (!isPremium) {
			return (
				<Alert variant='primary' role='status'>
					<Sparkles aria-hidden='true' />
					<AlertDescription>
						Essayez Premium gratuitement pendant 3 jours, sans carte bancaire.
					</AlertDescription>
				</Alert>
			);
		}

		return null;
	};

	const renderSubscriptionManagement = () => {
		if (!isPremium || isTrial) return null;

		return (
			<section
				aria-labelledby='subscription-manage'
				className='card flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-center md:justify-between'>
				<div>
					<h2 id='subscription-manage' className='type-h3 text-neutral-900'>
						Gestion de l’abonnement
					</h2>
					<p className='text-sm text-neutral-600'>
						{isCancelledAtPeriodEnd
							? `Premium reste actif jusqu’au ${currentPeriodEndsAt ?? 'terme de la période payée'}.`
							: `Facturation ${user?.billingInterval === 'YEARLY' ? 'annuelle' : 'mensuelle'} gérée par Stripe${
									currentPeriodEndsAt ? `, renouvellement le ${currentPeriodEndsAt}` : ''
								}.`}
					</p>
				</div>
				<Button
					variant='secondary'
					onClick={handleManageSubscription}
					disabled={isPortalOpening || isProcessing}
					className='shrink-0'>
					{isPortalOpening ? <Spinner /> : <CreditCard aria-hidden='true' />}
					{isPortalOpening ? 'Ouverture…' : 'Gérer mon abonnement'}
				</Button>
			</section>
		);
	};

	const renderQuotaSummary = () => {
		if (!capabilities) return null;

		return (
			<section aria-labelledby='subscription-quotas' className='flex flex-col gap-3'>
				<h2 id='subscription-quotas' className='type-h2 text-neutral-900'>
					Vos quotas
				</h2>
				<ul className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
					<QuotaCard
						label='Inventaire'
						value={plural(capabilities.inventoryLimit, 'article')}
					/>
					<QuotaCard
						label='IA recettes'
						value={plural(capabilities.aiRecipeGenerationRemaining, 'restante')}
						warning={aiQuotaReached ? 'Quota quotidien de recettes atteint.' : undefined}
					/>
					<QuotaCard
						label='Images recettes'
						value={plural(capabilities.aiRecipeImageGenerationRemaining, 'restante')}
						warning={
							aiImageQuotaReached
								? 'Quota quotidien d’images atteint. Les recettes restent sauvegardables sans image.'
								: undefined
						}
					/>
					<QuotaCard
						label='Drive'
						value={plural(capabilities.driveImportsRemaining, 'import')}
						warning={
							driveQuotaReached
								? 'Quota Drive atteint. Le prochain import sera disponible au renouvellement.'
								: undefined
						}
					/>
				</ul>
			</section>
		);
	};

	const renderPlanCard = (plan: SubscriptionPlan) => {
		const isCurrentPlan = plan.id === currentPlan;
		const isPaidPlan = plan.id === 'PREMIUM_MONTHLY' || plan.id === 'PREMIUM_YEARLY';
		const isPremiumCurrentPlan =
			isPaidPlan && currentPlan === 'PREMIUM' && isPremium && !isPremiumExpired;
		const isActive = isCurrentPlan || isPremiumCurrentPlan;
		const headingId = `plan-${plan.id}`;

		return (
			<li
				key={plan.id}
				aria-labelledby={headingId}
				className={cn(
					'card relative flex flex-col gap-5 p-5 sm:p-6',
					plan.popular && 'border-2 border-accent-600',
					isActive && 'bg-accent-50'
				)}>
				<div className='flex flex-col gap-2'>
					<div className='flex flex-wrap items-center gap-2'>
						<h3 id={headingId} className='type-h3 text-neutral-900'>
							{plan.name}
						</h3>
						{plan.popular && <Badge variant='secondary'>Le plus avantageux</Badge>}
						{isActive && (
							<Badge variant='premium'>
								<ShieldCheck aria-hidden='true' />
								Plan actuel
							</Badge>
						)}
					</div>
					<p className='flex items-baseline gap-1 text-neutral-900'>
						<span className='type-stat'>{plan.priceDisplay}</span>
						{plan.period && <span className='text-neutral-600'>{plan.period}</span>}
					</p>
					<p className='text-sm text-neutral-600'>{plan.description}</p>
				</div>

				<ul className='flex flex-col gap-2.5' aria-label='Inclus'>
					{plan.features.map((feature) => (
						<li key={feature} className='flex items-start gap-2.5 text-sm text-neutral-800'>
							<Check className='mt-0.5 size-4 shrink-0 text-success-700' aria-hidden='true' />
							{feature}
						</li>
					))}
				</ul>

				{plan.limitations && (
					<ul
						className='flex flex-col gap-2.5 border-t border-neutral-200 pt-4'
						aria-label='Non inclus'>
						{plan.limitations.map((limitation) => (
							<li key={limitation} className='flex items-start gap-2.5 text-sm text-neutral-600'>
								<X className='mt-0.5 size-4 shrink-0 text-neutral-500' aria-hidden='true' />
								{limitation}
							</li>
						))}
					</ul>
				)}

				<div className='mt-auto flex flex-col gap-2'>
					<Button
						onClick={() => handleSubscribe(plan)}
						disabled={isActive || isProcessing}
						variant={plan.popular ? 'primary' : 'secondary'}
						className='w-full'>
						{isProcessing && !isActive ? (
							<>
								<Spinner />
								Traitement…
							</>
						) : isPremiumCurrentPlan ? (
							'Premium actif'
						) : (
							plan.buttonText
						)}
					</Button>

					{!isPremium && plan.id === 'PREMIUM_MONTHLY' && (
						<>
							<Button
								onClick={handleStartTrial}
								disabled={!canStartTrial || isProcessing || isTrialStarting}
								variant='ghost'
								className='w-full'>
								{isTrialStarting ? (
									<>
										<Spinner />
										Activation…
									</>
								) : canStartTrial ? (
									'Essayer 3 jours gratuitement'
								) : (
									'Essai déjà utilisé'
								)}
							</Button>
							<p className='text-center text-xs text-neutral-600'>Sans carte bancaire</p>
						</>
					)}
				</div>
			</li>
		);
	};

	// ===== RENDU PRINCIPAL =====

	if (userLoading) {
		return (
			<div
				role='status'
				className='flex min-h-64 items-center justify-center gap-2 text-neutral-600'>
				<Loader2 className='size-5 animate-spin text-accent-700' aria-hidden='true' />
				Chargement de votre abonnement…
			</div>
		);
	}

	return (
		<div className='mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-4 sm:px-6 lg:py-6'>
			<Button asChild variant='ghost' className='-ml-3 self-start'>
				<Link to='/app/settings'>
					<ChevronLeft aria-hidden='true' />
					Paramètres
				</Link>
			</Button>

			<header className='flex flex-col gap-1'>
				<h1 className='type-h1 text-neutral-900'>Abonnement</h1>
				<p className='max-w-2xl text-neutral-600'>
					Premium débloque les recettes, l’IA, les imports Drive, le budget synchronisé et
					des limites étendues.
				</p>
			</header>

			{renderPlanStatus()}
			{renderSubscriptionManagement()}
			{renderQuotaSummary()}

			<section aria-labelledby='subscription-plans' className='flex flex-col gap-3'>
				<h2 id='subscription-plans' className='type-h2 text-neutral-900'>
					Choisissez votre formule
				</h2>
				<ul className='grid gap-4 md:grid-cols-3'>
					{subscriptionPlans.map(renderPlanCard)}
				</ul>
			</section>

			<section aria-labelledby='subscription-highlights' className='flex flex-col gap-3'>
				<h2 id='subscription-highlights' className='type-h2 text-neutral-900'>
					Ce que Premium change
				</h2>
				<ul className='grid gap-3 md:grid-cols-3'>
					{highlights.map(({ icon: Icon, title, text }) => (
						<li key={title} className='card flex gap-3 p-4'>
							<span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-800'>
								<Icon className='size-5' aria-hidden='true' />
							</span>
							<span>
								<span className='block font-semibold text-neutral-900'>{title}</span>
								<span className='block text-sm text-neutral-600'>{text}</span>
							</span>
						</li>
					))}
				</ul>
			</section>

			<ul className='flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-neutral-600'>
				<li className='flex items-center gap-1.5'>
					<Lock className='size-4' aria-hidden='true' />
					Paiement sécurisé par Stripe
				</li>
				<li className='flex items-center gap-1.5'>
					<X className='size-4' aria-hidden='true' />
					Annulation à tout moment
				</li>
				<li className='flex items-center gap-1.5'>
					<Sparkles className='size-4' aria-hidden='true' />
					Après l’essai, le plan Gratuit s’applique automatiquement
				</li>
			</ul>
		</div>
	);
};

export default SubscriptionPage;
