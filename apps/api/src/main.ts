import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { join } from 'node:path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap(): Promise<void> {
  console.log('[API] Iniciando bootstrap...');

  const app =
    await NestFactory.create<NestExpressApplication>(
      AppModule,
    );

  console.log('[API] AppModule creado.');

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');

  app.useStaticAssets(
    join(process.cwd(), 'uploads'),
    {
      prefix: '/uploads/',
    },
  );

  app.enableCors({
    origin: [
      'http://localhost:5174',
      'http://127.0.0.1:5174',
        'http://192.168.100.25:5174',
      
    ],
    credentials: true,
    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port =
    config.get<number>('API_PORT', 3000);

  console.log(
    `[API] Intentando escuchar en puerto ${port}...`,
  );

  await app.listen(port, '0.0.0.0');

  console.log(
    `[API] Escuchando en http://127.0.0.1:${port}/api`,
  );
}

bootstrap().catch((error: unknown) => {
  console.error('[API] ERROR FATAL DURANTE BOOTSTRAP');
  console.error(error);

  process.exitCode = 1;
});