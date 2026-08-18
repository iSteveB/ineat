import { createRootRoute, Outlet } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';

const RouterDevtools = import.meta.env.DEV
	? lazy(() =>
			import('@tanstack/react-router-devtools').then((module) => ({
				default: module.TanStackRouterDevtools,
			}))
		)
	: null;

export const Route = createRootRoute({
	component: () => (
		<main className='bg-primary-50'>
			<Outlet />
			{RouterDevtools && (
				<Suspense fallback={null}>
					<RouterDevtools />
				</Suspense>
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
