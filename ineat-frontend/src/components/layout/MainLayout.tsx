import { ReactNode } from 'react';
import { Header } from './Header';
import NavigationBar from './NavigationBar';
import SideNavigation from './SideNavigation';
import { useNavigationStore } from '@/stores/navigationStore';
import { PwaInstallBottomSheet } from '@/components/pwa/PwaInstallBottomSheet';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
	children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
	const isNavigationVisible = useNavigationStore(
		(state) => state.isNavigationVisible
	);

	return (
		<div
			className={cn(
				'flex min-h-screen flex-col bg-canvas',
				isNavigationVisible && 'lg:pl-62'
			)}>
			<a
				href='#contenu'
				className='sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg'>
				Aller au contenu
			</a>
			{isNavigationVisible && <SideNavigation />}
			<Header />
			<main
				id='contenu'
				className={cn('flex-grow', isNavigationVisible ? 'pb-28 lg:pb-12' : 'pb-0')}>
				{children}
			</main>
			{isNavigationVisible && <NavigationBar />}
			<PwaInstallBottomSheet />
		</div>
	);
}
