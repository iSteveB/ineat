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
          ? ['info', 'warn', 'error']
          : ['error']
    });
  }

  // Etablit la connexion à la base de données
  async onModuleInit() {
    await this.$connect();

    if (process.env.NODE_ENV === 'production') {
      try {
        console.log('🔄 Running database migrations...');
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
          exec(
            'npx prisma migrate deploy',
            (error: any, stdout: any, stderr: any) => {
              if (error) {
                console.error('❌ Migration failed:', error);
                reject(error);
              } else {
                console.log('✅ Migrations completed successfully');
                console.log(stdout);
                resolve(stdout);
              }
            },
          );
        });
      } catch (error) {
        console.error('❌ Failed to run migrations:', error);
        throw error;
      }
    }
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
