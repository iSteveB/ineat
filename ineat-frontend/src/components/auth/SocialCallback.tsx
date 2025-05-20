import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import Spinner from '../ui/spinner';
import { Alert, AlertDescription } from '../ui/alert';

interface SearchParams {
	token?: string;
	error?: string;
}

const SocialCallback = () => {
	const [isProcessing, setIsProcessing] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as SearchParams;
	const { getProfile } = useAuthStore();

	useEffect(() => {
		const processCallback = async () => {
			// Vérifier si une erreur est présente dans l'URL
			if (search.error) {
				setError(decodeURIComponent(search.error));
				setIsProcessing(false);
				return;
			}

			try {
				// Récupérer le profil utilisateur
				// (le cookie a déjà été défini par le serveur lors de la redirection)
				await getProfile();

				// Rediriger vers l'application
				navigate({ to: '/app' });
			} catch {
				setError(
					'Erreur lors de la récupération du profil utilisateur'
				);
			} finally {
				setIsProcessing(false);
			}
		};

		processCallback();
	}, [navigate, search.error, search.token, getProfile]);

	if (isProcessing) {
		return (
			<div
				className='flex flex-col items-center justify-center min-h-screen'
				data-testid='loading-container'>
				<Spinner size='lg' data-testid='loading-spinner' />
				<p className='mt-4 text-gray-600' data-testid='loading-text'>
					Finalisation de la connexion...
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div
				className='flex flex-col items-center justify-center min-h-screen p-4'
				data-testid='error-container'>
				<Alert
					variant='error'
					className='mb-4 max-w-md'
					data-testid='error-alert'>
					<AlertDescription data-testid='error-message'>
						{error}
					</AlertDescription>
				</Alert>
				<button
					className='text-primary hover:underline'
					onClick={() => navigate({ to: '/login' })}
					data-testid='login-button'>
					Retour à la page de connexion
				</button>
			</div>
		);
	}

	return null;
};

export default SocialCallback;
