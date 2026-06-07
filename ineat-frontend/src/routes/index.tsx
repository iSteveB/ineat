import { createFileRoute, Link } from '@tanstack/react-router';
import LandingPage from '@/pages/landing/LandingPage';

export const Route = createFileRoute('/')({
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
