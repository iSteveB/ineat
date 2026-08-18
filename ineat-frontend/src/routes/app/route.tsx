import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { isAuthenticated } from '@/utils/auth';
import MainLayout from '@/components/layout/MainLayout';


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
		<MainLayout>
				<Outlet />
		</MainLayout>
	);
}
