import type { FC } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { Home, Package, Plus, BookOpen, Settings } from 'lucide-react';
import NavigationItem from '../common/NavigationItem';

const NavigationBar: FC = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const pathname = location.pathname;

	return (
		<div className='fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2'>
			{/* Backdrop blur effect */}
			<div className='absolute inset-0  backdrop-blur-xl border-t border-gray-200/50' />

			{/* Navigation container */}
			<div className='relative mx-auto max-w-md'>
				{/* Background */}
				<div className='bg-neutral-50/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 px-6 py-3'>
					<div className='flex justify-between items-center'>
						<NavigationItem
							icon={<Home size={22} />}
							label='Accueil'
							to='/app'
							isActive={
								pathname === '/app' || pathname === '/app/'
							}
						/>
						<NavigationItem
							icon={<Package size={22} />}
							to='/app/inventory'
							label='Inventaire'
							isActive={pathname.startsWith('/app/inventory')}
						/>

						{/* Central action button */}
						<div className='relative -mt-8'>
							<button
								onClick={() =>
									navigate({ to: '/app/inventory/add' })
								}
								className='group relative size-14 bg-gradient-to-r from-success-50 to-emerald-700 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer'
								aria-label='Ajouter un produit'>
								<Plus
									size={24}
									className='text-neutral-50 transition-transform duration-300 group-hover:rotate-90'
								/>

								{/* Glow effect */}
								<div className='absolute inset-0 bg-gradient-to-r from-success-50 to-emerald-700 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300' />
							</button>
						</div>

						<NavigationItem
							icon={<BookOpen size={22} />}
							to='/app/recipes'
							label='Recette'
							isActive={pathname.startsWith('/app/recipes')}
						/>
						<NavigationItem
							icon={<Settings size={22} />}
							to='/app/settings'
							label='Paramètre'
							isActive={
								pathname.startsWith('/app/profile/settings') ||
								pathname.startsWith('/app/settings')
							}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default NavigationBar;
