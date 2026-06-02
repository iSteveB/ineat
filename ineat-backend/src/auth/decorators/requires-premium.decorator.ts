import { SetMetadata } from '@nestjs/common';

/**
 * Clé pour identifier les routes nécessitant un abonnement Premium
 */
export const REQUIRES_PREMIUM_KEY = 'requiresPremium';

/**
 * Décorateur pour marquer une route ou un contrôleur comme nécessitant un abonnement Premium
 * 
 * Utilisation sur une méthode:
 * @RequiresPremium()
 * @UseGuards(SessionAuthGuard, PremiumGuard)
 * @Post('drive/import')
 * async importDriveInvoice() { ... }
 * 
 * Utilisation sur un contrôleur (toutes les routes deviennent premium):
 * @Controller('inventory')
 * @RequiresPremium()
 * @UseGuards(SessionAuthGuard, PremiumGuard)
 * export class InventoryController { ... }
 * 
 * Important: Ce décorateur doit être utilisé en combinaison avec:
 * 1. SessionAuthGuard (pour vérifier l'authentification)
 * 2. PremiumGuard (pour vérifier l'abonnement premium)
 */
export const RequiresPremium = () => SetMetadata(REQUIRES_PREMIUM_KEY, true);
