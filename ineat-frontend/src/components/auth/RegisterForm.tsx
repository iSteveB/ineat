import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { RegisterFormSchema } from '@/schemas';
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

const RegisterForm = () => {
	// États locaux du formulaire
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		confirmPassword: '',
		firstName: '',
		lastName: '',
	});
	const [formError, setFormError] = useState<string | null>(null);

	// Navigation
	const navigate = useNavigate();

	// État global d'authentification avec Zustand
	const { register, isLoading, error, setError } = useAuthStore();

	useEffect(() => {
		setError(null);

		return () => {
			setError(null);
		};
	}, [setError]);

	// Mise à jour des champs du formulaire
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
		setFormError(null);
		setError(null);
	};

	// Validation du formulaire
	const validateForm = (): boolean => {
		try {
			RegisterFormSchema.parse(formData);
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
			// Tentative d'inscription via le store Zustand
			const email = await register({
				email: formData.email,
				password: formData.password,
				firstName: formData.firstName,
				lastName: formData.lastName,
			});

			navigate({
				to: '/verify-email-pending',
				search: { email },
			});
		} catch {
			// Les erreurs sont déjà gérées dans le store
			// Pas besoin de code supplémentaire ici
		}
	};

	// Rendu du formulaire d'inscription
	const renderEmailForm = () => {
		return (
			<form
				onSubmit={handleSubmit}
				className='space-y-4'
				data-testid='register-email-form'>
				{/* Champs prénom et nom */}
				<div className='grid grid-cols-2 gap-4'>
					<div className='space-y-2'>
						<Label htmlFor='firstName'>Prénom</Label>
						<Input
							id='firstName'
							name='firstName'
							placeholder='Prénom'
							value={formData.firstName}
							onChange={handleChange}
							autoComplete='given-name'
							required
							disabled={isLoading}
							data-testid='firstName-input'
						/>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='lastName'>Nom</Label>
						<Input
							id='lastName'
							name='lastName'
							placeholder='Nom'
							autoComplete='family-name'
							value={formData.lastName}
							onChange={handleChange}
							required
							disabled={isLoading}
							data-testid='lastName-input'
						/>
					</div>
				</div>

				{/* Champ email */}
				<div className='space-y-2'>
					<Label htmlFor='email'>Email</Label>
					<Input
						id='email'
						name='email'
						type='email'
						placeholder='votre.email@exemple.com'
						autoComplete='email'
						value={formData.email}
						onChange={handleChange}
						required
						disabled={isLoading}
						data-testid='email-input'
					/>
				</div>

				{/* Champ mot de passe */}
				<div className='space-y-2'>
					<Label htmlFor='password'>Mot de passe</Label>
					<Input
						id='password'
						name='password'
						type='password'
						placeholder='Choisissez un mot de passe'
						autoComplete='new-password'
						value={formData.password}
						onChange={handleChange}
						required
						disabled={isLoading}
						data-testid='password-input'
					/>
					<p className='text-xs text-gray-500'>
						Au moins 8 caractères
					</p>
				</div>

				{/* Champ confirmation du mot de passe */}
				<div className='space-y-2'>
					<Label htmlFor='confirmPassword'>
						Confirmer le mot de passe
					</Label>
					<Input
						id='confirmPassword'
						name='confirmPassword'
						type='password'
						placeholder='Confirmez votre mot de passe'
						autoComplete='new-password'
						value={formData.confirmPassword}
						onChange={handleChange}
						required
						disabled={isLoading}
						data-testid='confirm-password-input'
					/>
				</div>

				{/* Bouton d'inscription */}
				<Button
					type='submit'
					className='w-full'
					disabled={isLoading}
					data-testid='register-submit-button'>
					{isLoading ? 'Inscription en cours...' : "S'inscrire"}
				</Button>
			</form>
		);
	};

	return (
		<Card className='w-full max-w-md mx-auto'>
			<CardHeader>
				<CardTitle>Créer un compte</CardTitle>
				<CardDescription>
					Rejoignez InEat pour mieux gérer vos stocks alimentaires
				</CardDescription>
			</CardHeader>
			<CardContent>
				{/* Affichage des erreurs */}
				{(formError || error) && (
					<div data-testid='error-container'>
						<Alert
							variant='error'
							className='mb-4'
							data-testid='error-alert'>
							<AlertDescription data-testid='error-message'>
								{formError || error}
							</AlertDescription>
						</Alert>
					</div>
				)}

				{renderEmailForm()}
			</CardContent>
			<CardFooter className='flex justify-center'>
				<p className='text-sm text-gray-600'>
					Vous avez déjà un compte ?{' '}
					<Button
						variant='link'
						className='p-0 h-auto'
						onClick={() => {
							setError(null);
							navigate({ to: '/login' });
						}}
						disabled={isLoading}
						data-testid='login-button'>
						Se connecter
					</Button>
				</p>
			</CardFooter>
		</Card>
	);
};

export default RegisterForm;
