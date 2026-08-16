import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Menu, User, X } from 'lucide-react';

import logoMark from '@/assets/Logo.svg';
import { Button } from '@/components/ui/button';

const navLinks = [
	{ label: 'Fonctionnalités', href: '#fonctionnalites' },
	{ label: 'Comment ça marche', href: '#fonctionnement' },
	{ label: 'Tarifs', href: '#tarifs' },
	{ label: 'FAQ', href: '#faq' },
];

interface LandingHeaderProps {
	primaryLink: string;
	primaryLabel: string;
}

const LandingHeader = ({ primaryLink, primaryLabel }: LandingHeaderProps) => {
	const [open, setOpen] = useState(false);

	return (
		<header className='sticky top-0 z-40 border-b border-neutral-200/60 bg-neutral-50/90 backdrop-blur'>
			<div className='mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-5 sm:h-20 sm:px-8 lg:px-12'>
				<Link
					to='/'
					className='flex items-center gap-2 text-neutral-300'
					aria-label='Accueil InEat'>
					<img src={logoMark} alt='' className='size-9 sm:size-11' />
					<span className='font-fredoka text-2xl font-semibold leading-none sm:text-3xl'>
						<span className='text-[#F2A400]'>In</span>Eat
					</span>
				</Link>

				<nav
					aria-label='Navigation principale'
					className='hidden items-center gap-1 lg:flex'>
					{navLinks.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className='rounded-md px-3 py-2 text-base font-medium text-neutral-300/80 transition-colors hover:bg-success-50/10 hover:text-success-50'>
							{link.label}
						</a>
					))}
				</nav>

				<div className='hidden items-center gap-2 sm:flex'>
					<Button asChild variant='ghost' className='h-11 px-4 text-base font-semibold'>
						<Link to='/login'>
							<User className='size-5' />
							Se connecter
						</Link>
					</Button>
					<Button asChild className='h-11 px-5 text-base font-semibold'>
						<Link to={primaryLink}>{primaryLabel}</Link>
					</Button>
				</div>

				<button
					type='button'
					onClick={() => setOpen((v) => !v)}
					aria-expanded={open}
					aria-controls='landing-mobile-menu'
					aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
					className='flex size-11 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-success-50/10 lg:hidden'>
					{open ? <X className='size-6' /> : <Menu className='size-6' />}
				</button>
			</div>

			{open && (
				<div
					id='landing-mobile-menu'
					className='border-t border-neutral-200/60 bg-neutral-50 px-5 py-4 lg:hidden'>
					<nav aria-label='Navigation mobile' className='flex flex-col gap-1'>
						{navLinks.map((link) => (
							<a
								key={link.href}
								href={link.href}
								onClick={() => setOpen(false)}
								className='rounded-md px-3 py-3 text-base font-medium text-neutral-300/85 transition-colors hover:bg-success-50/10 hover:text-success-50'>
								{link.label}
							</a>
						))}
					</nav>
					<div className='mt-3 flex flex-col gap-2 border-t border-neutral-200/60 pt-4'>
						<Button asChild variant='secondary' className='h-12 text-base font-semibold'>
							<Link to='/login' onClick={() => setOpen(false)}>
								<User className='size-5' />
								Se connecter
							</Link>
						</Button>
						<Button asChild className='h-12 text-base font-semibold'>
							<Link to={primaryLink} onClick={() => setOpen(false)}>
								{primaryLabel}
							</Link>
						</Button>
					</div>
				</div>
			)}
		</header>
	);
};

export default LandingHeader;
