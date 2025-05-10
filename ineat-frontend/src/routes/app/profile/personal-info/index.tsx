import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

export const Route = createFileRoute('/app/profile/personal-info/')({
	component: PersonalInfoPage,
});

type ProfileType = 'SINGLE' | 'STUDENT' | 'FAMILY';

function PersonalInfoPage() {
	const user = useAuthStore((state) => state.user);

	// États des formulaires avec initialisation à partir des données utilisateur
	const [personalInfo, setPersonalInfo] = useState({
		firstName: '',
		lastName: '',
		email: '',
		profileType: (user?.profileType || 'SINGLE') as ProfileType,
	});

	// Initialiser le formulaire avec les données utilisateur au chargement
	useEffect(() => {
		if (user) {
			setPersonalInfo({
				firstName: user.firstName || '',
				lastName: user.lastName || '',
				email: user.email || '',
				profileType: (user.profileType || 'SINGLE') as ProfileType,
			});
		}
	}, [user]);

	const [passwordInfo, setPasswordInfo] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});

	// État de soumission
	const [isSubmittingPersonal, setIsSubmittingPersonal] = useState(false);
	const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
	const [isEditing, setIsEditing] = useState(false);

	// Gestionnaires de changement d'entrée
	const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setIsEditing(true);
		const { name, value } = e.target;
		setPersonalInfo((prev) => ({ ...prev, [name]: value }));
	};

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setPasswordInfo((prev) => ({ ...prev, [name]: value }));
	};

	const handleProfileTypeChange = (value: string) => {
		// Marquer le formulaire comme modifié
		setIsEditing(true);
		// Mettre à jour le type de profil
		setPersonalInfo((prev) => ({
			...prev,
			profileType: value as ProfileType,
		}));
		console.log('Changement de profil:', value);
	};

	// Soumission des formulaires
	const handlePersonalSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmittingPersonal(true);

		// Simuler un appel API
		setTimeout(() => {
			console.log('Information personnelles mises à jour:', personalInfo);
			// Ici vous appelleriez votre API
			// apiClient.updatePersonalInfo(personalInfo)
			setIsSubmittingPersonal(false);
		}, 1000);
	};

	const handlePasswordSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmittingPassword(true);

		// Simuler un appel API
		setTimeout(() => {
			console.log('Mot de passe mis à jour');
			// Ici vous appelleriez votre API
			// apiClient.updatePassword(passwordInfo)
			setIsSubmittingPassword(false);
			setPasswordInfo({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
		}, 1000);
	};

	// Vérifier si les mots de passe correspondent
	const passwordsMatch =
		passwordInfo.newPassword === passwordInfo.confirmPassword;
	const canSubmitPassword =
		passwordInfo.currentPassword.length > 0 &&
		passwordInfo.newPassword.length >= 8 &&
		passwordsMatch;

	return (
		<div className='min-h-screen bg-primary-50 pb-16'>
			{/* Header avec bouton retour */}
			<div className='px-4 py-3 bg-neutral-50 flex items-center border-b sticky top-0 z-10'>
				<Link to='/app/profile' className='mr-2'>
					<ChevronLeft className='size-5' />
				</Link>
				<h1 className='text-lg font-semibold'>
					Informations personnelles
				</h1>
			</div>

			<div className='p-4 space-y-6'>
				{/* Section photo de profil (à implémenter plus tard) */}
				<div className='flex justify-center mb-6'>
					<div className='size-24 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden'>
						{user?.avatarUrl ? (
							<img
								src={user.avatarUrl}
								alt='Photo de profil'
								className='size-full object-cover'
							/>
						) : (
							<span className='text-2xl font-semibold'>
								{user?.firstName && user?.lastName
									? `${user?.firstName[0]}${user?.lastName[0]}`
									: '?'}
							</span>
						)}
					</div>
				</div>

				{/* Formulaire d'informations personnelles */}
				<Card>
					<CardHeader>
						<CardTitle>Informations de base</CardTitle>
						<CardDescription>
							Mettez à jour vos informations personnelles
						</CardDescription>
					</CardHeader>
					<form onSubmit={handlePersonalSubmit}>
						<CardContent className='space-y-4'>
							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label htmlFor='firstName'>Prénom</Label>
									<Input
										id='firstName'
										name='firstName'
										placeholder={user?.firstName}
										onChange={handlePersonalChange}
										required
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='lastName'>Nom</Label>
									<Input
										id='lastName'
										name='lastName'
										placeholder={user?.lastName}
										onChange={handlePersonalChange}
										required
									/>
								</div>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='email'>Email</Label>
								<Input
									id='email'
									name='email'
									type='email'
									placeholder={user?.email}
									onChange={handlePersonalChange}
									required
								/>
							</div>

							<div className='space-y-2'>
								<Label>Situation</Label>
								<RadioGroup
									value={personalInfo.profileType}
									onValueChange={handleProfileTypeChange}
									className='grid grid-cols-3 gap-2 pt-2'>
									<div className='flex items-center space-x-2'>
										<RadioGroupItem
											value='SINGLE'
											id='SINGLE'
										/>
										<Label
											htmlFor='SINGLE'
											className='cursor-pointer'>
											Seul
										</Label>
									</div>
									<div className='flex items-center space-x-2'>
										<RadioGroupItem
											value='STUDENT'
											id='STUDENT'
										/>
										<Label
											htmlFor='STUDENT'
											className='cursor-pointer'>
											Étudiant
										</Label>
									</div>
									<div className='flex items-center space-x-2'>
										<RadioGroupItem
											value='FAMILY'
											id='FAMILY'
										/>
										<Label
											htmlFor='FAMILY'
											className='cursor-pointer'>
											Famille
										</Label>
									</div>
								</RadioGroup>
							</div>
						</CardContent>
						<CardFooter>
							<Button
								type='submit'
								className='w-full'
								disabled={!isEditing}>
								{isSubmittingPersonal
									? 'Enregistrement...'
									: 'Enregistrer les modifications'}
							</Button>
						</CardFooter>
					</form>
				</Card>

				{/* Formulaire de changement de mot de passe */}
				<Card>
					<CardHeader>
						<CardTitle>Modifier votre mot de passe</CardTitle>
						<CardDescription>
							Assurez-vous d'utiliser un mot de passe fort et
							unique
						</CardDescription>
					</CardHeader>
					<form onSubmit={handlePasswordSubmit}>
						<CardContent className='space-y-4'>
							<div className='space-y-2'>
								<Label htmlFor='currentPassword'>
									Mot de passe actuel
								</Label>
								<Input
									id='currentPassword'
									name='currentPassword'
									type='password'
									value={passwordInfo.currentPassword}
									onChange={handlePasswordChange}
									required
								/>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='newPassword'>
									Nouveau mot de passe
								</Label>
								<Input
									id='newPassword'
									name='newPassword'
									type='password'
									value={passwordInfo.newPassword}
									onChange={handlePasswordChange}
									required
									minLength={8}
								/>
								{passwordInfo.newPassword.length > 0 &&
									passwordInfo.newPassword.length < 8 && (
										<p className='text-sm text-error-100'>
											Le mot de passe doit contenir au
											moins 8 caractères
										</p>
									)}
							</div>

							<div className='space-y-2'>
								<Label htmlFor='confirmPassword'>
									Confirmer le mot de passe
								</Label>
								<Input
									id='confirmPassword'
									name='confirmPassword'
									type='password'
									value={passwordInfo.confirmPassword}
									onChange={handlePasswordChange}
									required
									className={cn(
										passwordInfo.confirmPassword.length >
											0 && !passwordsMatch
											? 'border-error-100'
											: ''
									)}
								/>
								{passwordInfo.confirmPassword.length > 0 &&
									!passwordsMatch && (
										<p className='text-sm text-error-100'>
											Les mots de passe ne correspondent
											pas
										</p>
									)}
							</div>
						</CardContent>
						<CardFooter>
							<Button
								type='submit'
								className='w-full bg-success-50 hover:bg-success-50'
								disabled={
									isSubmittingPassword || !canSubmitPassword
								}>
								{isSubmittingPassword
									? 'Mise à jour...'
									: 'Mettre à jour le mot de passe'}
							</Button>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
}
