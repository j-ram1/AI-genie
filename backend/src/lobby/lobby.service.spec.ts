import { BadRequestException } from '@nestjs/common';
import { LobbyService } from './lobby.service';

describe('LobbyService', () => {
  let service: LobbyService;
  let prisma: any;
  let gameService: any;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      theme: { findMany: jest.fn() },
      lobbySession: {
        updateMany: jest.fn(),
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      gameSession: { updateMany: jest.fn() },
    };

    gameService = {
      start: jest.fn(),
    };

    service = new LobbyService(prisma, gameService);
  });

  // Test Case: Should reject lobby menu request for unknown users.
  it('menu throws when user is invalid', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.menu({ user_id: 'bad-user' })).rejects.toThrow(
      BadRequestException,
    );
  });

  // Test Case: Should create active lobby menu and map max 8 themes to DTMF digits.
  it('menu returns active theme menu with stable digit map', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.lobbySession.updateMany.mockResolvedValue({ count: 0 });
    prisma.lobbySession.upsert.mockResolvedValue({
      id: 'l1',
      status: 'ACTIVE',
      mode: 'THEME_MENU',
    });
    prisma.theme.findMany.mockResolvedValue([
      { id: 't1', name: 'A' },
      { id: 't2', name: 'B' },
      { id: 't3', name: 'C' },
      { id: 't4', name: 'D' },
      { id: 't5', name: 'E' },
      { id: 't6', name: 'F' },
      { id: 't7', name: 'G' },
      { id: 't8', name: 'H' },
      { id: 't9', name: 'I' },
    ]);

    const result = await service.menu({ user_id: 'u1' });

    expect(result.lobby_id).toBe('l1');
    expect(result.mode).toBe('THEME_MENU');
    expect(result.allowed_digits).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(Object.keys(result.digit_map)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ]);
  });

  // Test Case: Should rebuild lobby menu when existing lobby is not active.
  it('input calls menu when lobby is not active', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.lobbySession.findUnique.mockResolvedValue({ status: 'ENDED' });
    const menuSpy = jest
      .spyOn(service, 'menu')
      .mockResolvedValue({ mode: 'THEME_MENU' } as any);

    const result = await service.input({ user_id: 'u1', digit: 1 });

    expect(menuSpy).toHaveBeenCalledWith({ user_id: 'u1' });
    expect(result).toEqual({ mode: 'THEME_MENU' });
  });

  // Test Case: Should expire lobby session after inactivity timeout.
  it('input expires timed-out lobby sessions', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.lobbySession.findUnique.mockResolvedValue({
      id: 'l1',
      userId: 'u1',
      status: 'ACTIVE',
      mode: 'THEME_MENU',
      lastActivityAt: new Date(Date.now() - 11 * 60 * 1000),
    });
    prisma.lobbySession.update.mockResolvedValue({});

    const result = await service.input({ user_id: 'u1', digit: 1 });

    expect(prisma.lobbySession.update).toHaveBeenCalled();
    expect(result).toEqual({
      status: 'EXPIRED',
      mode: 'ENDED',
      prompt: 'Lobby expired due to inactivity. Call menu again.',
    });
  });

  // Test Case: Should end lobby session when user presses digit 9.
  it('input exits lobby on digit 9', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.lobbySession.findUnique.mockResolvedValue({
      id: 'l1',
      userId: 'u1',
      status: 'ACTIVE',
      mode: 'THEME_MENU',
      lastActivityAt: new Date(),
    });
    prisma.lobbySession.update.mockResolvedValue({
      id: 'l1',
      status: 'ENDED_EXIT',
    });

    const result = await service.input({ user_id: 'u1', digit: 9 });

    expect(result).toEqual(
      expect.objectContaining({
        lobby_id: 'l1',
        status: 'ENDED_EXIT',
        mode: 'ENDED',
        allowed_digits: [],
      }),
    );
  });

  // Test Case: Should reject invalid digit in THEME_MENU mode.
  it('input rejects invalid theme selection digit', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.lobbySession.findUnique.mockResolvedValue({
      userId: 'u1',
      status: 'ACTIVE',
      mode: 'THEME_MENU',
      lastActivityAt: new Date(),
    });
    prisma.theme.findMany.mockResolvedValue([{ id: 'sports', name: 'Sports' }]);

    await expect(service.input({ user_id: 'u1', digit: 8 })).rejects.toThrow(
      BadRequestException,
    );
  });

  // Test Case: Should transition from THEME_MENU to THEME_SELECTED on valid digit.
  it('input selects theme in THEME_MENU mode', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.lobbySession.findUnique.mockResolvedValue({
      id: 'l1',
      userId: 'u1',
      status: 'ACTIVE',
      mode: 'THEME_MENU',
      lastActivityAt: new Date(),
    });
    prisma.theme.findMany.mockResolvedValue([
      { id: 'history', name: 'History' },
      { id: 'sports', name: 'Sports' },
    ]);
    prisma.lobbySession.update.mockResolvedValue({
      id: 'l1',
      status: 'ACTIVE',
      mode: 'THEME_SELECTED',
    });

    const result = await service.input({ user_id: 'u1', digit: 2 });

    expect(result).toEqual(
      expect.objectContaining({
        mode: 'THEME_SELECTED',
        selected: { theme_id: 'sports', label: 'Sports' },
        allowed_digits: [0, 1, 9],
      }),
    );
  });

  // Test Case: Should go back to menu from THEME_SELECTED when user presses 0.
  it('input goes back to menu from THEME_SELECTED on digit 0', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.lobbySession.findUnique.mockResolvedValue({
      userId: 'u1',
      status: 'ACTIVE',
      mode: 'THEME_SELECTED',
      selectedThemeId: 'sports',
      lastActivityAt: new Date(),
    });
    prisma.lobbySession.update.mockResolvedValue({});

    const menuSpy = jest
      .spyOn(service, 'menu')
      .mockResolvedValue({ mode: 'THEME_MENU' } as any);

    const result = await service.input({ user_id: 'u1', digit: 0 });

    expect(menuSpy).toHaveBeenCalledWith({ user_id: 'u1' });
    expect(result).toEqual({ mode: 'THEME_MENU' });
  });

  // Test Case: Should reject start when no selected theme exists in THEME_SELECTED mode.
  it('input rejects start when selectedThemeId is missing', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.lobbySession.findUnique.mockResolvedValue({
      userId: 'u1',
      status: 'ACTIVE',
      mode: 'THEME_SELECTED',
      selectedThemeId: null,
      lastActivityAt: new Date(),
    });

    await expect(service.input({ user_id: 'u1', digit: 1 })).rejects.toThrow(
      BadRequestException,
    );
  });

  // Test Case: Should end lobby and start game when digit 1 is pressed in THEME_SELECTED mode.
  it('input starts game from THEME_SELECTED on digit 1', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.lobbySession.findUnique.mockResolvedValue({
      userId: 'u1',
      status: 'ACTIVE',
      mode: 'THEME_SELECTED',
      selectedThemeId: 'sports',
      lastActivityAt: new Date(),
    });
    prisma.gameSession.updateMany.mockResolvedValue({ count: 0 });
    prisma.lobbySession.update.mockResolvedValue({});
    gameService.start.mockResolvedValue({ session_id: 's1', status: 'ACTIVE' });

    const result = await service.input({ user_id: 'u1', digit: 1 });

    expect(prisma.gameSession.updateMany).toHaveBeenCalled();
    expect(prisma.lobbySession.update).toHaveBeenCalled();
    expect(gameService.start).toHaveBeenCalledWith({
      user_id: 'u1',
      theme_id: 'sports',
    });
    expect(result).toEqual({ session_id: 's1', status: 'ACTIVE' });
  });

  // Test Case: Should reject unsupported digit in THEME_SELECTED mode.
  it('input rejects invalid digit in THEME_SELECTED', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.lobbySession.findUnique.mockResolvedValue({
      userId: 'u1',
      status: 'ACTIVE',
      mode: 'THEME_SELECTED',
      selectedThemeId: 'sports',
      lastActivityAt: new Date(),
    });

    await expect(service.input({ user_id: 'u1', digit: 5 })).rejects.toThrow(
      BadRequestException,
    );
  });
});
