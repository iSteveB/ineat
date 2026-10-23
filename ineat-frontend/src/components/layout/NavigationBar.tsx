import type { FC } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import NavigationItem from '../common/NavigationItem';
import { navigationEntries } from './navigation';

/** Navigation basse mobile : quatre destinations et le bouton d'ajout central. Masquée à partir de 1024px. */
const NavigationBar: FC = () => {
	const { pathname } = useLocation();
	const [first, second, ...rest] = navigationEntries;

	const renderItem = (entry: (typeof navigationEntries)[number]) => {
		const Icon = entry.icon;

		return (
			<NavigationItem
				key={entry.to}
				icon={<Icon className='size-5' aria-hidden='true' />}
				to={entry.to}
				label={entry.label}
				isActive={entry.isActive(pathname)}
			/>
		);
	};

	return (
		<nav
			aria-label='Navigation principale'
			className='fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden'>
			<div className='mx-auto flex max-w-md items-center justify-between rounded-xl border border-neutral-200 bg-surface px-2 py-2 shadow-lg'>
				{renderItem(first)}
				{renderItem(second)}
				<Link
					to='/app/inventory/add'
					aria-label='Ajouter un produit'
					className='-mt-7 flex size-14 shrink-0 items-center justify-center rounded-lg bg-accent-600 text-surface shadow-md transition-colors hover:bg-accent-700'>
					<Plus className='size-6' aria-hidden='true' />
				</Link>
				{rest.map(renderItem)}
			</div>
		</nav>
	);
};

export default NavigationBar;
