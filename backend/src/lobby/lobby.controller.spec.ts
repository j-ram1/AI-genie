import { LobbyController } from './lobby.controller';
import { BadRequestException } from '@nestjs/common';

describe('LobbyController', () => {
  let controller: LobbyController;
  let lobbyService: any;

  beforeEach(() => {
    lobbyService = {
      menu: jest.fn(),
      input: jest.fn(),
    };
    controller = new LobbyController(lobbyService);
  });

  // Test Case: Should pass menu DTO to LobbyService.menu.
  it('delegates menu request to service', async () => {
    lobbyService.menu.mockResolvedValue({ status: 'ACTIVE' });
    const dto = { user_id: 'user1234' };

    const result = await controller.menu(dto as any);

    expect(lobbyService.menu).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ status: 'ACTIVE' });
  });

  // Test Case: Should pass DTMF DTO to LobbyService.input.
  it('delegates dtmf input request to service', async () => {
    lobbyService.input.mockResolvedValue({ mode: 'THEME_MENU' });
    const dto = { user_id: 'user1234', digit: 1 };

    const result = await controller.input(dto as any);

    expect(lobbyService.input).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ mode: 'THEME_MENU' });
  });

  it('rejects invalid user_id in menu', async () => {
    expect(() => controller.menu({ user_id: 'x' } as any)).toThrow(
      BadRequestException,
    );
    expect(lobbyService.menu).not.toHaveBeenCalled();
  });
});
