import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Le décorateur @Global() rend ce module disponible dans toute l'application
@Module({
  providers: [PrismaService], // Déclare PrismaService comme fournisseur
  exports: [PrismaService], // Exporte PrismaService pour l'injecter ailleurs
})
export class PrismaModule {}
