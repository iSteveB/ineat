import { Link } from '@tanstack/react-router';
import { FC } from 'react';

interface NavigationItemProps {
	icon: React.ReactNode;
	to: string;
	label: string;
	isActive: boolean;
}

const NavigationItem: FC<NavigationItemProps> = ({
	icon,
	to,
	label,
	isActive,
}) => {
	// Classes à appliquer en fonction de l'état actif
	const activeClass = 'text-success-50';
	const inactiveClass = 'text-neutral-200';
	const textClass = isActive ? activeClass : inactiveClass;

	return (
		<Link
			to={to}
			className={`flex items-center justify-center p-2 flex-col transition-colors cursor-pointer ${
				isActive
					? 'text-success-50' // Garder la couleur active mais rester cliquable
					: 'text-neutral-200 hover:text-success-50' // Couleur inactive avec hover
			}`}
			data-testid={`nav-${label.toLowerCase()}`}>
			<div className={textClass}>{icon}</div>
			<span className={`text-xs font-medium ${textClass}`}>{label}</span>
			{/* Indicateur visuel pour l'état actif */}
			{isActive && (
				<div className='w-1 h-1 bg-success-50 rounded-full mt-1' />
			)}
		</Link>
	);
};

export default NavigationItem;
