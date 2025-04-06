import { UserMenu } from '../auth/UserMenu';
import { Button } from '../ui/button';
import { Bell, Search } from 'lucide-react';
import { Input } from '../ui/input';
import { useLocation } from '@tanstack/react-router';
import { cn } from '@/lib/utils';

export function Header() {
  const location = useLocation();
  
  // Déterminer le titre de la page en fonction de l'URL actuelle
  const getPageTitle = (): string => {
    const path = location.pathname;
    
    if (path === '/app/') return 'Tableau de bord';
    if (path.startsWith('/app/inventory')) return 'Inventaire';
    if (path.startsWith('/app/shopping')) return 'Liste de courses';
    if (path.startsWith('/app/recipes')) return 'Recettes';
    if (path.startsWith('/app/planning')) return 'Planification';
    if (path.startsWith('/app/profile')) return 'Profil';
    if (path.startsWith('/app/profile/settings')) return 'Paramètres';
    
    return 'InEat';
  };
  
  return (
    <header className="bg-white border-b border-gray-200 h-16 px-4 flex items-center justify-between">
      {/* Titre de la page */}
      <div className="flex-1">
        <h1 className="text-xl font-semibold text-gray-800">{getPageTitle()}</h1>
      </div>
      
      {/* Barre de recherche */}
      <div className={cn(
        "mx-4 flex-1 max-w-md relative",
        // Masquer sur les petits écrans
        "hidden md:flex"
      )}>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="search"
            placeholder="Rechercher..."
            className="pl-10 pr-4 py-2 w-full bg-gray-50 border-gray-200 focus:bg-white"
          />
        </div>
      </div>
      
      {/* Actions rapides */}
      <div className="flex items-center space-x-2">
        {/* Bouton de recherche pour mobile */}
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5" />
        </Button>
        
        {/* Bouton de notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </Button>
        
        {/* Menu utilisateur */}
        <UserMenu />
      </div>
    </header>
  );
}