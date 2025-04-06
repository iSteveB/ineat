import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { isAuthenticated } from '@/utils/auth';


export const Route = createFileRoute('/app')({
	beforeLoad: async ({ location }) => {
    // Vérifier l'authentification avec notre fonction utilitaire
    const userIsAuthenticated = await isAuthenticated();
    
    if (!userIsAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href,
          session: 'expired'
        }
      });
    }
    
    return null;
  },
	component: AppLayout,
});

export default function AppLayout() {
	return (
		<div className='min-h-screen bg-gray-50'>
			<header className='bg-white shadow-sm'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
					<div className='flex justify-between h-16'>
						<div className='flex items-center'>
							<h1 className='text-2xl font-bold text-primary'>
								InEat
							</h1>
						</div>
						<div className='flex items-center'>
							{/* Profil et déconnexion seront ajoutés ici */}
						</div>
					</div>
				</div>
			</header>
			<main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
				<Outlet />
			</main>
		</div>
	);
}
