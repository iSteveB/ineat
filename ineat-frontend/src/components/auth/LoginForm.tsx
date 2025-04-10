import { useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { z } from 'zod';
import { LoginCredentialsSchema } from '../../schemas/authSchema';

interface SearchParams {
	redirect?: string;
	session?: string;
}

const LoginForm = () => {
	// États locaux du formulaire
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [formError, setFormError] = useState<string | null>(null);

	// Navigation et paramètres de recherche
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as SearchParams;
	const redirect = search.redirect;
	const sessionExpired = search.session === 'expired';

	// État global d'authentification avec Zustand
	const { login, loginWithGoogle, isLoading, error } = useAuthStore();

	// Validation du formulaire
	const validateForm = (): boolean => {
		try {
			LoginCredentialsSchema.parse({ email, password });
			setFormError(null);
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				const errors = error.errors.map((err) => err.message);
				setFormError(errors.join('. '));
			} else {
				setFormError('Erreur de validation du formulaire');
			}
			return false;
		}
	};

	// Soumission du formulaire
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation du formulaire
		if (!validateForm()) {
			return;
		}

		try {
			// Tentative de connexion via le store Zustand
			await login({ email, password });

			// Redirection après connexion réussie
			if (redirect) {
				navigate({ to: decodeURIComponent(redirect) });
			} else {
				navigate({ to: '/app' });
			}
		} catch {
			// Les erreurs sont déjà gérées dans le store
		}
	};

	return (
		<Card className='w-full max-w-md mx-auto'>
			<CardHeader>
				<CardTitle>Connexion</CardTitle>
				<CardDescription>
					Accédez à votre compte InEat pour gérer votre inventaire
					alimentaire
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={handleSubmit}
					className='space-y-4'
					data-testid='login-form'>
					{/* Message d'expiration de session */}
					{sessionExpired && (
						<Alert
							className='mb-4'
							data-testid='session-expired-alert'>
							<AlertDescription>
								Votre session a expiré. Veuillez vous
								reconnecter.
							</AlertDescription>
						</Alert>
					)}

					{/* Affichage des erreurs */}
					{(formError || error) && (
						<div data-testid='error-container'>
							<Alert
								variant='destructive'
								data-testid='error-alert'>
								<AlertDescription data-testid='error-message'>
									{formError || error}
								</AlertDescription>
							</Alert>
						</div>
					)}

					{/* Champ email */}
					<div className='space-y-2'>
						<Label htmlFor='email'>Email</Label>
						<Input
							id='email'
							type='email'
							placeholder='votre.email@exemple.com'
							autoComplete='email'
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								setFormError(null);
							}}
							required
							disabled={isLoading}
							data-testid='email-input'
						/>
					</div>

					{/* Champ mot de passe */}
					<div className='space-y-2'>
						<div className='flex items-center justify-between'>
							<Label htmlFor='password'>Mot de passe</Label>
							<Button
								variant='link'
								className='p-0 h-auto text-xs'
								onClick={() =>
									navigate({ to: '/forgot-password' })
								}
								type='button'
								disabled={isLoading}
								data-testid='forgot-password-button'>
								Mot de passe oublié ?
							</Button>
						</div>
						<Input
							id='password'
							type='password'
							placeholder='Votre mot de passe'
							autoComplete='current-password'
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								setFormError(null);
							}}
							required
							disabled={isLoading}
							data-testid='password-input'
						/>
					</div>

					{/* Bouton de connexion */}
					<Button
						type='submit'
						className='w-full'
						disabled={isLoading}
						data-testid='submit-button'>
						{isLoading ? 'Connexion en cours...' : 'Se connecter'}
					</Button>

					{/* Séparateur */}
					<div className='relative my-4'>
						<Separator />
						<span className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-500'>
							ou
						</span>
					</div>

					{/* Bouton de connexion Google */}
					<Button
						type='button'
						variant='outline'
						className='w-full'
						onClick={() => loginWithGoogle()}
						disabled={isLoading}
						data-testid='google-button'>
						<svg
							className='mr-2 h-4 w-4'
							aria-hidden='true'
							focusable='false'
							data-prefix='fab'
							data-icon='google'
							role='img'
							xmlns='http://www.w3.org/2000/svg'
							viewBox='0 0 488 512'>
							<path
								fill='currentColor'
								d='M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z'></path>
						</svg>
						Continuer avec Google
					</Button>
				</form>
			</CardContent>
			<CardFooter className='flex justify-center'>
				<p className='text-sm text-gray-600'>
					Vous n'avez pas de compte ?{' '}
					<Button
						variant='link'
						className='p-0 h-auto'
						onClick={() => navigate({ to: '/register' })}
						disabled={isLoading}
						data-testid='register-button'>
						S'inscrire
					</Button>
				</p>
			</CardFooter>
		</Card>
	);
};

export default LoginForm;
