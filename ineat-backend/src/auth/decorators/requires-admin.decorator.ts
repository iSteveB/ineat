import { SetMetadata } from '@nestjs/common';

/**
 * Clé pour identifier les routes nécessitant des droits Administrateur
 */
export const REQUIRES_ADMIN_KEY = 'requiresAdmin';

/**
 * Décorateur pour marquer une route ou un contrôleur comme nécessitant des droits Administrateur
 * 
 * Utilisation sur une méthode:
 * @RequiresAdmin()
 * @UseGuards(SessionAuthGuard, AdminGuard)
 * @Delete('users/:id')
 * async deleteUser() { ... }
 * 
 * Utilisation sur un contrôleur (toutes les routes deviennent admin-only):
 * @Controller('admin')
 * @RequiresAdmin()
 * @UseGuards(SessionAuthGuard, AdminGuard)
 * export class AdminController { ... }
 * 
 * Important: Ce décorateur doit être utilisé en combinaison avec:
 * 1. SessionAuthGuard (pour vérifier l'authentification)
 * 2. AdminGuard (pour vérifier le rôle administrateur)
 */
export const RequiresAdmin = () => SetMetadata(REQUIRES_ADMIN_KEY, true);