import { FC } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Home, Package, Plus, BookOpen, Settings } from 'lucide-react';
import NavigationItem from '../common/NavigationItem';

export const NavigationBar: FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const pathname = location.pathname;

	return (
		<div
			className={`fixed bottom-0 left-0 right-0 bg-primary-50 z-50 lg:max-w-2/3 xl:max-w-1/2 lg:m-auto`}>
			<div className='flex justify-around items-center'>
				<NavigationItem
					icon={<Home size={28} />}
					label='Accueil'
					to='/app'
					isActive={pathname === '/app' || pathname === '/app/'}
				/>
				<NavigationItem
					icon={<Package size={28} />}
					to='/app/inventory'
					label='Inventaire'
					isActive={pathname.startsWith('/app/inventory')}
				/>
				<div className='flex flex-col items-center'>
					<button
						onClick={() =>
							navigate({ to: '/app/inventory/add' })
						}
						className='size-16 bg-success-50 rounded-full flex items-center justify-center shadow-md relative hover:cursor-pointer'
						aria-label='Ajouter un produit'>
						<Plus size={32} className='text-neutral-50' />
					</button>
				</div>
				<NavigationItem
					icon={<BookOpen size={28} />}
					to='/app/recipes'
					label='Recette'
					isActive={pathname.startsWith('/app/recipes')}
				/>
				<NavigationItem
					icon={<Settings size={28} />}
					to='/app/settings'
					label='Paramètre'
					isActive={
						pathname.startsWith('/app/profile/settings') ||
						pathname.startsWith('/app/settings')
					}
				/>
			</div>
		</div>
	);
};
