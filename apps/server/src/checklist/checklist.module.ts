import { Module } from '@nestjs/common';
import { ChecklistService } from './services/checklist.service';

@Module({
  providers: [ChecklistService],
  exports: [ChecklistService],
})
export class ChecklistModule {}
