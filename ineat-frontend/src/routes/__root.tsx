import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import MainLayout from '../components/layout/MainLayout';

export const Route = createRootRoute({
	component: () => (
		<MainLayout>
			<Outlet />
			{process.env.NODE_ENV === 'development' && (
				<TanStackRouterDevtools />
			)}
		</MainLayout>
	),
});
