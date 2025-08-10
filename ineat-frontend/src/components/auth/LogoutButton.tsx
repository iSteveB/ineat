import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from '@tanstack/react-router';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function LogoutButton(props: ButtonProps) {
	const { logout } = useAuthStore();
	const navigate = useNavigate();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	const handleLogout = async () => {
		try {
			setIsLoggingOut(true);

			// Attendre que la déconnexion soit terminée
			await logout();

			// Naviguer vers la page de connexion après la déconnexion
			navigate({
				to: '/login',
				replace: true, // Remplacer l'entrée de l'historique pour éviter de revenir en arrière
			});
		} catch (error) {
			console.error('Erreur lors de la déconnexion:', error);
			// En cas d'erreur, naviguer quand même vers la page de connexion
			navigate({
				to: '/login',
				replace: true,
			});
		} finally {
			setIsLoggingOut(false);
		}
	};

	return (
		<Button
			variant='error'
			onClick={handleLogout}
			disabled={isLoggingOut}
			data-testid='logout-button'
			{...props}>
			<LogOut className='mr-2 size-4' />
			{isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
		</Button>
	);
}
