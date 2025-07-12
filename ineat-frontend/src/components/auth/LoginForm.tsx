import { useState } from 'react';
import GoogleLogo from '@/assets/google-logo.svg';
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
import { LoginCredentialsSchema } from '@/schemas';

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
					Accédez à votre compte pour gérer votre inventaire
					alimentaire.
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
							variant='warning'
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
							<Alert variant='error' data-testid='error-alert'>
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
					<div className='relative my-6'>
						<Separator />
						<span className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-neutral-50 px-2 text-xs text-neutral-300'>
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
						<span className='p-1 bg-neutral-50 rounded-full'>
							<img src={GoogleLogo} alt='Google Logo' />
						</span>
						Connexion avec Google
					</Button>
				</form>
			</CardContent>
			<CardFooter className='flex justify-center'>
				<p className='text-sm text-neutral-200'>
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
