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
		<div className='bg-canvas'>
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
						background: 'var(--color-surface)',
						color: 'var(--color-neutral-900)',
						border: '1px solid var(--color-neutral-200)',
						fontFamily: 'var(--font-sans)',
					},
				}}
			/>
		</div>
	),
});
