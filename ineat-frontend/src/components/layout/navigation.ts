import { BookOpen, House, Package, Wallet, type LucideIcon } from 'lucide-react';

export interface NavigationEntry {
	label: string;
	to: '/app' | '/app/inventory' | '/app/recipes' | '/app/budget';
	icon: LucideIcon;
	isActive: (pathname: string) => boolean;
}

/** Destinations principales, partagées par la navigation basse (mobile) et latérale (desktop). */
export const navigationEntries: NavigationEntry[] = [
	{
		label: 'Accueil',
		to: '/app',
		icon: House,
		isActive: (pathname) => pathname === '/app' || pathname === '/app/',
	},
	{
		label: 'Inventaire',
		to: '/app/inventory',
		icon: Package,
		isActive: (pathname) => pathname.startsWith('/app/inventory'),
	},
	{
		label: 'Recettes',
		to: '/app/recipes',
		icon: BookOpen,
		isActive: (pathname) => pathname.startsWith('/app/recipes'),
	},
	{
		label: 'Budget',
		to: '/app/budget',
		icon: Wallet,
		isActive: (pathname) => pathname.startsWith('/app/budget'),
	},
];
