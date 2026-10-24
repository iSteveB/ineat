import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
} from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { EmailSchema } from '@/schemas';

const ForgotPasswordForm = () => {
	// États locaux du formulaire
	const [email, setEmail] = useState('');
	const [formError, setFormError] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	// Navigation
	const navigate = useNavigate();

	// Validation du formulaire
	const validateForm = (): boolean => {
		try {
			EmailSchema.parse(email);
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

		setIsLoading(true);

		try {
			const { error } = await authClient.requestPasswordReset({
				email,
				redirectTo: `${window.location.origin}/reset-password`,
			});

			if (error) {
				throw new Error(
					"Impossible d'envoyer le lien de réinitialisation"
				);
			}

			// Afficher le message de succès
			setIsSuccess(true);
			setEmail('');
		} catch (error) {
			if (error instanceof Error) {
				setFormError(error.message);
			} else {
				setFormError(
					'Une erreur est survenue lors de la demande de réinitialisation'
				);
			}
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className='mx-auto w-full max-w-md border border-neutral-200 p-6 shadow-sm sm:p-8'>
			<CardHeader>
				<h1 className='type-h1 text-neutral-900'>Réinitialisation de mot de passe</h1>
				<CardDescription>
					Entrez votre adresse email pour recevoir un lien de
					réinitialisation
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isSuccess ? (
					<Alert variant='success' className='mb-4' data-testid='success-alert'>
						<CircleCheck aria-hidden='true' />
						<AlertDescription>
							Si un compte existe avec cette adresse email, vous
							recevrez un email contenant les instructions pour
							réinitialiser votre mot de passe.
						</AlertDescription>
					</Alert>
				) : (
					<form
						onSubmit={handleSubmit}
						className='space-y-4'
						data-testid='reset-form'>
						{/* Affichage des erreurs */}
						{formError && (
							<div data-testid='error-container'>
								<Alert
									variant='error'
									data-testid='error-alert'>
									<CircleAlert aria-hidden='true' />
									<AlertDescription data-testid='error-message'>
										{formError}
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

						{/* Bouton de soumission */}
						<Button
							type='submit'
							className='w-full'
							disabled={isLoading}
							data-testid='submit-button'>
							{isLoading
								? 'Envoi en cours...'
								: 'Envoyer le lien de réinitialisation'}
						</Button>
					</form>
				)}
			</CardContent>
			<CardFooter className='flex justify-center'>
				<p className='text-sm text-neutral-600'>
					<Button
						variant='link'
						className='p-0 h-auto'
						onClick={() => navigate({ to: '/login' })}
						disabled={isLoading}
						data-testid='back-to-login'>
						Retour à la connexion
					</Button>
				</p>
			</CardFooter>
		</Card>
	);
};

export default ForgotPasswordForm;
