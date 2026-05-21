import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from '@tanstack/react-router';
import { UserMenu } from '../auth/UserMenu';
import { Button } from '../ui/button';
import { Bell } from 'lucide-react';
import Logo from './Logo';
import { notificationService } from '@/services/notificationService';

export function Header() {
	const location = useLocation();
	const { data: unreadCount = 0 } = useQuery({
		queryKey: ['notifications', 'unread-count'],
		queryFn: () => notificationService.getUnreadCount(),
		staleTime: 60_000,
	});

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
		<header className='bg-primary-50 border-neutral-200 h-18 px-4 flex items-center justify-between lg:max-w-1/3 2xl:min-w-1/2 2xl:max-w-1/2 lg:m-auto lg:min-w-2/3'>
			<div className='flex items-center mr-3 size-10'>
				<Logo />
			</div>
			{/* Titre de la page */}
			<div className='flex-1'>
				<h1 className='text-2xl font-semibold text-text-primary'>
					{getPageTitle()}
				</h1>
			</div>

			{/* Actions rapides */}
			<div className='flex items-center space-x-2'>
				{/* Bouton de notifications */}
				<Button
					asChild
					variant='ghost'
					size='icon'
					className='relative cursor-pointer'>
					<Link to='/app/notifications' aria-label='Notifications'>
						<Bell className='size-5' />
						{unreadCount > 0 && (
							<span className='absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-error-500 text-[10px] font-semibold text-neutral-50'>
								{unreadCount > 9 ? '9+' : unreadCount}
							</span>
						)}
					</Link>
				</Button>

				{/* Menu utilisateur */}
				<UserMenu />
			</div>
		</header>
	);
}
