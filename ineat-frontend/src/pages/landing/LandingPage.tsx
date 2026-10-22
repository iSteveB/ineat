import { Link } from '@tanstack/react-router';
import {
	ArrowRight,
	ChefHat,
	Clock,
	Leaf,
	LockKeyhole,
	ScanLine,
	TriangleAlert,
	Wallet,
	type LucideIcon,
} from 'lucide-react';

import foodBowl from '@/assets/landing-food-bowl.webp';
import foodPlate from '@/assets/landing-food-plate.webp';
import stepAdd from '@/assets/landing-step-add.webp';
import stepAlert from '@/assets/landing-step-alert.webp';
import stepBasket from '@/assets/landing-step-basket.webp';
import logoMark from '@/assets/Logo.svg';
import ExpiryBadge from '@/components/common/ExpiryBadge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ExpiryStatus } from '@/schemas';
import { useAuthStore } from '@/stores/authStore';

type Feature = {
	icon: LucideIcon;
	title: string;
	description: string;
	tone: string;
};

const features: Feature[] = [
	{
		icon: Clock,
		title: 'Alertes de péremption',
		description:
			'Une pastille claire sur chaque produit : frais, bientôt, urgent. Vous savez quoi consommer en premier.',
		tone: 'bg-warning-50 text-warning-700',
	},
	{
		icon: ChefHat,
		title: 'Recettes anti-gaspi',
		description:
			"Des idées de repas qui utilisent d'abord les produits qui doivent partir.",
		tone: 'bg-accent-50 text-accent-800',
	},
	{
		icon: ScanLine,
		title: 'Scan et Nutri-Score',
		description:
			'Scannez vos courses et retrouvez la qualité nutritionnelle de votre stock.',
		tone: 'bg-brand-50 text-brand-800',
	},
	{
		icon: Wallet,
		title: 'Budget maîtrisé',
		description:
			'Suivez vos dépenses alimentaires du mois et gardez le contrôle, sans tableur.',
		tone: 'bg-info-50 text-info-700',
	},
];

const steps = [
	{
		title: 'Ajoutez vos aliments',
		description:
			'Scannez, cherchez ou ajoutez manuellement ce que vous avez à la maison.',
		image: stepAdd,
	},
	{
		title: 'Recevez les bonnes alertes',
		description:
			'InEat surveille les dates de péremption et vous prévient au bon moment.',
		image: stepAlert,
	},
	{
		title: 'Consommez mieux, dépensez moins',
		description:
			'Cuisinez ce que vous avez, évitez les achats en double et respectez votre budget.',
		image: stepBasket,
	},
];

const previewProducts: { name: string; meta: string; status: ExpiryStatus; label: string }[] = [
	{ name: 'Yaourt nature bio', meta: '4 pots · Réfrigérateur', status: 'CRITICAL', label: 'Demain' },
	{ name: 'Courgettes', meta: '3 pièces · Légumes', status: 'WARNING', label: 'Dans 3 jours' },
	{ name: 'Lait demi-écrémé', meta: '1 L · Réfrigérateur', status: 'GOOD', label: 'Frais · 9 j' },
];

const LandingHeader = ({
	primaryLink,
	primaryLabel,
}: {
	primaryLink: '/app' | '/register';
	primaryLabel: string;
}) => (
	<header className='sticky top-0 z-30 border-b border-neutral-200 bg-surface/95 backdrop-blur'>
		<div className='mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-8 lg:px-12'>
			<Link
				to='/'
				className='flex items-center gap-2 rounded-md text-neutral-900'
				aria-label='InEat, accueil'>
				<img src={logoMark} alt='' className='size-9 sm:size-10' />
				<span className='font-display text-2xl font-bold tracking-tight'>InEat</span>
			</Link>

			<nav aria-label='Site' className='flex items-center gap-1 sm:gap-2'>
				<a
					href='#fonctionnalites'
					className='hidden rounded-md px-3 py-2 font-medium text-neutral-700 hover:text-accent-700 lg:inline-block'>
					Fonctionnalités
				</a>
				<a
					href='#fonctionnement'
					className='hidden rounded-md px-3 py-2 font-medium text-neutral-700 hover:text-accent-700 lg:inline-block'>
					Comment ça marche
				</a>
				<Button asChild variant='ghost' className='px-3'>
					<Link to='/login'>Se connecter</Link>
				</Button>
				<Button asChild className='hidden sm:inline-flex'>
					<Link to={primaryLink}>{primaryLabel}</Link>
				</Button>
			</nav>
		</div>
	</header>
);

