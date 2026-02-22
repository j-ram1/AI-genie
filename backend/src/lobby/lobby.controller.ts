import { Body, Controller, Post } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { validateDigit, validateId } from '../common/input.validation';

class LobbyMenuDto {
  user_id: string;
}

class LobbyDtmfDto {
  user_id: string;
  digit: number;
}

@Controller('lobby')
export class LobbyController {
  constructor(private readonly lobbyService: LobbyService) {}

  @Post('menu')
  menu(@Body() dto: LobbyMenuDto) {
    return this.lobbyService.menu({ user_id: validateId(dto?.user_id, 'user_id') });
  }

  @Post('input/dtmf')
  input(@Body() dto: LobbyDtmfDto) {
    return this.lobbyService.input({
      user_id: validateId(dto?.user_id, 'user_id'),
      digit: validateDigit(dto?.digit),
    });
  }
}
