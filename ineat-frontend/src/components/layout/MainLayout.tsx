import { ReactNode } from 'react';
import { Header } from './Header';
import NavigationBar from './NavigationBar';

interface MainLayoutProps {
	children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
	return (
		<div className='min-h-screen flex flex-col pb-24 lg:pb-12'>
			<Header />
			<main className='flex-grow'>{children}</main>
			<div className='bg-gray-100'>
				<NavigationBar />
			</div>
		</div>
	);
}
