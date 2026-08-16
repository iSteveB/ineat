import { Link } from '@tanstack/react-router';
import {
	ArrowRight,
	Bell,
	Check,
	ChefHat,
	CirclePlay,
	Euro,
	Leaf,
	LockKeyhole,
	PiggyBank,
	Sparkles,
	TrendingDown,
} from 'lucide-react';

import foodBowl from '@/assets/landing-food-bowl.png';
import foodPlate from '@/assets/landing-food-plate.png';
import heroKitchen from '@/assets/landing-hero-kitchen.png';
import stepAdd from '@/assets/landing-step-add.png';
import stepAlert from '@/assets/landing-step-alert.png';
import stepBasket from '@/assets/landing-step-basket.png';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

import FaqSection from './components/FaqSection';
import FeaturesSection from './components/FeaturesSection';
import HeroPhone from './components/HeroPhone';
import LandingFooter from './components/LandingFooter';
import LandingHeader from './components/LandingHeader';
import PricingSection from './components/PricingSection';

const benefits = [
	{
		icon: Leaf,
		title: 'Moins de gaspillage',
		description:
			'Évitez de jeter des aliments encore bons. Un geste pour votre portefeuille et la planète.',
		tone: 'bg-success-50/12 text-success-50',
	},
	{
		icon: Bell,
		title: 'Alertes péremption',
		description:
			"Soyez notifié avant qu'un aliment n'arrive à expiration pour le consommer à temps.",
		tone: 'bg-primary-100/18 text-[#F2A400]',
	},
	{
		icon: Euro,
		title: 'Budget maîtrisé',
		description:
			'Suivez vos dépenses alimentaires et gardez le contrôle sur votre budget.',
		tone: 'bg-success-50/12 text-success-50',
	},
	{
		icon: ChefHat,
		title: 'Idées de recettes',
		description:
			'Recevez des idées de repas adaptées à ce que vous avez déjà dans votre inventaire.',
		tone: 'bg-primary-100/18 text-[#F2A400]',
	},
];

const steps = [
	{
		number: '1',
		title: 'Ajoutez vos aliments',
		description:
			'Scannez, cherchez ou ajoutez manuellement ce que vous avez à la maison.',
		image: stepAdd,
	},
	{
		number: '2',
		title: 'Recevez les alertes utiles',
		description:
			'InEat surveille les dates de péremption et vous alerte au bon moment.',
		image: stepAlert,
	},
	{
		number: '3',
		title: 'Cuisinez mieux, dépensez moins',
		description:
			'Planifiez vos repas, évitez les achats inutiles et respectez votre budget.',
		image: stepBasket,
	},
];

const proofPoints = [
	{
		icon: TrendingDown,
		stat: 'Moins de pertes',
		description:
			'En gardant un œil sur les dates de péremption, un foyer réduit naturellement les aliments jetés chaque semaine.',
	},
	{
		icon: PiggyBank,
		stat: 'Des courses plus justes',
		description:
			'Savoir ce qu’il reste à la maison évite les achats en double et allège la facture du mois.',
	},
	{
		icon: Sparkles,
		stat: 'Des repas sans prise de tête',
		description:
			'Les suggestions de recettes s’appuient sur votre inventaire réel : moins de « qu’est-ce qu’on mange ce soir ? ».',
	},
];

