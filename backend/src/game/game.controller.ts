import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GameService } from './game.service';
import {
  validateDigit,
  validateGuessText,
  validateId,
  validatePhone,
  validateThemeId,
} from '../common/input.validation';

class StartGameDto {
  @ApiProperty({ example: 'sports' })
  theme_id: string;
  @ApiPropertyOptional({
    example: 'cm7a1b2c3d4e5f6g7h8i9j0k',
    description: 'Preferred user identifier',
  })
  user_id?: string;
  @ApiPropertyOptional({
    example: '+14155552671',
    description: 'Backward compatible phone-based user identity',
  })
  user_phone?: string; // backward compatible
}

class DtmfDto {
  @ApiProperty({ example: 'cm7s1b2c3d4e5f6g7h8i9j0k' })
  session_id: string;
  @ApiProperty({ example: 1, minimum: 0, maximum: 9 })
  digit: number;
}

class GuessDto {
  @ApiProperty({ example: 'cm7s1b2c3d4e5f6g7h8i9j0k' })
  session_id: string;
  @ApiProperty({ example: 'Sachin Tendulkar', maxLength: 80 })
  text: string;
}

@ApiTags('game')
@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('themes')
  @ApiOperation({ summary: 'List available game themes' })
  @ApiResponse({ status: 200, description: 'Theme list response' })
  themes() {
    return this.gameService.listThemes();
  }

  @Post('start')
  @ApiOperation({ summary: 'Start a new game session' })
  @ApiBody({ type: StartGameDto })
  @ApiResponse({ status: 201, description: 'Newly started game session state' })
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
  @ApiOperation({ summary: 'Send a DTMF digit to game state machine' })
  @ApiBody({ type: DtmfDto })
  @ApiResponse({ status: 201, description: 'Updated game session state' })
  input(@Body() dto: DtmfDto) {
    return this.gameService.inputDtmf({
      session_id: validateId(dto?.session_id, 'session_id'),
      digit: validateDigit(dto?.digit),
    });
  }

  @Post('guess')
  @ApiOperation({ summary: 'Submit a text guess for the active game session' })
  @ApiBody({ type: GuessDto })
  @ApiResponse({ status: 201, description: 'Guess evaluation result and next state' })
  guess(@Body() dto: GuessDto) {
    return this.gameService.guess({
      session_id: validateId(dto?.session_id, 'session_id'),
      text: validateGuessText(dto?.text),
    });
  }
}
