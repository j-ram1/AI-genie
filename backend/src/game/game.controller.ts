import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { GameService } from './game.service';
import {
  validateDigit,
  validateGuessText,
  validateId,
  validatePhone,
  validateThemeId,
} from '../common/input.validation';

class StartGameDto {
  theme_id: string;
  user_id?: string;
  user_phone?: string; // backward compatible
}

class DtmfDto {
  session_id: string;
  digit: number;
}

class GuessDto {
  session_id: string;
  text: string;
}

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('themes')
  themes() {
    return this.gameService.listThemes();
  }

  @Post('start')
  start(@Body() dto: StartGameDto) {
    const userId = dto?.user_id ? validateId(dto.user_id, 'user_id') : undefined;
    const userPhone = dto?.user_phone ? validatePhone(dto.user_phone) : undefined;
    if (!userId && !userPhone) {
      throw new BadRequestException('user_id or user_phone is required');
    }
    return this.gameService.start({
      theme_id: validateThemeId(dto?.theme_id),
      user_id: userId,
      user_phone: userPhone,
    });
  }

  @Post('input/dtmf')
  input(@Body() dto: DtmfDto) {
    return this.gameService.inputDtmf({
      session_id: validateId(dto?.session_id, 'session_id'),
      digit: validateDigit(dto?.digit),
    });
  }

  @Post('guess')
  guess(@Body() dto: GuessDto) {
    return this.gameService.guess({
      session_id: validateId(dto?.session_id, 'session_id'),
      text: validateGuessText(dto?.text),
    });
  }
}
