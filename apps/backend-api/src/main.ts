// src/main.ts
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
//import { TenantInterceptor } from '../database/tenant.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const port = Number(process.env.PORT ?? 3001);

  const app = await NestFactory.create(AppModule);

  // Enable CORS for frontend access
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // Enforce data isolation globally across all request endpoints
 // app.useGlobalInterceptors(new TenantInterceptor());

  // Start the server
  await app.listen(port);

  logger.log(`🚀 Backend API running on http://localhost:${port}`);
  logger.log('Routes use controller-level /api prefixes');
  logger.log(`CORS enabled for origin: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Backend API failed to start', error instanceof Error ? error.stack : String(error));
  process.exit(1);
});