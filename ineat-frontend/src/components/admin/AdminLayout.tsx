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
import { Card, CardContent } from '@/components/ui/card';
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

	const pageLabel = pageLabels[location.pathname] ?? 'Administration';
	return (
		<div className='mx-auto grid w-full max-w-7xl gap-6 p-4 pb-28 lg:grid-cols-[15rem_minmax(0,1fr)] lg:p-6'>
		<aside className='lg:sticky lg:top-4 lg:self-start'>
			<div className='mb-3 flex items-center gap-3 px-1'>
				<div className='rounded-lg bg-primary/10 p-2 text-primary'>
					<Shield className='size-5' />
				</div>
				<div className='min-w-0'>
					<p className='font-semibold text-neutral-900'>Administration</p>
					<p className='truncate text-xs text-neutral-500'>
						{user?.firstName} {user?.lastName}
					</p>
				</div>
			</div>
			<nav
				aria-label='Navigation administration'
				className='flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible'>
				{navigation.map(({ to, label, icon: Icon }) => {
					const isActive =
						to === '/app/admin'
							? location.pathname === to || location.pathname === `${to}/`
							: location.pathname.startsWith(to);
					return (
						<Link
							key={to}
							to={to}
							aria-current={isActive ? 'page' : undefined}
							className={cn(
								'flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
								isActive
									? 'border-primary/20 bg-primary/10 text-primary'
									: 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
							)}>
							<Icon className='size-4' />
							{label}
						</Link>
					);
				})}
			</nav>
		</aside>
		<section className='min-w-0'>
			<nav aria-label='Fil d’Ariane' className='mb-4 text-sm text-neutral-500'>
				<Link to='/app/admin' className='hover:text-neutral-900'>
					Administration
				</Link>
				{pageLabel !== 'Vue d’ensemble' && (
					<>
						<span aria-hidden='true' className='mx-2'>
							/
						</span>
						<span aria-current='page' className='text-neutral-700'>
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
		<div className='mx-auto max-w-2xl p-4'>
			<Card>
				<CardContent className='p-8 text-center'>
					<Shield className='mx-auto mb-3 size-8 text-muted-foreground' />
					<h1 className='text-xl font-semibold text-neutral-900'>
						Accès administrateur requis
					</h1>
					<p className='mt-2 text-sm text-neutral-600'>
						Vous ne disposez pas des droits nécessaires pour consulter cette section.
					</p>
					<Button asChild className='mt-5' variant='secondary'>
						<Link to='/app'>Retour au tableau de bord</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
