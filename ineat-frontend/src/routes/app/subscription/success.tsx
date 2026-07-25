import { createFileRoute, Link } from '@tanstack/react-router';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/app/subscription/success')({
	component: SubscriptionSuccessPage,
});

function SubscriptionSuccessPage() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mx-auto max-w-xl">
				<Card>
					<CardContent className="p-8 text-center">
						<div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-green-50">
							<CheckCircle2 className="size-8 text-green-600" />
						</div>
						<h1 className="mb-2 text-2xl font-bold">
							Paiement confirmé
						</h1>
						<p className="mb-6 text-muted-foreground">
							Votre abonnement Premium est en cours d’activation.
							Les droits seront synchronisés automatiquement après
							confirmation Stripe.
						</p>
						<Button asChild>
							<Link to="/app/inventory">Retour à l’inventaire</Link>
						</Button>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
