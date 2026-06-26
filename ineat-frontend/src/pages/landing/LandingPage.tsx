import { Link } from '@tanstack/react-router';
import {
	ArrowRight,
	Bell,
	Check,
	CirclePlay,
	Euro,
	Home,
	Leaf,
	LockKeyhole,
	Package,
	Plus,
	ShoppingBasket,
	User,
} from 'lucide-react';

import foodBowl from '@/assets/landing-food-bowl.png';
import foodPlate from '@/assets/landing-food-plate.png';
import heroKitchen from '@/assets/landing-hero-kitchen.png';
import stepAdd from '@/assets/landing-step-add.png';
import stepAlert from '@/assets/landing-step-alert.png';
import stepBasket from '@/assets/landing-step-basket.png';
import logoMark from '@/assets/Logo.svg';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';

const benefits = [
	{
		icon: Leaf,
		title: 'Moins de gaspillage',
		description:
			'Évitez de jeter des aliments encore bons. Faites un geste pour votre portefeuille et la planète.',
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
		title: 'Suivez et recevez des alertes',
		description:
			'InEat surveille les dates de péremption et vous alerte au bon moment.',
		image: stepAlert,
	},
	{
		number: '3',
		title: 'Consommez mieux, dépensez moins',
		description:
			'Planifiez vos repas, évitez les achats inutiles et respectez votre budget.',
		image: stepBasket,
	},
];

const inventoryItems = [
	{ name: 'Yaourt nature', qty: '2 unités', delay: '6 jours', tone: 'bg-success-50/15 text-success-50' },
	{ name: 'Salade verte', qty: '1 pièce', delay: '2 jours', tone: 'bg-primary-100/25 text-[#D99100]' },
	{ name: 'Poulet rôti', qty: '1 pièce', delay: "Aujourd'hui", tone: 'bg-error-50/15 text-error-100' },
	{ name: 'Lait demi-écrémé', qty: '1 L', delay: '8 jours', tone: 'bg-success-50/15 text-success-50' },
];

const LandingHeader = () => (
	<header className='sticky top-0 z-30 border-b border-neutral-200/60 bg-neutral-50/96 backdrop-blur'>
		<div className='mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:h-24 sm:px-8 lg:px-12'>
			<Link
				to='/'
				className='flex items-center gap-2 text-neutral-300'
				aria-label='Accueil InEat'>
				<img src={logoMark} alt='' className='size-10 sm:size-12' />
				<span className='font-fredoka text-3xl font-semibold leading-none sm:text-5xl'>
					<span className='text-[#F2A400]'>In</span>Eat
				</span>
			</Link>

			<Button
				asChild
				variant='ghost'
				className='h-11 px-2 text-base font-semibold sm:px-4 sm:text-lg'>
				<Link to='/login'>
					<User className='size-5' />
					<span className='hidden sm:inline'>Se connecter</span>
				</Link>
			</Button>
		</div>
	</header>
);

