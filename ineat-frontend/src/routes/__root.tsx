import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

export const Route = createRootRoute({
	component: () => (
		<main className='bg-primary-50/45'>
			<Outlet />
			{process.env.NODE_ENV === 'development' && (
				<TanStackRouterDevtools />
			)}
		</main>
	),
});
