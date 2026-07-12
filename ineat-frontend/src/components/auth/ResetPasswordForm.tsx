import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { z } from 'zod';
import { authClient } from '@/lib/auth-client';
import { ResetPasswordSchema } from '@/schemas';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
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
		return 'Le lien de réinitialisation est invalide ou a expiré.';
	}

	if (error?.code === 'PASSWORD_TOO_SHORT') {
		return 'Le mot de passe doit contenir au moins 8 caractères.';
	}

	return 'Impossible de réinitialiser le mot de passe.';
};

const ResetPasswordForm = ({ token, error }: ResetPasswordFormProps) => {
	const navigate = useNavigate();
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [formError, setFormError] = useState<string | null>(
		error === 'INVALID_TOKEN'
			? 'Le lien de réinitialisation est invalide ou a expiré.'
			: !token
				? 'Le lien de réinitialisation est incomplet.'
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

			setFormError('Erreur de validation du formulaire');
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
			setFormError('Impossible de réinitialiser le mot de passe.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Card className='w-full max-w-md mx-auto'>
			<CardHeader>
				<CardTitle>Nouveau mot de passe</CardTitle>
				<CardDescription>
					Choisissez un nouveau mot de passe pour votre compte
				</CardDescription>
			</CardHeader>
			<CardContent>
				{isSuccess ? (
					<Alert className='mb-4' data-testid='success-alert'>
						<AlertDescription>
							Votre mot de passe a été réinitialisé. Vous pouvez
							vous connecter avec votre nouveau mot de passe.
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
								? 'Réinitialisation...'
								: 'Réinitialiser le mot de passe'}
						</Button>
					</form>
				)}
			</CardContent>
			<CardFooter className='flex justify-center'>
				<Button
					variant='link'
					className='p-0 h-auto'
					onClick={() => navigate({ to: '/login' })}
					disabled={isLoading}
					data-testid='back-to-login'>
					Retour à la connexion
				</Button>
			</CardFooter>
		</Card>
	);
};

export default ResetPasswordForm;