const HeroPhone = () => (
	<div
		aria-label='Aperçu mobile InEat avec inventaire, alertes de péremption et budget'
		className='relative mx-auto w-[286px] rounded-[2.2rem] border-[7px] border-neutral-300 bg-neutral-50 p-4 shadow-2xl sm:w-[342px] sm:rounded-[2.7rem] sm:border-[9px] sm:p-5'>
		<div className='absolute left-1/2 top-0 h-7 w-28 -translate-x-1/2 rounded-b-2xl bg-neutral-300 sm:w-32' />

		<div className='pt-8'>
			<div className='mb-5 flex items-center justify-between'>
				<div>
					<p className='text-xs font-semibold text-neutral-300/70'>9:41</p>
					<p className='mt-3 text-lg font-semibold text-neutral-300'>
						Bonjour !
					</p>
				</div>
				<div className='relative flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-300'>
					<Bell className='size-5' />
					<span className='absolute right-1 top-1 size-2 rounded-full bg-error-50' />
				</div>
			</div>

			<div className='rounded-lg border border-neutral-200 bg-neutral-50 p-3 shadow-sm'>
				<div className='mb-3 flex items-center justify-between'>
					<h2 className='text-sm font-semibold text-neutral-300'>Mon inventaire</h2>
					<span className='text-xs text-neutral-300/55'>Voir tout</span>
				</div>
				<div className='space-y-2'>
					{inventoryItems.map((item) => (
						<div key={item.name} className='flex items-center gap-2 rounded-md bg-neutral-100/80 p-2'>
							<div className='flex size-9 items-center justify-center rounded-md bg-primary-100/25 text-lg'>
								<Package className='size-4 text-success-50' />
							</div>
							<div className='min-w-0 flex-1'>
								<p className='truncate text-xs font-semibold text-neutral-300'>{item.name}</p>
								<p className='text-[0.68rem] text-neutral-300/55'>{item.qty}</p>
							</div>
							<span className={`rounded-md px-2 py-1 text-[0.65rem] font-semibold ${item.tone}`}>
								{item.delay}
							</span>
						</div>
					))}
				</div>
			</div>

			<div className='mt-3 rounded-lg border border-orange-100 bg-orange-50/70 p-3'>
				<div className='mb-2 flex items-center justify-between'>
					<h2 className='text-sm font-semibold text-neutral-300'>Alertes péremption</h2>
					<span className='text-xs text-neutral-300/55'>Voir tout</span>
				</div>
				<div className='space-y-2'>
					<div className='flex items-center justify-between rounded-md bg-neutral-50 p-2'>
						<div>
							<p className='text-xs font-semibold text-neutral-300'>Poulet rôti</p>
							<p className='text-[0.68rem] text-neutral-300/55'>À consommer aujourd’hui</p>
						</div>
						<ArrowRight className='size-4 text-error-50' />
					</div>
					<div className='flex items-center justify-between rounded-md bg-neutral-50 p-2'>
						<div>
							<p className='text-xs font-semibold text-neutral-300'>Fromage frais</p>
							<p className='text-[0.68rem] text-neutral-300/55'>À consommer dans 1 jour</p>
						</div>
						<ArrowRight className='size-4 text-neutral-300/40' />
					</div>
				</div>
			</div>

			<div className='mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 shadow-sm'>
				<div className='flex items-center justify-between'>
					<div>
						<h2 className='text-sm font-semibold text-neutral-300'>Mon budget</h2>
						<p className='text-[0.68rem] text-neutral-300/55'>Mai 2026</p>
					</div>
					<ArrowRight className='size-4 text-neutral-300/45' />
				</div>
				<p className='mt-2 text-xl font-semibold text-neutral-300'>245 €</p>
				<p className='text-[0.68rem] text-neutral-300/55'>dépensés sur 400 €</p>
				<div className='mt-3 h-2 rounded-full bg-neutral-200'>
					<div className='h-full w-[61%] rounded-full bg-success-50' />
				</div>
				<p className='mt-1 text-right text-[0.68rem] font-semibold text-success-50'>61 %</p>
			</div>

			<div className='mt-4 grid grid-cols-5 items-center text-neutral-300/55'>
				<Home className='mx-auto size-5 text-[#F2A400]' />
				<Package className='mx-auto size-5' />
				<div className='mx-auto flex size-11 items-center justify-center rounded-full bg-success-50 text-neutral-50'>
					<Plus className='size-6' />
				</div>
				<ShoppingBasket className='mx-auto size-5' />
				<User className='mx-auto size-5' />
			</div>
		</div>
	</div>
);

