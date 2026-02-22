import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { LobbyService } from './lobby.service';
import { validateDigit, validateId } from '../common/input.validation';

class LobbyMenuDto {
  @ApiProperty({
    example: 'cm7a1b2c3d4e5f6g7h8i9j0k',
    description: 'User identifier',
  })
  user_id: string;
}

class LobbyDtmfDto {
  @ApiProperty({
    example: 'cm7a1b2c3d4e5f6g7h8i9j0k',
    description: 'User identifier',
  })
  user_id: string;
  @ApiProperty({ example: 1, minimum: 0, maximum: 9 })
  digit: number;
}

@ApiTags('lobby')
@Controller('lobby')
export class LobbyController {
  constructor(private readonly lobbyService: LobbyService) {}

  @Post('menu')
  @ApiOperation({ summary: 'Get lobby menu state for a user' })
  @ApiBody({ type: LobbyMenuDto })
  @ApiResponse({ status: 201, description: 'Lobby state response' })
  menu(@Body() dto: LobbyMenuDto) {
    return this.lobbyService.menu({ user_id: validateId(dto?.user_id, 'user_id') });
  }

  @Post('input/dtmf')
  @ApiOperation({ summary: 'Send a DTMF digit to lobby state machine' })
  @ApiBody({ type: LobbyDtmfDto })
  @ApiResponse({ status: 201, description: 'Updated lobby state' })
  input(@Body() dto: LobbyDtmfDto) {
    return this.lobbyService.input({
      user_id: validateId(dto?.user_id, 'user_id'),
      digit: validateDigit(dto?.digit),
    });
  }
}
