import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChecklistModule } from './checklist/checklist.module';
import configuration from './config/configuration';
import { HealthModule } from './health/health.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [configuration] }), HealthModule, ChecklistModule],
})
export class AppModule {}
