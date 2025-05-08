import { ReactNode } from 'react';
import { Header } from './Header';
import { NavigationBar } from './NavigationBar';

interface MainLayoutProps {
	children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
	// Contenu du layout comme précédemment
	return (
		<div className='min-h-screen flex flex-col pb-24 lg:pb-12'>
			{/* En-tête global */}
				<Header />

			{/* Contenu principal */}
			<main className='flex-grow'>{children}</main>

			{/* Pied de page global */}
			<div className='bg-gray-100'>
				<NavigationBar />
			</div>
		</div>
	);
}
