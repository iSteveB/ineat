import { ReactNode } from 'react';
import { Header } from './Header';
import NavigationBar from './NavigationBar';
import { useNavigationStore } from '@/stores/navigationStore';

interface MainLayoutProps {
	children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
	const isNavigationVisible = useNavigationStore(
		(state) => state.isNavigationVisible
	);

	return (
		<div
			className={`min-h-screen flex flex-col ${
				isNavigationVisible ? 'pb-24 lg:pb-12' : 'pb-0'
			}`}>
			<Header />
			<main className='flex-grow'>{children}</main>
			{isNavigationVisible && (
				<div className='bg-gray-100'>
					<NavigationBar />
				</div>
			)}
		</div>
	);
}
