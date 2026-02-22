import { BadRequestException } from '@nestjs/common';
import { GameService } from './game.service';

describe('GameService', () => {
  let service: GameService;
  let prisma: any;
  let aiQuestionService: any;
  let leaderboardService: any;
  let aiGenieService: any;
  let lobbyService: any;

  beforeEach(() => {
    prisma = {
      theme: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      gameSession: {
        updateMany: jest.fn(),
        create: jest.fn(),
      },
      personality: {
        findMany: jest.fn(),
      },
    };

    aiQuestionService = {
      getOrCreateQuestionText: jest.fn(),
    };
    leaderboardService = {
      getThemeLeaderboard: jest.fn(),
    };
    aiGenieService = {
      frameResponse: jest.fn(),
    };
    lobbyService = {
      menu: jest.fn(),
    };

    service = new GameService(
      prisma,
      aiQuestionService,
      leaderboardService,
      aiGenieService,
      lobbyService,
    );
  });

  // Test Case: Should return sorted theme list wrapper from repository result.
  it('listThemes returns themes payload', async () => {
    prisma.theme.findMany.mockResolvedValue([
      { id: 'history', name: 'History' },
      { id: 'sports', name: 'Sports' },
    ]);

    const result = await service.listThemes();

    expect(prisma.theme.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    expect(result).toEqual({
      themes: [
        { id: 'history', name: 'History' },
        { id: 'sports', name: 'Sports' },
      ],
    });
  });

  // Test Case: Should compute zero score for non-win terminal statuses.
  it('computeScore returns 0 when status is not WON', () => {
    const score = (service as any).computeScore({
      status: 'FAILED_GUESSES',
      hintsUsed: 2,
      maxHints: 5,
      wrongGuesses: 3,
      maxGuesses: 3,
      durationSec: 100,
    });

    expect(score).toBe(0);
  });

  // Test Case: Should compute positive score for WON status with configured formula.
  it('computeScore applies win formula correctly', () => {
    const score = (service as any).computeScore({
      status: 'WON',
      hintsUsed: 1,
      maxHints: 5,
      wrongGuesses: 1,
      maxGuesses: 3,
      durationSec: 120,
    });

    // 1000 + ((5-1)*50) + ((3-1)*30) - floor(120/2) = 1200
    expect(score).toBe(1200);
  });

  // Test Case: Should return mode-specific allowed digits through defaultAllowedDigits.
  it('defaultAllowedDigits maps known modes correctly', () => {
    expect((service as any).defaultAllowedDigits({ mode: 'QUESTION_SET' })).toEqual([
      0, 1, 2, 3, 4, 9,
    ]);
    expect((service as any).defaultAllowedDigits({ mode: 'GUESS_INPUT' })).toEqual([
      9,
    ]);
    expect((service as any).defaultAllowedDigits({ mode: 'GUESS_CONFIRM' })).toEqual([
      1, 2, 9,
    ]);
    expect((service as any).defaultAllowedDigits({ mode: 'ENDED' })).toEqual([
      1, 2, 3, 9,
    ]);
  });

  // Test Case: Should reject start when provided user_id does not exist.
  it('start throws for invalid user_id', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.start({ theme_id: 'sports', user_id: 'missing' }),
    ).rejects.toThrow(BadRequestException);
  });

  // Test Case: Should reject start when neither user_id nor user_phone is provided.
  it('start throws when both user_id and user_phone are absent', async () => {
    await expect(service.start({ theme_id: 'sports' })).rejects.toThrow(
      BadRequestException,
    );
  });

  // Test Case: Should reject start when selected theme has fewer than 10 personalities.
  it('start throws when theme has insufficient personalities', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.gameSession.updateMany.mockResolvedValue({ count: 0 });
    prisma.personality.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);

    await expect(service.start({ theme_id: 'sports', user_id: 'u1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  // Test Case: Should create active game session when start prerequisites are met.
  it('start creates a fresh active game session and returns serialized payload', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    prisma.gameSession.updateMany.mockResolvedValue({ count: 1 });
    prisma.personality.findMany.mockResolvedValue(
      Array.from({ length: 10 }).map((_, i) => ({ id: `p${i + 1}` })),
    );
    prisma.theme.findUnique.mockResolvedValue({ id: 'sports', name: 'Sports' });
    aiGenieService.frameResponse.mockResolvedValue('Genie start prompt');
    prisma.gameSession.create.mockResolvedValue({
      id: 's1',
      status: 'ACTIVE',
      mode: 'QUESTION_SET',
      prompt: 'Genie start prompt',
      hintsUsed: 0,
      maxHints: 5,
      wrongGuesses: 0,
      maxGuesses: 3,
      qaHistory: [],
    });

    const result = await service.start({ theme_id: 'sports', user_id: 'u1' });

    expect(prisma.gameSession.create).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        session_id: 's1',
        status: 'ACTIVE',
        mode: 'QUESTION_SET',
        prompt: 'Genie start prompt',
        allowed_digits: [1, 2, 9],
      }),
    );
  });
});
