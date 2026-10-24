import { useAuthStore } from '@/stores/authStore';
import { Link } from '@tanstack/react-router';
import {
	Bell,
	ChevronRight,
	CreditCard,
	LogOut,
	PanelTop,
	Shield,
	User,
	Utensils,
	type LucideIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getInitials } from '@/utils/ui-utils';

interface MenuItem {
	title: string;
	href: string;
	icon: LucideIcon;
	description: string;
}

const MenuGroup = ({ id, title, items }: { id: string; title: string; items: MenuItem[] }) => (
	<section aria-labelledby={id}>
		<h2 id={id} className='type-h2 mb-3 text-neutral-900'>
			{title}
		</h2>
		<ul className='card divide-y divide-neutral-200 overflow-hidden p-0'>
			{items.map((item) => (
				<li key={item.href}>
					<Link
						to={item.href}
						className='group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-neutral-50 sm:px-5'>
						<span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-800'>
							<item.icon className='size-5' aria-hidden='true' />
						</span>
						<span className='min-w-0 flex-1'>
							<span className='block font-medium text-neutral-900'>{item.title}</span>
							<span className='block text-sm text-neutral-600'>{item.description}</span>
						</span>
						<ChevronRight
							className='size-5 shrink-0 text-neutral-500 group-hover:text-accent-700'
							aria-hidden='true'
						/>
					</Link>
				</li>
			))}
		</ul>
	</section>
);

const SettingsPage = () => {
	const user = useAuthStore((state) => state.user);
	const logout = useAuthStore((state) => state.logout);
	const canAccessAdmin = Boolean(user?.capabilities.canAccessAdmin);
	const isPremium = user?.effectivePlan === 'PREMIUM';
	const initials = getInitials(user?.firstName ?? '', user?.lastName ?? '');

	const accountItems: MenuItem[] = [
		{
			title: 'Informations personnelles',
			href: '/app/settings/personal-info',
			icon: User,
			description: 'Nom, email, photo de profil',
		},
		{
			title: 'Restrictions alimentaires',
			href: '/app/settings/diet-restrictions',
			icon: Utensils,
			description: 'Allergies, régimes alimentaires',
		},
		{
			title: 'Abonnement',
			href: '/app/subscription',
			icon: CreditCard,
			description: 'Formule, facturation, avantages',
		},
	];

	const appItems: MenuItem[] = [
		{
			title: 'Notifications',
			href: '/app/settings/notifications',
			icon: Bell,
			description: 'Alertes de péremption, emails, rappels',
		},
		{
			title: 'Sécurité et confidentialité',
			href: '/app/settings/security',
			icon: Shield,
			description: 'Mot de passe, sessions, données',
		},
		...(canAccessAdmin
			? [
					{
						title: 'Administration',
						href: '/app/admin',
						icon: PanelTop,
						description: 'Utilisateurs, rôles, plans et quotas',
					},
				]
			: []),
	];

	return (
		<div className='mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-4 sm:px-6 lg:py-6'>
			<h1 className='type-h1 text-neutral-900'>Paramètres</h1>

			<section aria-label='Mon compte' className='card flex items-center gap-4 p-4 sm:p-5'>
				<span className='flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-xl font-semibold text-brand-800'>
					{user?.avatarUrl ? (
						<img src={user.avatarUrl} alt='' className='size-full object-cover' />
					) : (
						initials || <User className='size-7' aria-hidden='true' />
					)}
				</span>
				<div className='min-w-0 flex-1'>
					<p className='truncate font-display text-lg font-bold text-neutral-900'>
						{user?.firstName} {user?.lastName}
					</p>
					<p className='truncate text-sm text-neutral-600'>{user?.email}</p>
				</div>
				<Badge variant={isPremium ? 'premium' : 'default'}>{isPremium ? 'Premium' : 'Gratuit'}</Badge>
			</section>

			<MenuGroup id='settings-account' title='Mon compte' items={accountItems} />
			<MenuGroup id='settings-app' title='Application' items={appItems} />

			<Button variant='secondary' onClick={() => logout()} className='self-start'>
				<LogOut aria-hidden='true' />
				Se déconnecter
			</Button>
		</div>
	);
};

export default SettingsPage;
