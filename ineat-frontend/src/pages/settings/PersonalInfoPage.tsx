import { Button } from '@/components/ui/button';
import { Link } from '@tanstack/react-router';
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ProfileType } from '@/schemas';
import { useAuthStore } from '@/stores/authStore';
import { ChevronLeft, User, Save, Loader2, Camera, Edit3 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const PersonalInfoPage = () => {
	const user = useAuthStore((state) => state.user);

	const [personalInfo, setPersonalInfo] = useState({
		firstName: '',
		lastName: '',
		email: '',
		profileType: (user?.profileType || 'SINGLE') as ProfileType,
	});

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

	const [isSubmittingPersonal, setIsSubmittingPersonal] = useState(false);
	const [isEditing, setIsEditing] = useState(false);

	const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setIsEditing(true);
		const { name, value } = e.target;
		setPersonalInfo((prev) => ({ ...prev, [name]: value }));
	};

	const handleProfileTypeChange = (value: string) => {
		setIsEditing(true);
		setPersonalInfo((prev) => ({
			...prev,
			profileType: value as ProfileType,
		}));
	};

	const handlePersonalSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmittingPersonal(true);

		// Simulate API call
		setTimeout(() => {
			console.log(
				'Informations personnelles mises à jour:',
				personalInfo
			);
			// Call API
			// apiClient.updatePersonalInfo(personalInfo)
			setIsSubmittingPersonal(false);
			setIsEditing(false);
		}, 1000);
	};

	const handleAvatarClick = () => {
		//TODO : Ouvrir le modal de modification de la photo de profil
	};

	return (
		<div className='min-h-screen bg-gradient-to-br from-neutral-50 to-info-50/30'>
			{/* ===== HEADER ===== */}
			<div className='relative overflow-hidden bg-neutral-50 border-b border-gray-200 shadow-sm'>
				<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-info-100/30 to-primary-100/30 rounded-full blur-3xl -translate-y-16 translate-x-16' />

				<div className='relative px-6 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						<Link to='/app/settings'>
							<Button
								variant='ghost'
								size='sm'
								className='size-10 p-0 rounded-xl bg-neutral-100 hover:bg-gray-100 border border-gray-200 shadow-sm'>
								<ChevronLeft className='size-5' />
							</Button>
						</Link>
						<div>
							<h1 className='text-2xl font-bold text-neutral-300'>
								Informations personnelles
							</h1>
							<p className='text-sm text-neutral-200'>
								Gérez vos données
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className='px-6 py-6 space-y-6'>
				{/* ===== SECTION PHOTO DE PROFIL ===== */}
				<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-neutral-50 to-neutral-100/50 shadow-xl'>
					<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success-50/20 to-primary-100/20 rounded-full blur-3xl -translate-y-16 translate-x-16' />
					<CardContent className='p-6 flex flex-col items-center justify-center gap-4'>
						<div
							className='relative size-28 rounded-full bg-gradient-to-br from-success-50 to-success-50/80 flex items-center justify-center overflow-hidden shadow-lg cursor-pointer group transition-all duration-300 hover:shadow-xl'
							onClick={handleAvatarClick}>
							{/* Photo de profil */}
							{user?.avatarUrl ? (
								<img
									src={user.avatarUrl || '/placeholder.svg'}
									alt='Photo de profil'
									className='size-full object-cover transition-all duration-300 group-hover:scale-110'
								/>
							) : (
								<span className='text-4xl font-semibold text-neutral-50 transition-all duration-300 group-hover:scale-110'>
									{user?.firstName && user?.lastName ? (
										`${user?.firstName[0]}${user?.lastName[0]}`
									) : (
										<User className='size-12 text-neutral-50' />
									)}
								</span>
							)}

							{/* Overlay d'édition */}
							<div className='absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center'>
								<div className='bg-white/20 backdrop-blur-sm rounded-full p-2 transform scale-75 group-hover:scale-100 transition-all duration-300'>
									<Camera className='size-5 text-white' />
								</div>
							</div>
						</div>

						{/* Informations utilisateur */}
						<div className='text-center'>
							<h2 className='text-xl font-bold text-neutral-300'>
								{user?.firstName} {user?.lastName}
							</h2>
							<p className='text-sm text-neutral-200'>
								{user?.email}
							</p>
						</div>

						{/* Bouton d'édition de profil */}
						<Button
							variant='ghost'
							size='sm'
							onClick={handleAvatarClick}
							className='mt-2 text-success-50 hover:text-success-50/80 hover:bg-success-50/10 border border-success-50/20 hover:border-success-50/30 transition-all duration-200'>
							<Edit3 className='size-4 mr-2' />
							Modifier la photo
						</Button>
					</CardContent>
				</Card>

				{/* ===== FORMULAIRE D'INFORMATIONS PERSONNELLES ===== */}
				<Card className='relative overflow-hidden border-0 bg-gradient-to-br from-neutral-50 to-neutral-100/50 shadow-xl'>
					<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-success-50/20 to-success-50/20 rounded-full blur-3xl -translate-y-16 translate-x-16' />
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<User className='size-5 text-success-50' />
							Informations de base
						</CardTitle>
						<CardDescription>
							Mettez à jour vos informations personnelles
						</CardDescription>
					</CardHeader>
					<form onSubmit={handlePersonalSubmit}>
						<CardContent className='space-y-4'>
							<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
								<div className='space-y-2'>
									<Label htmlFor='firstName'>Prénom</Label>
									<Input
										id='firstName'
										name='firstName'
										value={personalInfo.firstName}
										onChange={handlePersonalChange}
										required
										className='bg-neutral-100 border-gray-200 focus:ring-success-50 focus:border-success-50'
									/>
								</div>
								<div className='space-y-2'>
									<Label htmlFor='lastName'>Nom</Label>
									<Input
										id='lastName'
										name='lastName'
										value={personalInfo.lastName}
										onChange={handlePersonalChange}
										required
										className='bg-neutral-100 border-gray-200 focus:ring-success-50 focus:border-success-50'
									/>
								</div>
							</div>

							<div className='space-y-2'>
								<Label htmlFor='email'>Email</Label>
								<Input
									id='email'
									name='email'
									type='email'
									value={personalInfo.email}
									onChange={handlePersonalChange}
									required
									className='bg-neutral-100 border-gray-200 focus:ring-success-50 focus:border-success-50'
								/>
							</div>

							<div className='space-y-2'>
								<Label>Situation</Label>
								<RadioGroup
									value={personalInfo.profileType}
									onValueChange={handleProfileTypeChange}
									className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2'>
									<Label
										htmlFor='SINGLE'
										className={cn(
											'flex flex-col items-center justify-between rounded-xl border-2 border-gray-200 bg-neutral-100 p-4 cursor-pointer transition-all duration-200',
											personalInfo.profileType ===
												'SINGLE' &&
												'border-success-50 bg-success-50/20 shadow-md'
										)}>
										<RadioGroupItem
											value='SINGLE'
											id='SINGLE'
											className='sr-only'
										/>
										<span className='text-2xl mb-2'>
											👤
										</span>
										<span className='font-medium text-neutral-300'>
											Seul
										</span>
									</Label>
									<Label
										htmlFor='STUDENT'
										className={cn(
											'flex flex-col items-center justify-between rounded-xl border-2 border-gray-200 bg-neutral-100 p-4 cursor-pointer transition-all duration-200',
											personalInfo.profileType ===
												'STUDENT' &&
												'border-success-50 bg-success-50/20 shadow-md'
										)}>
										<RadioGroupItem
											value='STUDENT'
											id='STUDENT'
											className='sr-only'
										/>
										<span className='text-2xl mb-2'>
											🎓
										</span>
										<span className='font-medium text-neutral-300'>
											Étudiant
										</span>
									</Label>
									<Label
										htmlFor='FAMILY'
										className={cn(
											'flex flex-col items-center justify-between rounded-xl border-2 border-gray-200 bg-neutral-100 p-4 cursor-pointer transition-all duration-200',
											personalInfo.profileType ===
												'FAMILY' &&
												'border-success-50 bg-success-50/20 shadow-md'
										)}>
										<RadioGroupItem
											value='FAMILY'
											id='FAMILY'
											className='sr-only'
										/>
										<span className='text-2xl mb-2'>
											👨‍👩‍👧‍👦
										</span>
										<span className='font-medium text-neutral-300'>
											Famille
										</span>
									</Label>
								</RadioGroup>
							</div>
						</CardContent>
						<CardFooter>
							<Button
								type='submit'
								className='w-full h-12 bg-gradient-to-r from-success-50 to-success-50 hover:from-success-50/90 hover:to-success-50/90 text-neutral-50 shadow-lg hover:shadow-xl transition-all duration-300'
								disabled={!isEditing || isSubmittingPersonal}>
								{isSubmittingPersonal ? (
									<>
										<Loader2 className='size-4 mr-2 animate-spin' />
										Enregistrement...
									</>
								) : (
									<>
										<Save className='size-4 mr-2' />
										Enregistrer les modifications
									</>
								)}
							</Button>
						</CardFooter>
					</form>
				</Card>
			</div>
		</div>
	);
};

export default PersonalInfoPage;
