import { Link } from '@tanstack/react-router';
import { ArrowLeft, Crown, ReceiptText, ShieldCheck, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

type PremiumFeatureNoticeProps = {
	title?: string;
	description?: string;
	backTo?: '/app/inventory' | '/app/inventory/add';
};

const premiumBenefits = [
	{
		icon: ReceiptText,
		title: 'Scan de tickets',
		description: 'Importer les articles depuis un ticket sans saisie manuelle.',
	},
	{
		icon: Sparkles,
		title: 'OCR et analyse automatique',
		description: 'Reconnaître les lignes du ticket et préparer la validation.',
	},
	{
		icon: ShieldCheck,
		title: 'Inventaire plus fiable',
		description: 'Réduire les oublis et garder le budget synchronisé.',
	},
];

export function PremiumFeatureNotice({
	title = 'Fonctionnalité réservée à Premium',
	description = 'Le scan de tickets utilise OCR et analyse automatique pour ajouter vos achats plus vite. Cette capacité est réservée aux abonnés Premium.',
	backTo = '/app/inventory/add',
}: PremiumFeatureNoticeProps) {
	return (
		<section className='mx-auto max-w-2xl rounded-lg border border-neutral-200 bg-neutral-50 p-6 shadow-sm'>
			<div className='flex flex-col gap-5'>
				<div className='flex items-start gap-4'>
					<div className='flex size-12 shrink-0 items-center justify-center rounded-md bg-yellow-100 text-yellow-800'>
						<Crown className='size-6' />
					</div>
					<div>
						<h1 className='text-xl font-semibold text-neutral-900'>
							{title}
						</h1>
						<p className='mt-2 text-sm text-neutral-700'>
							{description}
						</p>
					</div>
				</div>

				<div className='grid gap-3 sm:grid-cols-3'>
					{premiumBenefits.map((benefit) => (
						<div
							key={benefit.title}
							className='rounded-md bg-neutral-100 p-3'>
							<benefit.icon className='mb-2 size-5 text-neutral-700' />
							<p className='text-sm font-semibold text-neutral-900'>
								{benefit.title}
							</p>
							<p className='mt-1 text-xs text-neutral-600'>
								{benefit.description}
							</p>
						</div>
					))}
				</div>

				<div className='flex flex-col gap-2 sm:flex-row sm:justify-end'>
					<Button asChild variant='secondary'>
						<Link to={backTo}>
							<ArrowLeft className='size-4' />
							Retour
						</Link>
					</Button>
					<Button asChild>
						<Link to='/app/subscription'>
							<Crown className='size-4' />
							Voir Premium
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}
