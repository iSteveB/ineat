import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { useAuthStore } from '../stores/authStore';

// Définie le type du routerContext
interface RouterContext {
	authStore: ReturnType<typeof useAuthStore.getState>;
}

export const Route = createFileRoute('/')({
	beforeLoad: ({ context }) => {
		const authStore = (context as RouterContext).authStore;

		// Si l'utilisateur est authentifié, continuer
		if (authStore.isAuthenticated && authStore.user) {
			return;
		}
		// Sinon, rediriger vers la page de connexion
		throw redirect({ to: '/login' });
	},

	errorComponent: ({ error }) => {
		return (
			<div>
				<h1>Oops ! Il semble qu'il y ait eu une erreur</h1>
				<p>{error.message}</p>
				<Link to='/'>Retourner à l'accueil</Link>
			</div>
		);
	},
});
