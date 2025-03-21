import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      // Configuration des niveaux de log selon l'environnement
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error'] // En développement: tous les logs
          : ['error'], // En production: seulement les erreurs
    });
  }

  // Etablit la connexion à la base de données
  async onModuleInit() {
    await this.$connect();
  }

  // Ferme proprement la connexion à la base de données
  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Méthode utilitaire pour nettoyer la base de données pendant les tests
  async cleanDatabase() {
    // Cette méthode ne doit jamais être appelée en production
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    // Récupère dynamiquement tous les modèles de données définis dans Prisma
    const models = Reflect.ownKeys(this).filter((key) => {
      return (
        typeof key === 'string' &&
        !key.startsWith('_') &&
        key !== 'disconnect' &&
        key !== 'connect'
      );
    });

    // Supprime toutes les données de chaque modèle
    return Promise.all(
      models.map((modelKey: string) => {
        return this[modelKey].deleteMany({});
      }),
    );
  }
}
