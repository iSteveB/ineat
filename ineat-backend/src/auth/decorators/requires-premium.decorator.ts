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
 * @UseGuards(JwtAuthGuard, PremiumGuard)
 * @Post('upload')
 * async uploadReceipt() { ... }
 * 
 * Utilisation sur un contrôleur (toutes les routes deviennent premium):
 * @Controller('receipt')
 * @RequiresPremium()
 * @UseGuards(JwtAuthGuard, PremiumGuard)
 * export class ReceiptController { ... }
 * 
 * Important: Ce décorateur doit être utilisé en combinaison avec:
 * 1. JwtAuthGuard (pour vérifier l'authentification)
 * 2. PremiumGuard (pour vérifier l'abonnement premium)
 */
export const RequiresPremium = () => SetMetadata(REQUIRES_PREMIUM_KEY, true);