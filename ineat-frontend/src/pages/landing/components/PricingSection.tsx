import { Link } from '@tanstack/react-router';
import { Check, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface PricingSectionProps {
	primaryLink: string;
}

const plans = [
	{
		name: 'Gratuit',
		price: '0 €',
		period: 'pour toujours',
		description: 'L’essentiel pour gérer votre inventaire et réduire le gaspillage.',
		features: [
			'Inventaire illimité',
			'Ajout par scan, recherche ou saisie',
			'Alertes de péremption',
			'Suivi du budget mensuel',
		],
		cta: 'Créer mon compte gratuitement',
		highlighted: false,
	},
	{
		name: 'Premium',
		price: '3,99 €',
		period: 'par mois',
		description: 'Passez à la vitesse supérieure avec l’IA et le suivi avancé.',
		features: [
			'Tout ce qui est inclus dans l’offre gratuite',
			'Recettes générées par IA à volonté',
			'Retrait automatique des ingrédients',
			'Analyse nutritionnelle détaillée',
			'Historique et statistiques de dépenses',
		],
		cta: 'Essayer Premium',
		highlighted: true,
	},
];

const PricingSection = ({ primaryLink }: PricingSectionProps) => (
	<section id='tarifs' className='bg-primary-50/60 py-16 sm:py-24'>
		<div className='mx-auto max-w-6xl px-5 sm:px-8 lg:px-12'>
			<div className='mx-auto max-w-2xl text-center'>
				<span className='inline-flex items-center rounded-full bg-success-50/12 px-4 py-1.5 text-sm font-semibold text-success-50'>
					Tarifs
				</span>
				<h2 className='mt-5 text-3xl font-semibold text-balance text-neutral-300 sm:text-4xl'>
					Commencez gratuitement, sans engagement
				</h2>
				<p className='mt-4 text-lg leading-relaxed text-neutral-300/75'>
					Choisissez l’offre qui vous convient. Aucune carte bancaire requise pour démarrer.
				</p>
			</div>

			<div className='mt-12 grid items-start gap-6 md:grid-cols-2'>
				{plans.map((plan) => (
					<article
						key={plan.name}
						className={`relative flex flex-col rounded-3xl p-8 ${
							plan.highlighted
								? 'border-2 border-success-50 bg-neutral-50 shadow-lg'
								: 'border border-neutral-200 bg-neutral-50'
						}`}>
						{plan.highlighted && (
							<span className='absolute -top-3 left-8 inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-xs font-semibold text-neutral-50'>
								<Sparkles className='size-3.5' />
								Recommandé
							</span>
						)}

						<h3 className='text-xl font-semibold text-neutral-300'>{plan.name}</h3>
						<div className='mt-4 flex items-baseline gap-2'>
							<span className='text-4xl font-semibold text-neutral-300'>{plan.price}</span>
							<span className='text-sm text-neutral-300/60'>{plan.period}</span>
						</div>
						<p className='mt-3 leading-relaxed text-neutral-300/75'>{plan.description}</p>

						<ul className='mt-6 flex flex-1 flex-col gap-3'>
							{plan.features.map((feature) => (
								<li key={feature} className='flex items-start gap-3'>
									<Check
										className='mt-0.5 size-5 shrink-0 text-success-50'
										aria-hidden='true'
									/>
									<span className='text-neutral-300/85'>{feature}</span>
								</li>
							))}
						</ul>

						<Button
							asChild
							variant={plan.highlighted ? 'primary' : 'outline'}
							className='mt-8 h-12 text-base font-semibold'>
							<Link to={primaryLink}>{plan.cta}</Link>
						</Button>
					</article>
				))}
			</div>
		</div>
	</section>
);

export default PricingSection;
