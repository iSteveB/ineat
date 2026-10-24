import { Link, Outlet, useLocation } from '@tanstack/react-router';
import {
	Activity,
	CreditCard,
	Gauge,
	History,
	Shield,
	Users,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';

const navigation = [
	{ to: '/app/admin', label: 'Vue d’ensemble', icon: Gauge },
	{ to: '/app/admin/users', label: 'Utilisateurs', icon: Users },
	{ to: '/app/admin/subscriptions', label: 'Abonnements', icon: CreditCard },
	{ to: '/app/admin/operations', label: 'Opérations', icon: Activity },
	{ to: '/app/admin/audit', label: 'Journal d’audit', icon: History },
] as const;

const pageLabels: Record<string, string> = {
	'/app/admin': 'Vue d’ensemble',
	'/app/admin/': 'Vue d’ensemble',
	'/app/admin/users': 'Utilisateurs',
	'/app/admin/subscriptions': 'Abonnements',
	'/app/admin/operations': 'Opérations',
	'/app/admin/audit': 'Journal d’audit',
};

export default function AdminLayout() {
	const user = useAuthStore((state) => state.user);
	const location = useLocation();
	const canAccessAdmin = Boolean(user?.capabilities.canAccessAdmin);

	if (!canAccessAdmin) return <AdminAccessDenied />;

	const pageLabel =
		pageLabels[location.pathname] ??
		(location.pathname.startsWith('/app/admin/users/')
			? 'Détail utilisateur'
			: 'Administration');
	return (
		<div className='mx-auto grid w-full max-w-7xl gap-6 px-4 py-4 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:py-6'>
			<aside className='min-w-0 lg:sticky lg:top-6 lg:self-start'>
				<div className='mb-3 flex items-center gap-3 px-1'>
					<span className='flex size-10 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-800'>
						<Shield className='size-5' aria-hidden='true' />
					</span>
					<div className='min-w-0'>
						<p className='font-semibold text-neutral-900'>Administration</p>
						<p className='truncate text-xs text-neutral-600'>
							{user?.firstName} {user?.lastName}
						</p>
					</div>
				</div>
				<nav
					aria-label='Navigation administration'
					className='-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0'>
					{navigation.map(({ to, label, icon: Icon }) => {
						const isActive =
							to === '/app/admin'
								? location.pathname === to || location.pathname === `${to}/`
								: location.pathname.startsWith(to);
						return (
							<Link
								key={to}
								to={to}
								search={to === '/app/admin' ? { period: '30d' } : undefined}
								aria-current={isActive ? 'page' : undefined}
								className={cn(
									'flex min-h-11 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
									isActive
										? 'bg-accent-50 font-semibold text-accent-800'
										: 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
								)}>
								<Icon className='size-4' aria-hidden='true' />
								{label}
							</Link>
						);
					})}
				</nav>
			</aside>
			<section className='min-w-0'>
				<nav aria-label='Fil d’Ariane' className='mb-4 text-sm text-neutral-600'>
					<Link
						to='/app/admin'
						search={{ period: '30d' }}
						className='rounded-sm underline-offset-4 hover:text-accent-700 hover:underline'>
						Administration
					</Link>
					{pageLabel !== 'Vue d’ensemble' && (
						<>
							<span aria-hidden='true' className='mx-2'>
								/
							</span>
							<span aria-current='page' className='text-neutral-800'>
								{pageLabel}
							</span>
						</>
					)}
				</nav>
				<Outlet />
			</section>
		</div>
	);
}

function AdminAccessDenied() {
	return (
		<div className='mx-auto w-full max-w-xl px-4 py-10 sm:px-6'>
			<div className='card flex flex-col items-center gap-3 p-8 text-center'>
				<span className='flex size-14 items-center justify-center rounded-full bg-neutral-100 text-neutral-700'>
					<Shield className='size-7' aria-hidden='true' />
				</span>
				<h1 className='type-h2 text-neutral-900'>Accès administrateur requis</h1>
				<p className='text-sm text-neutral-600'>
					Vous ne disposez pas des droits nécessaires pour consulter cette section.
				</p>
				<Button asChild className='mt-2' variant='secondary'>
					<Link to='/app'>Retour à l’accueil</Link>
				</Button>
			</div>
		</div>
	);
}
