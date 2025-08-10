import { useAuthStore } from '@/stores/authStore';
import { Link } from '@tanstack/react-router';
import {
	ChevronRight,
	LogOut,
	Settings,
	User,
	Shield,
	Bell,
	CreditCard,
	Utensils,
	Eye,
} from 'lucide-react';
import { User as UserType } from '@/schemas';

interface MenuItem {
	title: string;
	href: string;
	icon: React.ComponentType<{ className?: string }>;
	description?: string;
}

const isUserPremium = (user: UserType): boolean => {
	return user?.subscription === 'PREMIUM';
};

const SettingsPage = () => {
	const user = useAuthStore((state) => state.user);
	const logout = useAuthStore((state) => state.logout);

	const profileItems: MenuItem[] = [
		{
			title: 'Informations personnelles',
			href: '/app/settings/personal-info',
			icon: User,
			description: 'Nom, prénom, photo de profil',
		},
		{
			title: 'Restrictions alimentaires',
			href: '/app/settings/diet-restrictions',
			icon: Utensils,
			description: 'Allergies, régimes alimentaires',
		},
		{
			title: "Préférences d'affichage",
			href: '/app/settings/preferences',
			icon: Eye,
			description: 'Thème, langue, unités',
		},
	];

	const systemSettingsItems: MenuItem[] = [
		{
			title: 'Sécurité & Confidentialité',
			href: '/app/settings/security',
			icon: Shield,
			description: 'Mot de passe, sessions, données',
		},
		{
			title: 'Notifications',
			href: '/app/settings/notifications',
			icon: Bell,
			description: 'Alertes, emails, rappels',
		},
		{
			title: 'Abonnement Premium',
			href: '/app/settings/subscription',
			icon: CreditCard,
			description: 'Plan, facturation, avantages',
		},
	];

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 pb-16'>
			{/* Header utilisateur */}
			<div className='bg-neutral-50 py-8 shadow-sm border-b border-gray-200'>
				<div className='flex flex-col items-center space-y-4'>
					<div className='size-24 rounded-full bg-primary-100 flex items-center justify-center overflow-hidden shadow-lg'>
						{user?.avatarUrl ? (
							<img
								src={user.avatarUrl || '/placeholder.svg'}
								alt='Photo de profil'
								className='size-full object-cover'
							/>
						) : (
							<span className='text-2xl font-semibold text-neutral-50'>
								{user?.firstName && user?.lastName
									? `${user?.firstName[0]}${user?.lastName[0]}`
									: '?'}
							</span>
						)}
					</div>

					<div className='text-center'>
						<h1 className='text-2xl font-bold text-gray-900'>
							{user?.firstName} {user?.lastName}
						</h1>
						<p className='text-gray-600'>{user?.email}</p>

						{user && isUserPremium(user) && (
							<span className='inline-block mt-2 px-4 py-1 bg-primary-100 text-neutral-50 font-semibold rounded-full shadow-sm'>
								Premium
							</span>
						)}
					</div>
				</div>
			</div>

			{/* Section PROFIL */}
			<section className='px-4 py-6'>
				<div className='flex items-center gap-3 mb-4'>
					<div className='p-2 bg-primary-100/10 rounded-lg'>
						<User className='size-5 text-primary-100' />
					</div>
					<div>
						<h2 className='text-xl font-bold text-gray-900'>
							Mes informations
						</h2>
						<p className='text-sm text-gray-600'>
							Profil et préférences personnelles
						</p>
					</div>
				</div>

				<div className='bg-neutral-50 rounded-xl shadow-xl border border-gray-100 overflow-hidden'>
					{profileItems.map((item, index) => (
						<Link
							key={index}
							to={item.href}
							className='flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors group'>
							<div className='flex items-center gap-4'>
								<div className='p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors'>
									<item.icon className='size-5 text-gray-600' />
								</div>
								<div>
									<span className='text-lg font-medium text-gray-900'>
										{item.title}
									</span>
									{item.description && (
										<p className='text-sm text-gray-500'>
											{item.description}
										</p>
									)}
								</div>
							</div>
							<ChevronRight className='size-5 text-gray-400 group-hover:text-gray-600 transition-colors' />
						</Link>
					))}
				</div>
			</section>

			{/* Section PARAMÈTRES - "Configuration" */}
			<section className='px-4 py-6'>
				<div className='flex items-center gap-3 mb-4'>
					<div className='p-2 bg-primary-100/10 rounded-lg'>
						<Settings className='size-5 text-primary-100' />
					</div>
					<div>
						<h2 className='text-xl font-bold text-gray-900'>
							Configuration
						</h2>
						<p className='text-sm text-gray-600'>
							Paramètres et sécurité de l'application
						</p>
					</div>
				</div>

				<div className='bg-neutral-50 rounded-xl shadow-xl border border-gray-100 overflow-hidden'>
					{systemSettingsItems.map((item, index) => (
						<Link
							key={index}
							to={item.href}
							className='flex items-center justify-between p-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors group'>
							<div className='flex items-center gap-4'>
								<div className='p-2 bg-gray-50 rounded-lg group-hover:bg-gray-100 transition-colors'>
									<item.icon className='size-5 text-gray-600' />
								</div>
								<div>
									<span className='text-lg font-medium text-gray-900'>
										{item.title}
									</span>
									{item.description && (
										<p className='text-sm text-gray-500'>
											{item.description}
										</p>
									)}
								</div>
							</div>
							<ChevronRight className='size-5 text-gray-400 group-hover:text-gray-600 transition-colors' />
						</Link>
					))}
				</div>
			</section>

			{/* Actions de compte */}
			<div className='px-4 mt-2 space-y-4'>
				<button
					onClick={() => logout()}
					className='w-full py-3 px-4 rounded-xl bg-neutral-400 text-neutral-50 font-semibold flex items-center justify-center cursor-pointer hover:bg-neutral-500 transition-colors shadow-md hover:shadow-lg'>
					<LogOut className='size-5 mr-2' />
					Déconnexion
				</button>
			</div>
		</div>
	);
};

export default SettingsPage;
