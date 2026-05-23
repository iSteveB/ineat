import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const configService = new (await import('@nestjs/config')).ConfigService();
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const isProduction = nodeEnv === 'production';

  // Options HTTPS uniquement en développement
  let httpsOptions = undefined;
  if (!isProduction) {
    try {
      httpsOptions = {
        key: fs.readFileSync(
          path.resolve(homedir(), '.cert/localhost+2-key.pem'),
        ),
        cert: fs.readFileSync(path.resolve(homedir(), '.cert/localhost+2.pem')),
      };
      console.log('🔒 HTTPS certificates loaded for development');
    } catch (error) {
      console.log('⚠️ HTTPS certificates not found, using HTTP');
      httpsOptions = undefined;
    }
  }

  // Création de l'application (avec ou sans HTTPS)
  const app = await NestFactory.create(AppModule, {
    httpsOptions,
  });
  const configServiceInstance = app.get(ConfigService);

  // Utilisation de Swagger pour la documentation API (uniquement en dev)
  if (!isProduction) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('InEat API')
      .setDescription("API pour la gestion d'inventaire alimentaire")
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
    console.log('📚 Swagger documentation available at /docs');
  }

  // Récupérer la clé secrète pour signer les cookies
  const cookieSecret =
    configServiceInstance.get<string>('COOKIE_SECRET') ||
    configServiceInstance.get<string>('JWT_SECRET') ||
    'fallback-secret-key';

  // Middlewares de sécurité et performance
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
    }),
  );
  app.use(compression());
  app.use(cookieParser(cookieSecret));

  // Configuration CORS dynamique selon l'environnement
  const frontendUrl = configServiceInstance.get<string>('FRONTEND_URL');
  const corsOrigin = configServiceInstance.get<string>('CORS_ORIGIN');

  let allowedOrigins: string[] = [];

  if (isProduction) {
    // En production, utiliser les URLs Railway
    if (frontendUrl) allowedOrigins.push(frontendUrl);
    if (corsOrigin) allowedOrigins.push(corsOrigin);
  } else {
    // En développement, permettre localhost
    allowedOrigins = [
      'https://ineat-frontend-developpement.up.railway.app',
      'https://ineat-backend-developpement.up.railway.app',
      'https://192.168.1.28:5173',
      'https://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000',
    ];
  }

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  console.log(`🌐 CORS enabled for origins: ${allowedOrigins.join(', ')}`);

  // Préfixe global pour les API
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // Validation des requêtes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Démarrage du serveur
  const port = configServiceInstance.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Application started on port ${port}`);
  console.log(`📍 Environment: ${nodeEnv}`);
  console.log(`🔗 Health check: /health`);

  if (!isProduction) {
    console.log(`📖 API Documentation: ${await app.getUrl()}/docs`);
  }
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
