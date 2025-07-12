import { z } from 'zod';
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { RegisterDataSchema } from '@/schemas';
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
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Separator } from '../ui/separator';

const RegisterForm = () => {
	// États locaux du formulaire
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		firstName: '',
		lastName: '',
		profileType: 'FAMILY',
	});
	const [formError, setFormError] = useState<string | null>(null);
	const [showForm, setShowForm] = useState(false);

	// Navigation
	const navigate = useNavigate();

	// État global d'authentification avec Zustand
	const { register, loginWithGoogle, isLoading, error } = useAuthStore();

	// Mise à jour des champs du formulaire
	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
		setFormError(null);
	};

	// Mise à jour du type de profil (radiogroup)
	const handleProfileTypeChange = (value: string) => {
		setFormData((prev) => ({
			...prev,
			profileType: value,
		}));
		setFormError(null);
	};

	// Validation du formulaire
	const validateForm = (): boolean => {
		try {
			RegisterDataSchema.parse(formData);
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
			await register({
				...formData,
				profileType: formData.profileType as
					| 'FAMILY'
					| 'STUDENT'
					| 'SINGLE',
			});

			// Redirection après inscription réussie
			navigate({ to: '/app' });
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

				{/* Type de profil */}
				<div className='space-y-2'>
					<Label>Type de profil</Label>
					<RadioGroup
						value={formData.profileType}
						onValueChange={handleProfileTypeChange}
						className='flex flex-col space-y-2'
						data-testid='profile-type-group'>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem
								value='FAMILY'
								id='FAMILY'
								data-testid='profile-type-family'
							/>
							<Label htmlFor='FAMILY' className='cursor-pointer'>
								Famille
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem
								value='STUDENT'
								id='STUDENT'
								data-testid='profile-type-student'
							/>
							<Label htmlFor='STUDENT' className='cursor-pointer'>
								Étudiant
							</Label>
						</div>
						<div className='flex items-center space-x-2'>
							<RadioGroupItem
								value='SINGLE'
								id='SINGLE'
								data-testid='profile-type-single'
							/>
							<Label htmlFor='SINGLE' className='cursor-pointer'>
								Personne seule
							</Label>
						</div>
					</RadioGroup>
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

				{/* Bouton d'inscription avec Google (prioritaire) */}
				<Button
					type='button'
					variant='outline'
					className='w-full mb-4'
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
					S'inscrire avec Google
				</Button>

				{/* Séparateur */}
				<div className='relative my-4'>
					<Separator />
					<span className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-gray-500'>
						ou
					</span>
				</div>

				{/* Affichage conditionnel du formulaire ou du bouton */}
				{showForm ? (
					renderEmailForm()
				) : (
					<Button
						type='button'
						variant='secondary'
						className='w-full'
						onClick={() => setShowForm(true)}
						disabled={isLoading}
						data-testid='show-email-form-button'>
						S'inscrire avec mon email
					</Button>
				)}
			</CardContent>
			<CardFooter className='flex justify-center'>
				<p className='text-sm text-gray-600'>
					Vous avez déjà un compte ?{' '}
					<Button
						variant='link'
						className='p-0 h-auto'
						onClick={() => navigate({ to: '/login' })}
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
