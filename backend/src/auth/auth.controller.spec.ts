import { AuthController } from './auth.controller';
import { BadRequestException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;

  beforeEach(() => {
    authService = {
      login: jest.fn(),
    };
    controller = new AuthController(authService);
  });

  // Test Case: Should delegate login payload to service and return service response.
  it('calls AuthService.login with dto', async () => {
    authService.login.mockResolvedValue({ user_id: 'user1234', phone: '+1234567890' });

    const dto = { phone: '+1234567890' };
    const result = await controller.login(dto as any);

    expect(authService.login).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ user_id: 'user1234', phone: '+1234567890' });
  });

  it('rejects invalid phone input', async () => {
    expect(() => controller.login({ phone: '12345' } as any)).toThrow(
      BadRequestException,
    );
    expect(authService.login).not.toHaveBeenCalled();
  });
});