/** Aperçu décoratif de l'app : construit avec les vrais composants du design system. */
const AppPreview = () => (
	<figure
		role='img'
		aria-label="Aperçu de l'application : produits à consommer bientôt, idée de recette et budget du mois"
		className='mx-auto w-full max-w-[340px] rounded-[2rem] border-8 border-neutral-950 bg-canvas p-4 shadow-xl'>
		<div aria-hidden='true' className='flex flex-col gap-3'>
			<div>
				<p className='text-sm text-neutral-600'>Mardi 21 octobre</p>
				<p className='type-h2 text-neutral-900'>Bonjour Camille</p>
			</div>

			<div className='flex gap-3 rounded-lg bg-warning-50 p-3'>
				<span className='flex size-9 shrink-0 items-center justify-center rounded-md bg-surface text-warning-700'>
					<TriangleAlert className='size-5' />
				</span>
				<div>
					<p className='font-bold leading-6 text-neutral-900'>2 produits à traiter</p>
					<p className='text-sm text-neutral-700'>Consommez-les en priorité.</p>
				</div>
			</div>

			<div className='card px-3'>
				{previewProducts.map((product) => (
					<div
						key={product.name}
						className='flex items-center gap-3 border-b border-neutral-200 py-3 last:border-b-0'>
						<div className='min-w-0 flex-1'>
							<p className='truncate font-medium text-neutral-900'>{product.name}</p>
							<p className='truncate text-sm text-neutral-600'>{product.meta}</p>
						</div>
						<ExpiryBadge status={product.status}>{product.label}</ExpiryBadge>
					</div>
				))}
			</div>

			<div className='card p-3'>
				<div className='flex items-baseline justify-between'>
					<p className='font-bold text-neutral-900'>Budget</p>
					<p className='font-display text-lg font-bold text-neutral-900'>
						212 € <span className='text-sm font-normal text-neutral-600'>/ 350 €</span>
					</p>
				</div>
				<div className='mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100'>
					<div className='h-full w-[61%] rounded-full bg-accent-600' />
				</div>
			</div>
		</div>
	</figure>
);

const FeatureCard = ({ feature }: { feature: Feature }) => {
	const Icon = feature.icon;

	return (
		<article className='card p-5'>
			<span
				className={cn(
					'mb-4 flex size-12 items-center justify-center rounded-md',
					feature.tone
				)}>
				<Icon className='size-6' aria-hidden='true' />
			</span>
			<h3 className='type-h3 text-neutral-900'>{feature.title}</h3>
			<p className='mt-2 text-neutral-700'>{feature.description}</p>
		</article>
	);
};

