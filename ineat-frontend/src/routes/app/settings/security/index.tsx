import { createFileRoute } from '@tanstack/react-router';
import { Link } from '@tanstack/react-router';
import { ChevronLeft, Info, Lock, Shield } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/app/settings/security/')({
	component: SecurityPrivacyPage,
});

function SecurityPrivacyPage() {
	// États pour les différents toggles
	const [securitySettings, setSecuritySettings] = useState({
		twoFactorAuth: false,
		biometricAuth: false,
		emailNotifications: true,
		dataSharing: false,
		locationTracking: false,
		saveSearchHistory: true,
	});

	// État pour le formulaire de changement de mot de passe
	const [passwordInfo, setPasswordInfo] = useState({
		currentPassword: '',
		newPassword: '',
		confirmPassword: '',
	});
	const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

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

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setPasswordInfo((prev) => ({ ...prev, [name]: value }));
	};

	// Vérifier si les mots de passe correspondent
	const passwordsMatch =
		passwordInfo.newPassword === passwordInfo.confirmPassword;
	const canSubmitPassword =
		passwordInfo.currentPassword.length > 0 &&
		passwordInfo.newPassword.length >= 8 &&
		passwordsMatch;

	// Gestionnaire pour les changements de toggles
	const handleToggleChange = (setting: keyof typeof securitySettings) => {
		setSecuritySettings((prev) => ({
			...prev,
			[setting]: !prev[setting],
		}));
	};

	return (
		<div className='min-h-screen bg-primary-50 pb-16'>
			{/* Header avec bouton retour */}
			<div className='px-4 py-3 bg-neutral-50 flex items-center border-b sticky top-0 z-10'>
				<Link to='/app/settings' className='mr-2'>
					<ChevronLeft className='h-5 w-5' />
				</Link>
				<h1 className='text-lg font-semibold'>
					Sécurité & Confidentialité
				</h1>
			</div>

			<div className='p-4 space-y-6'>
				{/* Formulaire de changement de mot de passe */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center'>
							{' '}
							<Lock className='mr-2 h-5 w-5 text-success-50' />{' '}
							Modifier mon mot de passe
						</CardTitle>
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

				{/* Section Confidentialité des Données */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center'>
							<Shield className='mr-2 h-5 w-5 text-success-50' />
							Confidentialité des Données
						</CardTitle>
						<CardDescription>
							Gérez vos données personnelles et leur utilisation
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='flex items-center justify-between'>
							<div>
								<Label
									htmlFor='dataSharing'
									className='font-medium'>
									Partage des données
								</Label>
								<p className='text-sm text-neutral-200'>
									Autoriser le partage anonyme à des fins
									d'amélioration
								</p>
							</div>
							<Switch
								id='dataSharing'
								checked={securitySettings.dataSharing}
								onCheckedChange={() =>
									handleToggleChange('dataSharing')
								}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Section FAQ */}
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center'>
							<Info className='mr-2 h-5 w-5 text-success-50' />
							Questions fréquentes
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Accordion type='single' collapsible className='w-full'>
							<AccordionItem value='item-1'>
								<AccordionTrigger>
									Comment mes données sont-elles utilisées ?
								</AccordionTrigger>
								<AccordionContent>
									InEat utilise vos données uniquement pour
									améliorer votre expérience et vous proposer
									des recettes et suggestions personnalisées.
									Nous ne vendons jamais vos données
									personnelles à des tiers. Pour plus de
									détails, consultez notre politique de
									confidentialité.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value='item-2'>
								<AccordionTrigger>
									Comment sécuriser mon compte ?
								</AccordionTrigger>
								<AccordionContent>
									Pour une sécurité optimale, nous vous
									recommandons d'activer l'authentification à
									deux facteurs, d'utiliser un mot de passe
									fort et unique, et de surveiller
									régulièrement les activités de votre compte.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value='item-3'>
								<AccordionTrigger>
									Comment désactiver les notifications ?
								</AccordionTrigger>
								<AccordionContent>
									Vous pouvez gérer vos préférences de
									notification dans la section "Notifications"
									de votre profil. Vous pouvez y désactiver
									les notifications par type ou complètement.
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