const LandingPage = () => {
	const { isAuthenticated, user } = useAuthStore();
	const primaryLink = isAuthenticated && user ? '/app' : '/register';
	const primaryLabel = isAuthenticated && user ? 'Ouvrir mon espace' : 'Créer mon compte';

	return (
		<div className='min-h-screen bg-neutral-50 font-fredoka text-neutral-300'>
			<LandingHeader primaryLink={primaryLink} primaryLabel={primaryLabel} />

			{/* HERO */}
			<section className='relative overflow-hidden bg-primary-50'>
				<div
					className='absolute inset-0 bg-cover bg-center opacity-75'
					style={{ backgroundImage: `url(${heroKitchen})` }}
					aria-hidden='true'
				/>
				<div className='absolute inset-0 bg-linear-to-r from-neutral-50 via-neutral-50/94 to-neutral-50/45' />
				<div className='relative mx-auto grid max-w-7xl items-center gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:min-h-[760px] lg:grid-cols-[0.95fr_1.05fr] lg:px-12 lg:py-0'>
					<div className='max-w-[620px]'>
						<h1 className='text-[3.25rem] font-semibold leading-[1.04] text-balance text-neutral-300 sm:text-7xl lg:text-[5rem]'>
							Mangez mieux,
							<br />
							gaspillez moins
						</h1>
						<div className='mt-3 h-4 w-40 rounded-full border-b-4 border-[#F2A400] sm:ml-[260px]' />
						<p className='mt-8 max-w-[560px] text-xl leading-relaxed text-neutral-300/85 sm:text-2xl'>
							InEat vous aide à mieux gérer vos aliments, éviter le gaspillage et
							maîtriser votre budget alimentaire au quotidien.
						</p>

						<div className='mt-9 grid max-w-[520px] grid-cols-1 gap-4'>
							<Button
								asChild
								size='lg'
								className='h-16 rounded-lg text-xl font-semibold sm:h-20 sm:text-2xl'>
								<Link to={primaryLink}>
									{isAuthenticated && user ? primaryLabel : 'Créer mon compte gratuitement'}
									<ArrowRight className='ml-auto size-7' />
								</Link>
							</Button>
							<Button
								asChild
								size='lg'
								variant='outline'
								className='h-16 rounded-lg border-2 text-xl font-semibold text-success-50 sm:h-20 sm:text-2xl'>
								<a href='#fonctionnement'>
									Voir comment ça marche
									<CirclePlay className='ml-auto size-8' />
								</a>
							</Button>
						</div>

						<div className='mt-8 flex items-center gap-2 text-base text-neutral-300/80 sm:text-lg'>
							<Check className='size-6 rounded-full border border-success-50 p-0.5 text-success-50' />
							<span>Gratuit · Rapide · Sans engagement</span>
						</div>
					</div>

					<div className='relative justify-self-center lg:justify-self-end'>
						<HeroPhone />
					</div>
				</div>
			</section>

			{/* BÉNÉFICES */}
			<section
				id='avantages'
				className='border-y border-neutral-200 bg-neutral-50 py-14 sm:py-20'>
				<div className='mx-auto grid max-w-6xl gap-x-8 gap-y-12 px-5 text-center sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12'>
					{benefits.map((benefit) => {
						const Icon = benefit.icon;

						return (
							<article key={benefit.title} className='mx-auto max-w-[280px]'>
								<div
									className={`mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl ${benefit.tone}`}>
									<Icon className='size-8' />
								</div>
								<h2 className='text-xl font-semibold text-neutral-300'>
									{benefit.title}
								</h2>
								<p className='mt-3 leading-relaxed text-neutral-300/80'>
									{benefit.description}
								</p>
							</article>
						);
					})}
				</div>
			</section>

			{/* FONCTIONNEMENT */}
			<section
				id='fonctionnement'
				className='bg-primary-50/70 py-16 text-center sm:py-24'>
				<div className='mx-auto max-w-7xl px-5 sm:px-8 lg:px-12'>
					<h2 className='text-3xl font-semibold text-neutral-300 sm:text-4xl'>
						3 étapes simples
					</h2>
					<div className='mt-12 grid gap-10 sm:grid-cols-3'>
						{steps.map((step) => (
							<article key={step.number} className='relative mx-auto max-w-[320px]'>
								<div className='absolute left-4 top-0 z-10 flex size-12 items-center justify-center rounded-full bg-success-50 text-2xl font-semibold text-neutral-50 sm:left-0'>
									{step.number}
								</div>
								<img
									src={step.image}
									alt=''
									className='mx-auto h-48 w-56 object-contain sm:h-56 sm:w-64'
									loading='lazy'
								/>
								<h3 className='mt-5 text-xl font-semibold text-neutral-300 sm:text-2xl'>
									{step.title}
								</h3>
								<p className='mt-3 leading-relaxed text-neutral-300/80'>
									{step.description}
								</p>
							</article>
						))}
					</div>
				</div>
			</section>

			{/* FONCTIONNALITÉS */}
			<FeaturesSection />

			{/* PREUVE DE VALEUR */}
			<section className='bg-primary-50/60 py-16 sm:py-24'>
				<div className='mx-auto max-w-6xl px-5 sm:px-8 lg:px-12'>
					<div className='mx-auto max-w-2xl text-center'>
						<h2 className='text-3xl font-semibold text-balance text-neutral-300 sm:text-4xl'>
							Des bénéfices concrets, dès la première semaine
						</h2>
						<p className='mt-4 text-lg leading-relaxed text-neutral-300/75'>
							Pas de promesses miracle : juste une meilleure visibilité sur ce que vous
							avez, ce qui presse et ce que vous dépensez.
						</p>
					</div>

					<div className='mt-12 grid gap-5 md:grid-cols-3'>
						{proofPoints.map((point) => {
							const Icon = point.icon;

							return (
								<article
									key={point.stat}
									className='rounded-2xl border border-neutral-200 bg-neutral-50 p-7 text-left'>
									<div className='flex size-12 items-center justify-center rounded-xl bg-success-50/12 text-success-50'>
										<Icon className='size-6' />
									</div>
									<h3 className='mt-5 text-xl font-semibold text-neutral-300'>
										{point.stat}
									</h3>
									<p className='mt-2 leading-relaxed text-neutral-300/75'>
										{point.description}
									</p>
								</article>
							);
						})}
					</div>
				</div>
			</section>

			{/* TARIFS */}
			<PricingSection primaryLink={primaryLink} />

			{/* FAQ */}
			<FaqSection />

			{/* CTA FINAL */}
			<section
				id='preuve'
				className='relative overflow-hidden bg-neutral-50 py-16 text-center sm:py-24'>
				<img
					src={foodPlate}
					alt=''
					className='pointer-events-none absolute -left-20 bottom-0 hidden h-72 w-72 object-contain lg:block'
					loading='lazy'
				/>
				<img
					src={foodBowl}
					alt=''
					className='pointer-events-none absolute -right-16 bottom-5 hidden h-72 w-72 object-contain lg:block'
					loading='lazy'
				/>

				<div className='relative mx-auto max-w-3xl px-5 sm:px-8'>
					<h2 className='text-3xl font-semibold leading-tight text-balance text-neutral-300 sm:text-5xl'>
						Prêt à mieux manger
						<br />
						et à faire des économies ?
					</h2>
					<div className='mx-auto mt-3 h-4 w-40 rounded-full border-b-4 border-[#F2A400]' />
					<p className='mx-auto mt-5 max-w-xl text-lg leading-relaxed text-neutral-300/75 sm:text-xl'>
						Rejoignez les foyers qui utilisent déjà InEat pour gérer leur cuisine au
						quotidien.
					</p>

					<Button
						asChild
						size='lg'
						className='mx-auto mt-8 h-16 w-full max-w-[520px] rounded-lg text-xl font-semibold sm:h-20 sm:text-2xl'>
						<Link to={primaryLink}>
							{isAuthenticated && user ? primaryLabel : 'Créer mon compte gratuitement'}
							<ArrowRight className='ml-auto size-7' />
						</Link>
					</Button>

					<p className='mt-5 flex items-center justify-center gap-2 text-sm text-neutral-300/65 sm:text-base'>
						<LockKeyhole className='size-4' />
						Vos données sont sécurisées et confidentielles.
					</p>
				</div>
			</section>

			<LandingFooter />
		</div>
	);
};

export default LandingPage;
