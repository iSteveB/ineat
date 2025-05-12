import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

export const Route = createFileRoute('/app/settings/personal-info/')({
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

	// État de soumission
	const [isSubmittingPersonal, setIsSubmittingPersonal] = useState(false);

	const [isEditing, setIsEditing] = useState(false);

	// Gestionnaires de changement d'entrée
	const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setIsEditing(true);
		const { name, value } = e.target;
		setPersonalInfo((prev) => ({ ...prev, [name]: value }));
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

	return (
		<div className='min-h-screen bg-primary-50 pb-16'>
			{/* Header avec bouton retour */}
			<div className='px-4 py-3 bg-neutral-50 flex items-center border-b sticky top-0 z-10'>
				<Link to='/app/settings' className='mr-2'>
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
			</div>
		</div>
	);
}
