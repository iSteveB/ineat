// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Configuration globale
  app.enableCors({
    origin: configService.get<string>('CLIENT_URL'),
    credentials: true,
  });

  // Middlewares de sécurité et performance
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // Préfixe global pour les API
  app.setGlobalPrefix('api');

  // Validation des requêtes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Démarrage du serveur
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`Application démarrée sur: http://localhost:${port}`);
  console.log(`Mode: ${configService.get<string>('NODE_ENV')}`);
}

bootstrap();
