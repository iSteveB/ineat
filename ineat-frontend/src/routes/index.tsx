import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import LandingPage from '@/pages/landing/LandingPage';
import { isAuthenticated } from '@/utils/auth';

export const Route = createFileRoute('/')({
	beforeLoad: async () => {
		const userIsAuthenticated = await isAuthenticated();

		if (userIsAuthenticated) {
			throw redirect({ to: '/app' });
		}

		return null;
	},
	component: LandingPage,

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