const LandingPage = () => {
	const { isAuthenticated, user } = useAuthStore();
	const primaryLink = isAuthenticated && user ? '/app' : '/register';
	const primaryLabel = isAuthenticated && user ? 'Ouvrir mon espace' : 'Créer mon compte';

	return (
		<div className='min-h-screen bg-neutral-50 font-fredoka text-neutral-300'>
			<LandingHeader />

			<section className='relative overflow-hidden bg-primary-50'>
				<div
					className='absolute inset-0 bg-cover bg-center opacity-75'
					style={{ backgroundImage: `url(${heroKitchen})` }}
					aria-hidden='true'
				/>
				<div className='absolute inset-0 bg-linear-to-r from-neutral-50 via-neutral-50/94 to-neutral-50/45' />
				<div className='relative mx-auto grid max-w-7xl items-center gap-8 px-5 py-10 sm:px-8 sm:py-14 lg:min-h-[780px] lg:grid-cols-[0.95fr_1.05fr] lg:px-12 lg:py-0'>
					<div className='max-w-[620px]'>
						<h1 className='text-[3.25rem] font-semibold leading-[1.04] text-neutral-300 sm:text-7xl lg:text-[5rem]'>
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
									{primaryLabel}
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

			<section
				id='avantages'
				className='border-y border-neutral-200 bg-neutral-50 py-12 sm:py-16'>
				<div className='mx-auto grid max-w-6xl gap-9 px-5 text-center sm:grid-cols-3 sm:px-8 lg:px-12'>
					{benefits.map((benefit) => {
						const Icon = benefit.icon;

						return (
							<article key={benefit.title} className='mx-auto max-w-[280px]'>
								<div
									className={`mx-auto mb-6 flex size-20 items-center justify-center rounded-full ${benefit.tone}`}>
									<Icon className='size-10' />
								</div>
								<h2 className='text-2xl font-semibold text-neutral-300'>
									{benefit.title}
								</h2>
								<p className='mt-4 text-lg leading-snug text-neutral-300/80'>
									{benefit.description}
								</p>
							</article>
						);
					})}
				</div>
			</section>

			<section
				id='fonctionnement'
				className='bg-primary-50/70 py-12 text-center sm:py-16'>
				<div className='mx-auto max-w-7xl px-5 sm:px-8 lg:px-12'>
					<h2 className='text-4xl font-semibold text-neutral-300 sm:text-5xl'>
						3 étapes simples
					</h2>
					<div className='mt-9 grid gap-10 sm:grid-cols-3'>
						{steps.map((step) => (
							<article key={step.number} className='relative mx-auto max-w-[320px]'>
								<div className='absolute left-4 top-0 z-10 flex size-12 items-center justify-center rounded-full bg-success-50 text-2xl font-semibold text-neutral-50 sm:left-0'>
									{step.number}
								</div>
								<img
									src={step.image}
									alt=''
									className='mx-auto h-48 w-56 object-contain sm:h-56 sm:w-64'
								/>
								<h3 className='mt-5 text-xl font-semibold text-neutral-300 sm:text-2xl'>
									{step.title}
								</h3>
								<p className='mt-3 text-lg leading-snug text-neutral-300/80'>
									{step.description}
								</p>
							</article>
						))}
					</div>
				</div>
			</section>

			<section
				id='preuve'
				className='relative overflow-hidden bg-neutral-50 py-14 text-center sm:py-20'>
				<img
					src={foodPlate}
					alt=''
					className='pointer-events-none absolute -left-20 bottom-0 hidden h-72 w-72 object-contain lg:block'
				/>
				<img
					src={foodBowl}
					alt=''
					className='pointer-events-none absolute -right-16 bottom-5 hidden h-72 w-72 object-contain lg:block'
				/>

				<div className='relative mx-auto max-w-3xl px-5 sm:px-8'>
					<h2 className='text-4xl font-semibold leading-tight text-neutral-300 sm:text-5xl'>
						Prêt à mieux manger
						<br />
						et à faire des économies ?
					</h2>
					<div className='mx-auto mt-2 h-4 w-40 rounded-full border-b-4 border-[#F2A400]' />
					<p className='mx-auto mt-5 max-w-xl text-lg leading-relaxed text-neutral-300/75 sm:text-xl'>
						Rejoignez des milliers de foyers qui utilisent déjà InEat au
						quotidien.
					</p>

					<Button
						asChild
						size='lg'
						className='mx-auto mt-8 h-16 w-full max-w-[520px] rounded-lg text-xl font-semibold sm:h-20 sm:text-2xl'>
						<Link to={primaryLink}>
							{primaryLabel}
							<ArrowRight className='ml-auto size-7' />
						</Link>
					</Button>

					<p className='mt-5 flex items-center justify-center gap-2 text-sm text-neutral-300/65 sm:text-base'>
						<LockKeyhole className='size-4' />
						Vos données sont sécurisées et confidentielles.
					</p>
				</div>
			</section>
		</div>
	);
};

export default LandingPage;
