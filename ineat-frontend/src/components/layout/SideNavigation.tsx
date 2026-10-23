import type { FC } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Plus, Settings } from 'lucide-react';

import logoMark from '@/assets/Logo.svg';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { navigationEntries } from './navigation';

const itemClassName = (isActive: boolean) =>
	cn(
		'flex h-11 items-center gap-3 rounded-md px-3 text-[0.9375rem] transition-colors',
		isActive
			? 'bg-accent-50 font-semibold text-accent-800'
			: 'font-medium text-neutral-700 hover:bg-neutral-50'
	);

/** Navigation latérale desktop (à partir de 1024px). */
const SideNavigation: FC = () => {
	const { pathname } = useLocation();
	const isSettingsActive = pathname.startsWith('/app/settings');

	return (
		<nav
			aria-label='Navigation principale'
			className='fixed inset-y-0 left-0 z-30 hidden w-62 flex-col gap-1 border-r border-neutral-200 bg-surface px-3 py-5 lg:flex'>
			<Link to='/app' className='mb-5 flex items-center gap-2 rounded-md px-3' aria-label='InEat, accueil'>
				<img src={logoMark} alt='' className='size-8' />
				<span className='font-display text-[1.375rem] font-bold tracking-tight text-neutral-900'>
					InEat
				</span>
			</Link>

			{navigationEntries.map((entry) => {
				const Icon = entry.icon;
				const isActive = entry.isActive(pathname);

				return (
					<Link
						key={entry.to}
						to={entry.to}
						aria-current={isActive ? 'page' : undefined}
						className={itemClassName(isActive)}>
						<Icon className='size-5' aria-hidden='true' />
						{entry.label}
					</Link>
				);
			})}

			<Button asChild className='my-3 w-full'>
				<Link to='/app/inventory/add'>
					<Plus aria-hidden='true' />
					Ajouter un produit
				</Link>
			</Button>

			<Link
				to='/app/settings'
				aria-current={isSettingsActive ? 'page' : undefined}
				className={cn('mt-auto', itemClassName(isSettingsActive))}>
				<Settings className='size-5' aria-hidden='true' />
				Paramètres
			</Link>
		</nav>
	);
};

export default SideNavigation;
