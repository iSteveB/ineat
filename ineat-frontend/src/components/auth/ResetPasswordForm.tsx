import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { ResetPasswordSchema } from '@/schemas';
import { Alert, AlertDescription } from '../ui/alert';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
} from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

interface ResetPasswordFormProps {
	token?: string;
	error?: string;
}

const getBetterAuthResetErrorMessage = (
	error: { code?: string; message?: string } | null | undefined
) => {
	if (error?.code === 'INVALID_TOKEN') {
		return 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.';
	}

	if (error?.code === 'PASSWORD_TOO_SHORT') {
		return 'Choisissez un mot de passe d’au moins 8 caractères.';
	}

	return 'Impossible de changer le mot de passe. Réessayez dans un instant.';
};

const ResetPasswordForm = ({ token, error }: ResetPasswordFormProps) => {
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [formError, setFormError] = useState<string | null>(
		error === 'INVALID_TOKEN'
			? 'Ce lien a expiré ou a déjà servi. Demandez-en un nouveau.'
			: !token
				? 'Ce lien est incomplet. Copiez-le en entier depuis l’e-mail reçu.'
				: null
	);
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const validateForm = () => {
		try {
			ResetPasswordSchema.parse({
				token,
				password,
				confirmPassword,
			});
			setFormError(null);
			return true;
		} catch (validationError) {
			if (validationError instanceof z.ZodError) {
				setFormError(
					validationError.errors.map((err) => err.message).join('. ')
				);
				return false;
			}

			setFormError('Vérifiez les champs du formulaire');
			return false;
		}
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();

		if (!validateForm() || !token) {
			return;
		}

		setIsLoading(true);

		try {
			const { error: resetError } = await authClient.resetPassword({
				newPassword: password,
				token,
			});

			if (resetError) {
				setFormError(getBetterAuthResetErrorMessage(resetError));
				return;
			}

			setIsSuccess(true);
			setPassword('');
			setConfirmPassword('');
		} catch {
			setFormError('Impossible de changer le mot de passe. Réessayez dans un instant.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className='mx-auto w-full max-w-md border border-neutral-200 p-6 shadow-sm sm:p-8'>
			<CardHeader>
				<h1 className='type-h1 text-neutral-900'>Nouveau mot de passe</h1>
				<CardDescription>
					Choisissez un nouveau mot de passe pour votre compte
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isSuccess ? (
					<Alert variant='success' className='mb-4' data-testid='success-alert'>
						<CircleCheck aria-hidden='true' />
						<AlertDescription>
							Mot de passe modifié. Vous pouvez vous connecter avec le nouveau.
						</AlertDescription>
					</Alert>
				) : (
					<form
						onSubmit={handleSubmit}
						className='space-y-4'
						data-testid='reset-password-form'>
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

						<div className='space-y-2'>
							<Label htmlFor='password'>
								Nouveau mot de passe
							</Label>
							<Input
								id='password'
								type='password'
								value={password}
								onChange={(event) => {
									setPassword(event.target.value);
									setFormError(null);
								}}
								required
								minLength={8}
								disabled={isLoading || !token}
								data-testid='password-input'
							/>
						</div>

						<div className='space-y-2'>
							<Label htmlFor='confirmPassword'>
								Confirmer le mot de passe
							</Label>
							<Input
								id='confirmPassword'
								type='password'
								value={confirmPassword}
								onChange={(event) => {
									setConfirmPassword(event.target.value);
									setFormError(null);
								}}
								required
								disabled={isLoading || !token}
								data-testid='confirm-password-input'
							/>
						</div>

						<Button
							type='submit'
							className='w-full'
							disabled={isLoading || !token}
							data-testid='submit-button'>
							{isLoading
								? 'Enregistrement…'
								: 'Enregistrer le mot de passe'}
						</Button>
					</form>
				)}
			</CardContent>
			<CardFooter className='flex justify-center'>
				<Button asChild variant='link' className='h-auto p-0'>
						<Link to='/login' data-testid='back-to-login'>
							Retour à la connexion
						</Link>
					</Button>
			</CardFooter>
		</Card>
	);
};

export default ResetPasswordForm;
