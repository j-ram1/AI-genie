import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { validatePhone } from '../common/input.validation';

class LoginDto {
  phone: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login({ phone: validatePhone(dto?.phone) });
  }
}
