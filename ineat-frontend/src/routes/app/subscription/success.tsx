import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/app/subscription/success')({
	component: SubscriptionSuccessPage,
});

function SubscriptionSuccessPage() {
	return (
		<div className='mx-auto flex w-full max-w-xl flex-col px-4 py-10 sm:px-6'>
			<div className='card flex flex-col items-center gap-4 p-8 text-center'>
				<span className='flex size-16 items-center justify-center rounded-full bg-success-50 text-success-700'>
					<CheckCircle2 className='size-8' aria-hidden='true' />
				</span>
				<h1 className='type-h1 text-neutral-900'>Paiement confirmé</h1>
				<p className='text-neutral-600'>
					Votre abonnement Premium est en cours d’activation. Vos droits seront
					synchronisés automatiquement dès la confirmation de Stripe.
				</p>
				<Button asChild>
					<Link to='/app'>Retour à l’accueil</Link>
				</Button>
			</div>
		</div>
	);
}
