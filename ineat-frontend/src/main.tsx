import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './providers/AppProvider';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { useAuthStore } from './stores/authStore';
import './index.css';

import { routeTree } from './routeTree.gen';
import { Error404Page } from './pages/error/Error404Page';

const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	context: {
    // Initialiser avec une fonction qui récupère l'état actuel du store
		authStore: ()=> useAuthStore.getState(),
	},
	defaultNotFoundComponent: () => {
    return <Error404Page message="Une erreur est survenue" showSearch={true} />;
  },
});

// Enregistrer l'instance du router
declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}

  interface RouterContext {
    authStore: ReturnType<typeof useAuthStore.getState>;
  }
}

const rootElement = document.getElementById('root')!;
if (!rootElement.innerHTML) {
	createRoot(rootElement).render(
		<StrictMode>
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		</StrictMode>
	);
}
