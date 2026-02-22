import { LeaderboardService } from './leaderboard.service';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      $queryRawUnsafe: jest.fn(),
    };
    service = new LeaderboardService(prisma);
  });

  // Test Case: Should convert numeric fields and mask phone numbers in leaderboard rows.
  it('returns mapped top10 and me rows with masked phone numbers', async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([
        {
          rank: '1',
          total_score: '1200',
          wins: '3',
          losses: '1',
          phone: '+919876543210',
        },
      ])
      .mockResolvedValueOnce([
        {
          rank: '4',
          total_score: '540',
          wins: '1',
          losses: '2',
          phone: '+911234567890',
        },
      ]);

    const result = await service.getThemeLeaderboard({
      themeId: 'sports',
      userId: 'u1',
    });

    expect(result.theme_id).toBe('sports');
    expect(result.top10[0]).toEqual({
      rank: 1,
      phone: '+91******3210',
      score: 1200,
      wins: 3,
      losses: 1,
    });
    expect(result.me).toEqual({
      rank: 4,
      phone: '+91******7890',
      score: 540,
      wins: 1,
      losses: 2,
    });
    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(2);
  });

  // Test Case: Should return null "me" row when user has no ranked record.
  it('returns me as null when current user is not ranked', async () => {
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([
        {
          rank: 1,
          total_score: 100,
          wins: 1,
          losses: 0,
          phone: '1234',
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await service.getThemeLeaderboard({
      themeId: 'movies',
      userId: 'u-missing',
    });

    expect(result.top10[0].phone).toBe('****');
    expect(result.me).toBeNull();
  });
});
