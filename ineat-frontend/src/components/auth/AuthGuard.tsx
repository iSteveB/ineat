import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import Spinner from '../ui/spinner';
import { ApiRequestError } from '@/lib/api-client';
import { authService } from '@/services/authService';

const AuthGuard = () => {
	const [isVerifying, setIsVerifying] = useState(true);
	const [isAuthorized, setIsAuthorized] = useState(false);
	const { checkAuthentication, user } = useAuthStore();
	const location = useLocation();
	const navigate = useNavigate();

	const redirectToLogin = useCallback(
		(sessionExpired = false) => {
			navigate({
				to: '/',
				search: {
					redirect: encodeURIComponent(location.pathname + location.search),
					...(sessionExpired ? { session: 'expired' } : {}),
				},
				replace: true,
			});
		},
		[location.pathname, location.search, navigate]
	);

	useEffect(() => {
		const checkAuth = async () => {
			setIsAuthorized(false);
			// Vérifier l'authentification auprès du serveur
			try {
				const isValid = await checkAuthentication();
				if (!isValid) {
					// Si l'authentification n'est pas valide, rediriger vers la landing
					redirectToLogin(Boolean(user));
					return;
				}
				setIsAuthorized(true);
			} catch (error) {
				if (
					error instanceof ApiRequestError &&
					error.code === 'EMAIL_NOT_VERIFIED'
				) {
					const email = await authService.getCurrentSessionEmail();
					if (email) {
						navigate({
							to: '/verify-email-pending',
							search: { email },
							replace: true,
						});
						return;
					}
				}
				// En cas d'erreur, rediriger vers la landing
				redirectToLogin(true);
				return;
			} finally {
				setIsVerifying(false);
			}
		};

		checkAuth();
	}, [
		checkAuthentication,
		location.pathname,
		location.search,
		navigate,
		redirectToLogin,
		user,
	]);

	// Afficher un spinner pendant la vérification
	if (isVerifying || !isAuthorized) {
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
