import { createFileRoute, Link, Outlet } from '@tanstack/react-router';
import { ChefHat, Clock, Wallet } from 'lucide-react';

import foodBowl from '@/assets/landing-food-bowl.webp';
import logoMark from '@/assets/Logo.svg';

export const Route = createFileRoute('/_auth')({
	component: AuthLayout,
});

const benefits = [
	{ icon: Clock, text: 'Des alertes avant que vos produits ne se perdent.' },
	{ icon: ChefHat, text: 'Des recettes avec ce que vous avez déjà.' },
	{ icon: Wallet, text: 'Un budget alimentaire sous contrôle.' },
];

const BrandLink = ({ className }: { className?: string }) => (
	<Link to='/' className={`flex items-center gap-2 rounded-md text-neutral-900 ${className ?? ''}`}>
		<img src={logoMark} alt='' className='size-10' />
		<span className='font-display text-2xl font-bold tracking-tight'>InEat</span>
	</Link>
);

/**
 * Mise en page des écrans d'authentification : panneau de marque à gauche sur desktop,
 * formulaire seul sur mobile. Chaque formulaire porte le <h1> de la page.
 */
export default function AuthLayout() {
	return (
		<div className='min-h-screen bg-canvas lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'>
			<a
				href='#contenu'
				className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg'>
				Aller au contenu
			</a>

			<aside
				aria-label='InEat'
				className='hidden flex-col justify-between gap-10 bg-accent-50 p-12 lg:flex xl:p-16'>
				<BrandLink />
				<div className='flex flex-col gap-8'>
					<p className='max-w-md font-display text-4xl font-bold leading-tight tracking-tight text-neutral-900'>
						Gérez vos courses comme un chef.
					</p>
					<ul className='flex flex-col gap-4'>
						{benefits.map(({ icon: Icon, text }) => (
							<li key={text} className='flex items-center gap-3 text-lg text-neutral-800'>
								<span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-surface text-accent-700'>
									<Icon className='size-5' aria-hidden='true' />
								</span>
								{text}
							</li>
						))}
					</ul>
				</div>
				<img
					src={foodBowl}
					alt=''
					className='size-56 self-end rounded-full object-cover shadow-lg xl:size-64'
				/>
			</aside>

			<main
				id='contenu'
				className='flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-10 sm:px-8'>
				<BrandLink className='lg:hidden' />
				<div className='w-full max-w-md'>
					<Outlet />
				</div>
			</main>
		</div>
	);
}
