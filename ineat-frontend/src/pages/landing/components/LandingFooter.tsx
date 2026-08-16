import { Link } from '@tanstack/react-router';
import { Instagram, Linkedin, Mail } from 'lucide-react';

import logoMark from '@/assets/Logo.svg';

const footerGroups = [
	{
		title: 'Produit',
		links: [
			{ label: 'Fonctionnalités', href: '#fonctionnalites' },
			{ label: 'Comment ça marche', href: '#fonctionnement' },
			{ label: 'Tarifs', href: '#tarifs' },
			{ label: 'FAQ', href: '#faq' },
		],
	},
	{
		title: 'Assistance',
		links: [
			{ label: 'Centre d’aide', href: '#faq' },
			{ label: 'Nous contacter', href: 'mailto:contact@ineat.app' },
			{ label: 'Signaler un problème', href: 'mailto:support@ineat.app' },
		],
	},
	{
		title: 'Légal',
		links: [
			{ label: 'Mentions légales', href: '#' },
			{ label: 'Confidentialité', href: '#' },
			{ label: 'Conditions d’utilisation', href: '#' },
		],
	},
];

const socials = [
	{ label: 'Instagram', href: '#', icon: Instagram },
	{ label: 'LinkedIn', href: '#', icon: Linkedin },
	{ label: 'Email', href: 'mailto:contact@ineat.app', icon: Mail },
];

const LandingFooter = () => (
	<footer className='border-t border-neutral-200 bg-neutral-100'>
		<div className='mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-12'>
			<div className='grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]'>
				<div>
					<Link to='/' className='flex items-center gap-2 text-neutral-300' aria-label='Accueil InEat'>
						<img src={logoMark} alt='' className='size-9' />
						<span className='font-fredoka text-2xl font-semibold leading-none'>
							<span className='text-[#F2A400]'>In</span>Eat
						</span>
					</Link>
					<p className='mt-4 max-w-xs leading-relaxed text-neutral-300/75'>
						L’assistant alimentaire qui vous aide à mieux manger et à gaspiller moins, au quotidien.
					</p>
					<div className='mt-5 flex gap-2'>
						{socials.map((social) => {
							const Icon = social.icon;
							return (
								<a
									key={social.label}
									href={social.href}
									aria-label={social.label}
									className='flex size-11 items-center justify-center rounded-full bg-neutral-50 text-neutral-300 transition-colors hover:bg-success-50 hover:text-neutral-50'>
									<Icon className='size-5' />
								</a>
							);
						})}
					</div>
				</div>

				{footerGroups.map((group) => (
					<nav key={group.title} aria-label={group.title}>
						<h2 className='text-sm font-semibold uppercase tracking-wide text-neutral-300/60'>
							{group.title}
						</h2>
						<ul className='mt-4 space-y-3'>
							{group.links.map((link) => (
								<li key={link.label}>
									<a
										href={link.href}
										className='text-neutral-300/80 transition-colors hover:text-success-50'>
										{link.label}
									</a>
								</li>
							))}
						</ul>
					</nav>
				))}
			</div>

			<div className='mt-12 flex flex-col items-center justify-between gap-3 border-t border-neutral-200 pt-6 text-sm text-neutral-300/60 sm:flex-row'>
				<p>© {new Date().getFullYear()} InEat. Tous droits réservés.</p>
				<p>Fait avec soin pour moins de gaspillage.</p>
			</div>
		</div>
	</footer>
);

export default LandingFooter;
