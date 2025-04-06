import { useNavigate, useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import {
	Home,
	ShoppingCart,
	Package,
	Receipt,
	Calendar,
	Settings,
	ChevronLeft,
	ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

// Type pour les éléments de navigation
interface NavItem {
	title: string;
	icon: React.FC<{ className?: string }>;
	path: string;
}

// Définition des éléments de navigation
const navItems: NavItem[] = [
	{
		title: 'Tableau de bord',
		icon: Home,
		path: '/app/',
	},
	{
		title: 'Inventaire',
		icon: Package,
		path: '/app/inventory',
	},
	{
		title: 'Liste de courses',
		icon: ShoppingCart,
		path: '/app/shopping',
	},
	{
		title: 'Recettes',
		icon: Receipt,
		path: '/app/recipes',
	},
	{
		title: 'Planification',
		icon: Calendar,
		path: '/app/planning',
	},
	{
		title: 'Paramètres',
		icon: Settings,
		path: '/app/profile/settings',
	},
];

export function Sidebar() {
	const [collapsed, setCollapsed] = useState(false);
	const navigate = useNavigate();
	const location = useLocation();

	const toggleSidebar = () => {
		setCollapsed(!collapsed);
	};

	return (
		<aside
			className={cn(
				'bg-primary text-primary-foreground flex flex-col h-screen transition-all duration-300',
				collapsed ? 'w-16' : 'w-64'
			)}>
			{/* Logo de l'application */}
			<div
				className={cn(
					'flex items-center h-16 px-4',
					collapsed ? 'justify-center' : 'justify-between'
				)}>
				{!collapsed && <h1 className='text-xl font-bold'>InEat</h1>}
				<Button
					variant='ghost'
					size='icon'
					onClick={toggleSidebar}
					className='text-primary-foreground hover:bg-primary-foreground/10'>
					{collapsed ? <ChevronRight /> : <ChevronLeft />}
				</Button>
			</div>

			{/* Navigation */}
			<nav className='flex-1 px-2 py-4 space-y-1'>
				{navItems.map((item) => {
					const isActive =
						location.pathname === item.path ||
						(item.path !== '/app/' &&
							location.pathname.startsWith(item.path));

					return (
						<Button
							key={item.path}
							variant='ghost'
							className={cn(
								'w-full flex items-center py-2 text-primary-foreground justify-start',
								collapsed ? 'px-2' : 'px-4',
								isActive
									? 'bg-primary-foreground/20 hover:bg-primary-foreground/30'
									: 'hover:bg-primary-foreground/10'
							)}
							onClick={() => navigate({ to: item.path })}>
							<item.icon
								className={cn(
									'h-5 w-5',
									collapsed ? 'mx-auto' : 'mr-3'
								)}
							/>
							{!collapsed && <span>{item.title}</span>}
						</Button>
					);
				})}
			</nav>

			{/* Footer de la sidebar */}
			<div className='p-4'>
				{!collapsed && (
					<div className='text-xs text-primary-foreground/60'>
						<p>InEat v1.0</p>
					</div>
				)}
			</div>
		</aside>
	);
}
