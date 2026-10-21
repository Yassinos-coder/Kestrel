import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.setGlobalPrefix(configService.getOrThrow<string>('apiPrefix'));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: configService.getOrThrow<string[]>('corsOrigins') });
  app.enableShutdownHooks();

  await app.listen(configService.getOrThrow<number>('port'), '0.0.0.0');
}

void bootstrap();
