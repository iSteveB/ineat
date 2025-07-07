import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { InventoryService } from './services/inventory.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, // Module Prisma pour l'accès à la base de données
  ],
  controllers: [
    InventoryController, // Controller gérant les requêtes HTTP pour l'inventaire
  ],
  providers: [
    InventoryService, // Service contenant la logique métier de l'inventaire
  ],
  exports: [
    InventoryService, // Exporter le service pour qu'il puisse être utilisé par d'autres modules
  ],
})
export class InventoryModule {}