import { useLocation } from '@tanstack/react-router';
import { UserMenu } from '../auth/UserMenu';
import Logo from './Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';

export function Header() {
	const location = useLocation();
	const path = location.pathname;
	const isDashboard = path === '/app' || path === '/app/';

	// Titre de section ; chaque page porte son propre <h1>.
	const getPageTitle = (): string => {
		switch (true) {
			case path.startsWith('/app/inventory'):
				return 'Inventaire';
			case path.startsWith('/app/shopping'):
				return 'Liste de courses';
			case path.startsWith('/app/recipes'):
				return 'Recettes';
			case path.startsWith('/app/budget'):
				return 'Budget';
			case path.startsWith('/app/planning'):
				return 'Planification';
			case path.startsWith('/app/settings'):
			case path.startsWith('/app/profile/settings'):
				return 'Paramètres';
			case path.startsWith('/app/profile'):
				return 'Profil';
			case path.startsWith('/app/notifications'):
				return 'Notifications';
			case path.startsWith('/app/help'):
				return 'Aide & FAQ';
			default:
				return 'InEat';
		}
	};

	return (
		<header className='sticky top-0 z-20 border-b border-neutral-200 bg-surface/95 backdrop-blur lg:border-b-0 lg:bg-canvas/95'>
			<div className='mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-12'>
				<div className='flex size-10 shrink-0 items-center lg:hidden [&_svg]:size-10'>
					<Logo />
				</div>
				<p className='min-w-0 flex-1 truncate font-display text-lg font-bold text-neutral-900'>
					{isDashboard ? <span className='lg:sr-only'>InEat</span> : getPageTitle()}
				</p>

				<div className='flex items-center gap-1'>
					<NotificationBell />
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
