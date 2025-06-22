// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import * as compression from 'compression';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  // Options HTTPS
  const httpsOptions = {
    key: fs.readFileSync(path.resolve(homedir(), '.cert/localhost+2-key.pem')),
    cert: fs.readFileSync(path.resolve(homedir(), '.cert/localhost+2.pem')),
  };

  // Création de l'application
  const app = await NestFactory.create(AppModule, {
    httpsOptions,
  });
  const configService = app.get(ConfigService);

  // Utilisation de Swagger pour la documentation API
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Inventory API')
    .setDescription('API pour la gestion d\'un inventaire')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Récupérer la clé secrète pour signer les cookies
  const cookieSecret =
    configService.get<string>('COOKIE_SECRET') ||
    configService.get<string>('JWT_SECRET');

  // Middlewares de sécurité et performance
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser(cookieSecret));

  // Configuration CORS pour permettre les cookies dans les requêtes cross-origin
  app.enableCors({
    origin: configService.get<string>('CLIENT_URL'),
    credentials: true, // IMPORTANT: Permet l'envoi de cookies dans les requêtes CORS
  });

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

  console.log(`Application démarrée sur: ${await app.getUrl()}`);
  console.log(`Mode: ${configService.get<string>('NODE_ENV')}`);
}

bootstrap();
