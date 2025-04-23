import { UserMenu } from '../auth/UserMenu';
import { Button } from '../ui/button';
import { Bell, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import Logo from './Logo';

export function Header() {
	const location = useLocation();

	// Déterminer le titre de la page en fonction de l'URL actuelle
	const getPageTitle = (): string => {
		const path = location.pathname;

		switch (true) {
			case path === '/app/':
				return 'Tableau de bord';
			case path.startsWith('/app/inventory'):
				return 'Inventaire';
			case path.startsWith('/app/shopping'):
				return 'Liste de courses';
			case path.startsWith('/app/recipes'):
				return 'Recettes';
			case path.startsWith('/app/planning'):
				return 'Planification';
			case path.startsWith('/app/profile/settings'):
				return 'Paramètres';
			case path.startsWith('/app/profile'):
				return 'Profil';
			default:
				return 'InEat';
		}
	};

	return (
		<header className='bg-primary-50/10 border-b border-neutral-200 h-18 px-4 flex items-center justify-between'>
			<div className='flex items-center mr-3 size-10'>
				<Logo />
			</div>
			{/* Titre de la page */}
			<div className='flex-1'>
				<h1 className='text-xl font-semibold text-text-primary'>
					{getPageTitle()}
				</h1>
			</div>

			{/* Barre de recherche */}
			<div
				className={cn(
					'mx-4 flex-1 max-w-md relative',
					// Masquer sur les petits écrans
					'hidden md:flex'
				)}>
				<div className='relative w-full'>
					<Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
					<Input
						type='search'
						placeholder='Rechercher...'
						className='pl-10 pr-4 py-2 w-full bg-gray-50 border-gray-200 focus:bg-white'
					/>
				</div>
			</div>

			{/* Actions rapides */}
			<div className='flex items-center space-x-2'>
				{/* Bouton de recherche pour mobile */}
				<Button variant='ghost' size='icon' className='md:hidden cursor-pointer'>
					<Search className='h-5 w-5' />
				</Button>

				{/* Bouton de notifications */}
				<Button variant='ghost' size='icon' className='relative cursor-pointer'>
					<Bell className='h-5 w-5' />
					<span className='absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full' />
				</Button>

				{/* Menu utilisateur */}
				<UserMenu />
			</div>
		</header>
	);
}
