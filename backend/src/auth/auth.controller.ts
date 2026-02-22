import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiProperty,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { validatePhone } from '../common/input.validation';

class LoginDto {
  @ApiProperty({
    example: '+14155552671',
    description: 'Phone number in E.164 format',
  })
  phone: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login or create a user by phone' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'User logged in successfully',
    schema: {
      example: {
        user_id: 'cm7a1b2c3d4e5f6g7h8i9j0k',
        phone: '+14155552671',
      },
    },
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login({ phone: validatePhone(dto?.phone) });
  }
}
