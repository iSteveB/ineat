import { Module } from '@nestjs/common';
import { ProductsController } from './controllers/products.controller';
import { ProductsService } from './services/products.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule, // Module Prisma pour l'accès à la base de données
  ],
  controllers: [
    ProductsController, // Controller gérant les requêtes HTTP pour les produits
  ],
  providers: [
    ProductsService, // Service contenant la logique métier des produits
  ],
  exports: [
    ProductsService, // Exporter le service pour qu'il puisse être utilisé par d'autres modules
  ],
})
export class ProductsModule {}