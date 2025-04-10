import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from '@tanstack/react-router';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export function LogoutButton(props: ButtonProps) {
	const { logout } = useAuthStore();
	const navigate = useNavigate();

	const handleLogout = () => {
		logout();
		navigate({ to: '/login' });
	};

	return (
		<Button
			variant='destructive'
			onClick={handleLogout}
			data-testid='logout-button'
			{...props}>
			<LogOut className='mr-2 h-4 w-4' />
			Se déconnecter
		</Button>
	);
}
