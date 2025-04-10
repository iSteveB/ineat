import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from '@tanstack/react-router';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { LogOut, Settings, User } from 'lucide-react';

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Si l'utilisateur n'est pas défini, ne rien afficher
  if (!user) {
    return null;
  }

  // Obtenir les initiales de l'utilisateur pour l'avatar
  const getInitials = (): string => {
    if (!user.firstName || !user.lastName) {
      return '??';
    }
    return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
  };

  // Mapper les types de profil à des libellés en français
  const getProfileTypeLabel = (): string => {
    switch (user.profileType) {
      case 'FAMILY':
        return 'Famille';
      case 'STUDENT':
        return 'Étudiant';
      case 'SINGLE':
        return 'Personne seule';
      default:
        return user.profileType;
    }
  };

  // Handler pour la déconnexion
  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  // Handlers pour la navigation
  const handleProfileClick = () => {
    navigate({ to: '/app/profile' });
  };

  const handleSettingsClick = () => {
    navigate({ to: '/app/profile/settings' });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="user-menu-button">
          <Avatar className="h-8 w-8" data-testid="user-avatar">
            <AvatarFallback data-testid="avatar-initials">{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" data-testid="dropdown-content">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1" data-testid="user-info">
            <p className="text-sm font-medium leading-none" data-testid="user-name">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs leading-none text-muted-foreground" data-testid="user-email">
              {user.email}
            </p>
            <p className="text-xs leading-none text-muted-foreground" data-testid="user-profile-type">
              {getProfileTypeLabel()}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleProfileClick} className="cursor-pointer" data-testid="profile-menu-item">
          <User className="mr-2 h-4 w-4" />
          <span>Profil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSettingsClick} className="cursor-pointer" data-testid="settings-menu-item">
          <Settings className="mr-2 h-4 w-4" />
          <span>Paramètres</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-500" data-testid="logout-menu-item">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Se déconnecter</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}