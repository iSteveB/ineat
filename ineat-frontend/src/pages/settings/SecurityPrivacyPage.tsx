import { Link } from '@tanstack/react-router';
import { ChevronLeft, Info, Lock, Shield, Trash2 } from 'lucide-react';
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
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

const SecurityPrivacyPage = () => {
	const logout = useAuthStore((state) => state.logout);

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
	const [isSubmittingPassword, setIsSubmittingPassword] =
		useState<boolean>(false);

	// État pour la suppression de compte
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);

	const handlePasswordSubmit = (e: React.FormEvent): void => {
		e.preventDefault();
		setIsSubmittingPassword(true);

		// Simuler un appel API
		setTimeout(() => {
			console.log('Mot de passe mis à jour');
			// Ici on appelle notre API
			// apiClient.updatePassword(passwordInfo)
			setIsSubmittingPassword(false);
			setPasswordInfo({
				currentPassword: '',
				newPassword: '',
				confirmPassword: '',
			});
		}, 1000);
	};

	const handlePasswordChange = (
		e: React.ChangeEvent<HTMLInputElement>
	): void => {
		const { name, value } = e.target;
		setPasswordInfo((prev) => ({ ...prev, [name]: value }));
	};

	const handleDeleteAccount = (): void => {
		// TODO : Implémentation réelle à ajouter
		setDeleteConfirmOpen(false);
		logout();
	};

	// Vérifier si les mots de passe correspondent
	const passwordsMatch =
		passwordInfo.newPassword === passwordInfo.confirmPassword;
	const canSubmitPassword =
		passwordInfo.currentPassword.length > 0 &&
		passwordInfo.newPassword.length >= 8 &&
		passwordsMatch;

	// Gestionnaire pour les changements de toggles
	const handleToggleChange = (
		setting: keyof typeof securitySettings
	): void => {
		setSecuritySettings((prev) => ({
			...prev,
			[setting]: !prev[setting],
		}));
	};

	return (
		<div className='min-h-screen bg-neutral-50 pb-16'>
			{/* ===== HEADER ===== */}
			<div className='relative overflow-hidden bg-neutral-50 border-b border-neutral-100 shadow-sm'>
				{/* Dégradé de fond subtil pour l'ambiance, moins intrusif */}
				<div className='absolute top-0 right-0 size-32 bg-success-50/10 rounded-full blur-3xl -translate-y-16 translate-x-16' />

				<div className='relative px-6 py-4 flex items-center gap-4'>
					<Link to='/app/settings'>
						<Button
							variant='ghost'
							size='sm'
							className='size-10 p-0 rounded-xl bg-neutral-50 hover:bg-neutral-100 border border-neutral-100 shadow-sm'>
							<ChevronLeft className='size-5' />
						</Button>
					</Link>
					<div>
						<h1 className='text-2xl font-bold text-neutral-300'>
							Sécurité & Confidentialité
						</h1>
						<p className='text-sm text-neutral-300'>
							Gérez vos paramètres de sécurité et de
							confidentialité
						</p>
					</div>
				</div>
			</div>

			<div className='p-6 space-y-6'>
				{/* Formulaire de changement de mot de passe */}
				<Card className='border-0 bg-neutral-50 shadow-xl'>
					<CardHeader>
						<CardTitle className='flex items-center gap-3'>
							<div className='p-2 rounded-xl bg-success-50/20 border border-success-50/50'>
								<Lock className='size-5 text-success-50' />
							</div>
							Modifier mon mot de passe
						</CardTitle>
						<CardDescription className='text-neutral-300'>
							Assurez-vous d'utiliser un mot de passe fort et
							unique
						</CardDescription>
					</CardHeader>
					<form onSubmit={handlePasswordSubmit}>
						<CardContent className='space-y-4'>
							<div className='space-y-2'>
								<Label
									htmlFor='currentPassword'
									className='text-neutral-300'>
									Mot de passe actuel
								</Label>
								<Input
									id='currentPassword'
									name='currentPassword'
									type='password'
									value={passwordInfo.currentPassword}
									onChange={handlePasswordChange}
									required
									className='bg-neutral-50 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none'
								/>
							</div>

							<div className='space-y-2'>
								<Label
									htmlFor='newPassword'
									className='text-neutral-300'>
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
									className='bg-neutral-50 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none'
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
								<Label
									htmlFor='confirmPassword'
									className='text-neutral-300'>
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
										'bg-neutral-50 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-success-50 focus:border-success-50 focus:outline-none',
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
								className='w-full h-12 bg-success-50 hover:bg-success-50/90 text-neutral-50 shadow-lg hover:shadow-xl transition-all duration-300'
								disabled={
									isSubmittingPassword || !canSubmitPassword
								}>
								{isSubmittingPassword ? (
									<>
										<Loader2 className='size-4 mr-2 animate-spin' />
										Mise à jour...
									</>
								) : (
									'Mettre à jour le mot de passe'
								)}
							</Button>
						</CardFooter>
					</form>
				</Card>

				{/* Section Confidentialité des Données */}
				<Card className='border-0 bg-neutral-50 shadow-xl'>
					<CardHeader>
						<CardTitle className='flex items-center gap-3'>
							<div className='p-2 rounded-xl bg-success-50/20 border border-success-50/50'>
								<Shield className='size-5 text-success-50' />
							</div>
							Confidentialité des Données
						</CardTitle>
						<CardDescription className='text-neutral-300'>
							Gérez vos données personnelles et leur utilisation
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						<div className='flex items-center justify-between'>
							<div>
								<Label
									htmlFor='dataSharing'
									className='font-medium text-neutral-300'>
									Partage des données
								</Label>
								<p className='text-sm text-neutral-300'>
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
								className='data-[state=checked]:bg-success-50 data-[state=unchecked]:bg-neutral-200'
							/>
						</div>
						<div className='flex items-center justify-between'>
							<div>
								<Label
									htmlFor='locationTracking'
									className='font-medium text-neutral-300'>
									Suivi de localisation
								</Label>
								<p className='text-sm text-neutral-300'>
									Autoriser l'application à utiliser votre
									localisation
								</p>
							</div>
							<Switch
								id='locationTracking'
								checked={securitySettings.locationTracking}
								onCheckedChange={() =>
									handleToggleChange('locationTracking')
								}
								className='data-[state=checked]:bg-success-50 data-[state=unchecked]:bg-neutral-200'
							/>
						</div>
						<div className='flex items-center justify-between'>
							<div>
								<Label
									htmlFor='saveSearchHistory'
									className='font-medium text-neutral-300'>
									Historique de recherche
								</Label>
								<p className='text-sm text-neutral-300'>
									Enregistrer vos recherches pour des
									suggestions futures
								</p>
							</div>
							<Switch
								id='saveSearchHistory'
								checked={securitySettings.saveSearchHistory}
								onCheckedChange={() =>
									handleToggleChange('saveSearchHistory')
								}
								className='data-[state=checked]:bg-success-50 data-[state=unchecked]:bg-neutral-200'
							/>
						</div>
					</CardContent>
				</Card>

				{/* Section FAQ */}
				<Card className='border-0 bg-neutral-50 shadow-xl'>
					<CardHeader>
						<CardTitle className='flex items-center gap-3'>
							<div className='p-2 rounded-xl bg-success-50/20 border border-success-50/50'>
								<Info className='size-5 text-success-50' />
							</div>
							Questions fréquentes
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Accordion type='single' collapsible className='w-full'>
							<AccordionItem
								value='item-1'
								className='border-neutral-100'>
								<AccordionTrigger className='text-neutral-300 hover:no-underline hover:text-success-50 transition-colors'>
									Comment mes données sont-elles utilisées ?
								</AccordionTrigger>
								<AccordionContent className='text-neutral-300'>
									InEat utilise vos données uniquement pour
									améliorer votre expérience et vous proposer
									des recettes et suggestions personnalisées.
									Nous ne vendons jamais vos données
									personnelles à des tiers. Pour plus de
									détails, consultez notre politique de
									confidentialité.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem
								value='item-2'
								className='border-neutral-100'>
								<AccordionTrigger className='text-neutral-300 hover:no-underline hover:text-success-50 transition-colors'>
									Comment sécuriser mon compte ?
								</AccordionTrigger>
								<AccordionContent className='text-neutral-300'>
									Pour une sécurité optimale, nous vous
									recommandons d'activer l'authentification à
									deux facteurs, d'utiliser un mot de passe
									fort et unique, et de surveiller
									régulièrement les activités de votre compte.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem
								value='item-3'
								className='border-neutral-100'>
								<AccordionTrigger className='text-neutral-300 hover:no-underline hover:text-success-50 transition-colors'>
									Comment désactiver les notifications ?
								</AccordionTrigger>
								<AccordionContent className='text-neutral-300'>
									Vous pouvez gérer vos préférences de
									notification dans la section "Notifications"
									de votre profil. Vous pouvez y désactiver
									les notifications par type ou complètement.
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</CardContent>
				</Card>

				{/* Section suppression de compte */}
				<Card className='border-0 bg-neutral-50 shadow-xl'>
					<CardHeader>
						<CardTitle className='flex items-center gap-3'>
							<div className='p-2 rounded-xl bg-error-100/20 border border-error-100/50'>
								<Trash2 className='size-5 text-error-100' />
							</div>
							Supprimer mon compte
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className='p-4 bg-error-50/5 rounded-xl border border-error-100/20'>
							<p className='text-sm text-neutral-300 mb-4'>
								Cette action est définitive et supprimera toutes
								vos données, recettes sauvegardées, préférences
								et historique.
							</p>
							<Button
								onClick={() => setDeleteConfirmOpen(true)}
								className='bg-error-100 hover:bg-error-100/90 text-neutral-50 shadow-lg hover:shadow-xl transition-all duration-300'>
								<Trash2 className='size-4 mr-2' />
								Supprimer définitivement mon compte
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Dialog de confirmation de suppression */}
			<AlertDialog
				open={deleteConfirmOpen}
				onOpenChange={setDeleteConfirmOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							Êtes-vous sûr de vouloir supprimer votre compte ?
						</AlertDialogTitle>
						<AlertDialogDescription>
							Cette action est irréversible. Vous perdrez toutes
							vos données et serez déconnecté de l'application.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Annuler</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDeleteAccount}
							className='bg-error-100 text-neutral-50 hover:bg-error-100/90'>
							Supprimer définitivement
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export default SecurityPrivacyPage;
