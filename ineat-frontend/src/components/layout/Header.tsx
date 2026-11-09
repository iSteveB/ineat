import { UserMenu } from '../auth/UserMenu';
import Logo from './Logo';
import { NotificationBell } from '@/components/notifications/NotificationBell';

/**
 * En-tête de l'app : logo sur mobile (la navigation latérale le porte sur desktop),
 * notifications et menu utilisateur. Chaque page affiche son propre titre en <h1>.
 */
export function Header() {
	return (
		<header className='sticky top-0 z-20 border-b border-neutral-200 bg-surface/95 backdrop-blur lg:border-b-0 lg:bg-canvas/95'>
			<div className='mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-12'>
				<div className='flex-1'>
					<div className='lg:hidden'>
						<Logo />
					</div>
				</div>

				<div className='flex items-center gap-1'>
					<NotificationBell />
					<UserMenu />
				</div>
			</div>
		</header>
	);
}
