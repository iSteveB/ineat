import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  json,
  urlencoded,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './lib/auth';
import { getAllowedOrigins } from './config/origins';

const legacyAuthPaths = new Set(['/auth/profile', '/auth/check']);

const isLegacyAuthPath = (path: string) => legacyAuthPaths.has(path);

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
    bodyParser: false,
  });
  const configServiceInstance = app.get(ConfigService);

  // Middlewares de sécurité et performance
  app.use(
    helmet({
      contentSecurityPolicy: isProduction ? undefined : false,
    }),
  );
  app.use(compression());

  // Configuration CORS dynamique selon l'environnement
  const frontendUrl = configServiceInstance.get<string>('FRONTEND_URL');
  const corsOrigin = configServiceInstance.get<string>('CORS_ORIGIN');

  const allowedOrigins = getAllowedOrigins(nodeEnv, frontendUrl, corsOrigin);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  console.log(`🌐 CORS enabled for origins: ${allowedOrigins.join(', ')}`);

  const betterAuthHandler = toNodeHandler(auth);
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.all(
    '/auth/*',
    (req: Request, res: Response, next: NextFunction) => {
      if (isLegacyAuthPath(req.path)) {
        return next();
      }

      return betterAuthHandler(req, res);
    },
  );
  app.use(json());
  app.use(urlencoded({ extended: true }));

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
