import { useEffect, useState } from 'react';
import { Outlet, useLocation, redirect } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import Spinner from '../ui/spinner';

const AuthGuard = () => {
	const [isVerifying, setIsVerifying] = useState(true);
	const { isAuthenticated, verifyAuthentication, user } = useAuthStore();
	const location = useLocation();

	useEffect(() => {
		const checkAuth = async () => {
			if (!isAuthenticated || !user) {
				// Si l'utilisateur n'est pas authentifié selon notre état local,
				// rediriger vers la page de connexion
				throw redirect({
					to: '/login',
					search: {
						redirect: encodeURIComponent(
							location.pathname + location.search
						),
					},
				});
			}

			// Vérifier l'authentification auprès du serveur
			try {
				const isValid = await verifyAuthentication();
				if (!isValid) {
					// Si l'authentification n'est pas valide, rediriger vers la page de connexion
					throw redirect({
						to: '/login',
						search: {
							redirect: encodeURIComponent(
								location.pathname + location.search
							),
							session: 'expired',
						},
					});
				}
			} catch {
				// En cas d'erreur, rediriger vers la page de connexion
				throw redirect({
					to: '/login',
					search: {
						redirect: encodeURIComponent(
							location.pathname + location.search
						),
						session: 'expired',
					},
				});
			} finally {
				setIsVerifying(false);
			}
		};

		checkAuth();
	}, [
		isAuthenticated,
		location.pathname,
		location.search,
		verifyAuthentication,
		user,
	]);

	// Afficher un spinner pendant la vérification
	if (isVerifying) {
		return (
			<div className='flex items-center justify-center min-h-screen'>
				<Spinner size='lg' />
			</div>
		);
	}

	// Si nous sommes ici, l'utilisateur est authentifié
	return <Outlet />;
};

export default AuthGuard;