const LandingPage = () => {
	const { isAuthenticated, user } = useAuthStore();
	const isLoggedIn = Boolean(isAuthenticated && user);
	const primaryLink = isLoggedIn ? '/app' : '/register';
	const primaryLabel = isLoggedIn ? 'Ouvrir mon espace' : 'Créer un compte';

	return (
		<div className='min-h-screen bg-surface text-neutral-900'>
			<a
				href='#contenu'
				className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg'>
				Aller au contenu
			</a>

			<LandingHeader primaryLink={primaryLink} primaryLabel={primaryLabel} />

			<main id='contenu'>
				<section className='px-4 pt-4 sm:px-8 sm:pt-8 lg:px-12'>
					<div className='mx-auto grid max-w-7xl items-center gap-10 rounded-xl bg-accent-50 px-5 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.1fr_0.9fr] lg:rounded-2xl lg:px-16 lg:py-20'>
						<div className='max-w-xl'>
							<p className='mb-4 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1 text-sm font-medium text-accent-800'>
								<Leaf className='size-4' aria-hidden='true' />
								Anti-gaspillage et nutrition
							</p>
							<h1 className='type-display text-neutral-900 lg:text-[3.25rem] lg:leading-[3.5rem]'>
								Mangez mieux, gaspillez moins.
							</h1>
							<p className='mt-4 text-lg leading-7 text-neutral-700'>
								InEat suit vos produits, vous prévient avant qu'ils ne se perdent
								et vous propose des recettes avec ce que vous avez déjà.
							</p>

							<div className='mt-8 flex flex-col gap-3 sm:flex-row'>
								<Button asChild size='lg'>
									<Link to={primaryLink}>
										{isLoggedIn ? primaryLabel : 'Commencer gratuitement'}
										<ArrowRight aria-hidden='true' />
									</Link>
								</Button>
								<Button asChild size='lg' variant='secondary'>
									<a href='#fonctionnement'>Voir comment ça marche</a>
								</Button>
							</div>

							<p className='mt-5 text-sm text-accent-800'>
								Gratuit et sans engagement. S'installe sur mobile comme une app.
							</p>
						</div>

						<AppPreview />
					</div>
				</section>

				<section
					id='fonctionnalites'
					aria-labelledby='fonctionnalites-titre'
					className='scroll-mt-20 px-4 py-14 sm:px-8 sm:py-20 lg:px-12'>
					<div className='mx-auto max-w-7xl'>
						<div className='max-w-2xl'>
							<h2 id='fonctionnalites-titre' className='type-h1 text-neutral-900'>
								Tout votre stock alimentaire, sans prise de tête
							</h2>
							<p className='mt-3 text-lg leading-7 text-neutral-700'>
								Quatre outils simples qui travaillent ensemble pour éviter le
								gaspillage et mieux manger.
							</p>
						</div>
						<div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6'>
							{features.map((feature) => (
								<FeatureCard key={feature.title} feature={feature} />
							))}
						</div>
					</div>
				</section>

				<section
					id='fonctionnement'
					aria-labelledby='fonctionnement-titre'
					className='scroll-mt-20 bg-canvas px-4 py-14 sm:px-8 sm:py-20 lg:px-12'>
					<div className='mx-auto max-w-7xl'>
						<h2 id='fonctionnement-titre' className='type-h1 text-neutral-900'>
							Comment ça marche
						</h2>
						<ol className='mt-8 grid gap-6 md:grid-cols-3'>
							{steps.map((step, index) => (
								<li key={step.title} className='card overflow-hidden'>
									<img
										src={step.image}
										alt=''
										loading='lazy'
										className='aspect-[4/3] w-full bg-surface object-contain p-4'
									/>
									<div className='border-t border-neutral-200 p-5'>
										<p className='flex items-center gap-3'>
											<span
												aria-hidden='true'
												className='flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-600 font-bold text-surface'>
												{index + 1}
											</span>
											<span className='type-h3 text-neutral-900'>
												<span className='sr-only'>Étape {index + 1} : </span>
												{step.title}
											</span>
										</p>
										<p className='mt-3 text-neutral-700'>{step.description}</p>
									</div>
								</li>
							))}
						</ol>
					</div>
				</section>

				<section aria-labelledby='cta-titre' className='px-4 py-14 sm:px-8 sm:py-20 lg:px-12'>
					<div className='mx-auto flex max-w-7xl flex-col items-center gap-8 rounded-xl bg-accent-800 px-6 py-12 text-center sm:px-12 lg:flex-row lg:rounded-2xl lg:px-16 lg:text-left'>
						<img
							src={foodPlate}
							alt=''
							loading='lazy'
							className='hidden size-40 shrink-0 rounded-full object-cover lg:block'
						/>
						<div className='flex-1'>
							<h2 id='cta-titre' className='type-h1 text-surface'>
								Prêt à mieux manger et à faire des économies ?
							</h2>
							<p className='mt-3 text-lg leading-7 text-accent-100'>
								Créez votre compte en deux minutes et ajoutez vos premiers produits.
							</p>
							<div className='mt-6 flex flex-col items-center gap-4 sm:flex-row lg:items-center'>
								<Button asChild size='lg' variant='brand'>
									<Link to={primaryLink}>
										{isLoggedIn ? primaryLabel : 'Commencer gratuitement'}
										<ArrowRight aria-hidden='true' />
									</Link>
								</Button>
								<p className='flex items-center gap-2 text-sm text-accent-100'>
									<LockKeyhole className='size-4' aria-hidden='true' />
									Vos données restent privées.
								</p>
							</div>
						</div>
						<img
							src={foodBowl}
							alt=''
							loading='lazy'
							className='hidden size-40 shrink-0 rounded-full object-cover lg:block'
						/>
					</div>
				</section>
			</main>

			<footer className='border-t border-neutral-200 px-4 py-8 sm:px-8 lg:px-12'>
				<div className='mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-neutral-600 sm:flex-row'>
					<p className='flex items-center gap-2'>
						<img src={logoMark} alt='' className='size-6' />
						© {new Date().getFullYear()} InEat
					</p>
					<nav aria-label='Pied de page' className='flex gap-4'>
						<Link to='/login' className='rounded-sm hover:text-accent-700'>
							Se connecter
						</Link>
						<Link to='/register' className='rounded-sm hover:text-accent-700'>
							Créer un compte
						</Link>
					</nav>
				</div>
			</footer>
		</div>
	);
};

export default LandingPage;
