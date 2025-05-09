import { createFileRoute } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/authStore';
import { Link } from '@tanstack/react-router';
import { ChevronRight, LogOut, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import { User } from '@/types/auth';

export const Route = createFileRoute('/app/profile/')({
	component: ProfilePage,
});

interface ProfileMenuItem {
	title: string;
	href: string;
}

const isUserPremium = (user: User) => {
	// TODO : Implémentation réelle à ajouter
	return user?.role === 'PREMIUM';
};

function ProfilePage() {
	const user = useAuthStore((state) => state.user);
	const logout = useAuthStore((state) => state.logout);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

	const accountItems: ProfileMenuItem[] = [
		{
			title: 'Informations personnelles',
			href: '/app/profile/personal-info',
		},
		{ title: 'Abonnement Premium', href: '/app/profile/subscription' },
		{ title: 'Sécurité & Confidentialité', href: '/app/profile/security' },
	];

	const preferencesItems: ProfileMenuItem[] = [
		{
			title: 'Restrictions alimentaires',
			href: '/app/profile/diet-restrictions',
		},
		{
			title: 'Préférences nutritionnelles',
			href: '/app/profile/nutrition-preferences',
		},
		{ title: 'Notifications', href: '/app/profile/notifications' },
	];

	const handleDeleteAccount = () => {
		// TODO : Implémentation réelle à ajouter
		console.log('Compte supprimé');
		setDeleteConfirmOpen(false);
		logout();
	};

	return (
		<div className='min-h-screen bg-primary-50 pb-16'>
			{/* Profil utilisateur */}
			<div className='bg-neutral-50 py-8'>
				<div className='flex flex-col items-center space-y-4'>
					<div className='size-32 rounded-full border-6 border-primary-100 flex items-center justify-center overflow-hidden'>
						{/* Avatar utilisateur */}
						<img
							src={
								user?.avatarUrl ||
								'https://avatar.iran.liara.run/public'
							}
							alt='Avatar utilisateur'
							className='size-full object-cover'
						/>
					</div>

					<div className='text-center'>
						<h2 className='text-2xl font-bold'>
							{user?.firstName} {user?.lastName}
						</h2>
						<p className='text-neutral-200'>{user?.email}</p>

						{/* Badge Premium */}
						{user && isUserPremium(user) && (
							<span className='inline-block mt-2 px-4 py-1 bg-primary-100 text-neutral-300 font-semibold rounded-full'>
								Premium
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Section Mon compte */}
			<section className='px-4 py-6'>
				<h2 className='text-2xl font-bold mb-4'>Mon compte</h2>
				<div className='bg-neutral-50 rounded-lg shadow-sm overflow-hidden'>
					{accountItems.map((item, index) => (
						<Link
							key={index}
							to={item.href}
							className='flex items-center justify-between p-4 border-b border-neutral-100 last:border-b-0'>
							<span className='text-lg'>{item.title}</span>
							<ChevronRight className='size--5 text-neutral-200' />
						</Link>
					))}
				</div>
			</section>

			{/* Section Préférences */}
			<section className='px-4 py-6'>
				<h2 className='text-2xl font-bold mb-4'>Préférences</h2>
				<div className='bg-neutral-50 rounded-lg shadow-sm overflow-hidden'>
					{preferencesItems.map((item, index) => (
						<Link
							key={index}
							to={item.href}
							className='flex items-center justify-between p-4 border-b border-neutral-100 last:border-b-0'>
							<span className='text-lg'>{item.title}</span>
							<ChevronRight className='size-5 text-neutral-200' />
						</Link>
					))}
				</div>
			</section>

			{/* Boutons d'action */}
			<div className='px-4 mt-2 space-y-4'>
				<button
					onClick={() => logout()}
					className='w-full py-3 px-4 rounded-lg bg-neutral-200 text-neutral-50 font-semibold flex items-center justify-center'>
					<LogOut className='size-5 mr-2' />
					Déconnexion
				</button>

				<button
					onClick={() => setDeleteConfirmOpen(true)}
					className='w-full py-3 px-4 rounded-lg bg-error-100 text-neutral-50 font-semibold flex items-center justify-center'>
					<Trash2 className='size-5 mr-2' />
					Supprimer mon compte
				</button>
			</div>

			{/* Dialog de confirmation pour suppression de compte */}
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
							className='bg-error-100'>
							Supprimer définitivement
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
