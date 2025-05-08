import { Link } from '@tanstack/react-router';
import { FC } from 'react';

interface NavigationItemProps {
  icon: React.ReactNode;
  to: string;
  label: string;
  isActive: boolean;
}

const NavigationItem: FC<NavigationItemProps> = ({ icon, to, label, isActive }) => {
  // Classes à appliquer en fonction de l'état actif
  const activeClass = "text-success-50";
  const inactiveClass = "text-neutral-200";
  const textClass = isActive ? activeClass : inactiveClass;
  
  return (
    <Link
      to={to}
      className={`flex items-center justify-center p-6 flex-col transition-colors ${isActive ? 'pointer-events-none' : 'hover:text-primary-100'}`}
    >
      <div className={textClass}>
        {icon}
      </div>
      <span className={textClass}>
        {label}
      </span>
    </Link>
  );
};

export default NavigationItem;