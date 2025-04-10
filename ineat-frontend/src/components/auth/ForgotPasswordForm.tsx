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
	CardTitle,
} from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { z } from 'zod';
import { apiClient } from '../../lib/api-client';

// Schéma de validation pour l'email
const emailSchema = z.object({
	email: z
		.string()
		.min(1, "L'email est requis")
		.email("Format d'email invalide"),
});

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
			emailSchema.parse({ email });
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
			// Appel API pour réinitialiser le mot de passe
			await apiClient.post('/auth/forgot-password', { email });

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
		<Card className='w-full max-w-md mx-auto'>
			<CardHeader>
				<CardTitle>Réinitialisation de mot de passe</CardTitle>
				<CardDescription>
					Entrez votre adresse email pour recevoir un lien de
					réinitialisation
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isSuccess ? (
					<Alert className='mb-4' data-testid='success-alert'>
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
									variant='destructive'
									data-testid='error-alert'>
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
				<p className='text-sm text-gray-600'>
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
