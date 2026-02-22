import { GameController } from './game.controller';
import { BadRequestException } from '@nestjs/common';

describe('GameController', () => {
  let controller: GameController;
  let gameService: any;

  beforeEach(() => {
    gameService = {
      listThemes: jest.fn(),
      start: jest.fn(),
      inputDtmf: jest.fn(),
      guess: jest.fn(),
      debugReveal: jest.fn(),
    };

    controller = new GameController(gameService);
  });

  // Test Case: Should delegate GET /game/themes to GameService.listThemes.
  it('returns themes from service', async () => {
    gameService.listThemes.mockResolvedValue({ themes: [] });
    await expect(controller.themes()).resolves.toEqual({ themes: [] });
    expect(gameService.listThemes).toHaveBeenCalledTimes(1);
  });

  // Test Case: Should delegate POST /game/start to GameService.start.
  it('delegates start dto to service', async () => {
    const dto = { theme_id: 'sports', user_id: 'user1234' };
    gameService.start.mockResolvedValue({ session_id: 'sess1234' });

    const result = await controller.start(dto as any);

    expect(gameService.start).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ session_id: 'sess1234' });
  });

  // Test Case: Should delegate DTMF input to GameService.inputDtmf.
  it('delegates input dto to service', async () => {
    const dto = { session_id: 'sess1234', digit: 1 };
    gameService.inputDtmf.mockResolvedValue({ mode: 'QUESTION_SET' });

    const result = await controller.input(dto as any);

    expect(gameService.inputDtmf).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ mode: 'QUESTION_SET' });
  });

  // Test Case: Should delegate text guess to GameService.guess.
  it('delegates guess dto to service', async () => {
    const dto = { session_id: 'sess1234', text: 'Dhoni' };
    gameService.guess.mockResolvedValue({ result: 'INCORRECT' });

    const result = await controller.guess(dto as any);

    expect(gameService.guess).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ result: 'INCORRECT' });
  });

  // Test Case: Should delegate debug reveal request to GameService.debugReveal.
  it('delegates debug reveal dto to service', async () => {
    const dto = { session_id: 'sess1234' };
    gameService.debugReveal.mockResolvedValue({ selected: null });

    const result = await controller.debugReveal(dto as any);

    expect(gameService.debugReveal).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ selected: null });
  });

  it('rejects start when user_id and user_phone are missing', async () => {
    expect(() => controller.start({ theme_id: 'sports' } as any)).toThrow(
      BadRequestException,
    );
    expect(gameService.start).not.toHaveBeenCalled();
  });

  it('rejects invalid dtmf digit', async () => {
    expect(() =>
      controller.input({ session_id: 'sess1234', digit: 11 } as any),
    ).toThrow(BadRequestException);
    expect(gameService.inputDtmf).not.toHaveBeenCalled();
  });
});
