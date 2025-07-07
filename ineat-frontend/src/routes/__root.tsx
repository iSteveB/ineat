import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { Toaster } from 'sonner';

export const Route = createRootRoute({
	component: () => (
		<main className='bg-primary-50'>
			<Outlet />
			{process.env.NODE_ENV === 'development' && (
				<TanStackRouterDevtools />
			)}
			<Toaster
				position='top-right'
				toastOptions={{
					duration: 5000,
					style: {
						background: 'bg-neutral-50',
						color: 'text-neutral-900',
					},
				}}
			/>
		</main>
	),
});
