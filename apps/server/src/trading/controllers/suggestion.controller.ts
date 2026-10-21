import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import type { SuggestionResult } from '@kestrel/shared';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../auth/interfaces/authenticated-user.interface';
import { SuggestionDto } from '../dto/suggestion.dto';
import { SuggestionService } from '../services/suggestion.service';

@Controller('suggestions')
@UseGuards(JwtAuthGuard)
export class SuggestionController {
  constructor(private readonly suggestions: SuggestionService) {}

  @Post()
  suggest(@CurrentUser() user: AuthenticatedUser, @Body() body: SuggestionDto): Promise<SuggestionResult> {
    return this.suggestions.suggest(user.userId, body.mint);
  }
}
