import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type LeaderboardRow = {
  rank: number;
  phone: string;
  score: number;
  wins: number;
  losses: number;
};

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  private maskPhone(phone: string): string {
    const s = (phone || '').trim();
    if (s.length <= 4) return '****';

    const prefixLen = s.startsWith('+')
      ? Math.min(3, s.length - 4)
      : Math.min(2, s.length - 4);
    const suffixLen = 4;

    const prefix = s.slice(0, prefixLen);
    const suffix = s.slice(-suffixLen);
    const stars = '*'.repeat(Math.max(0, s.length - prefixLen - suffixLen));

    return `${prefix}${stars}${suffix}`;
  }

  async getThemeLeaderboard(params: { themeId: string; userId: string }) {
    const { themeId, userId } = params;

    const top = await this.prisma.$queryRawUnsafe<any[]>(
      `
      WITH agg AS (
        SELECT
          gr."userId" AS user_id,
          COALESCE(SUM(CASE WHEN gr.status = 'WON' THEN gr.score ELSE 0 END), 0) AS total_score,
          COALESCE(SUM(CASE WHEN gr.status = 'WON' THEN 1 ELSE 0 END), 0) AS wins,
          COALESCE(SUM(CASE WHEN gr.status = 'FAILED_GUESSES' THEN 1 ELSE 0 END), 0) AS losses
        FROM "GameResult" gr
        WHERE gr."themeId" = $1
          AND gr.status IN ('WON', 'FAILED_GUESSES')
        GROUP BY gr."userId"
      ),
      ranked AS (
        SELECT
          a.*,
          DENSE_RANK() OVER (ORDER BY a.total_score DESC, a.wins DESC, a.losses ASC) AS rank
        FROM agg a
      )
      SELECT
        r.rank,
        r.total_score,
        r.wins,
        r.losses,
        u.phone
      FROM ranked r
      JOIN "User" u ON u.id = r.user_id
      ORDER BY r.rank ASC, u.phone ASC
      LIMIT 10;
      `,
      themeId,
    );

    const me = await this.prisma.$queryRawUnsafe<any[]>(
      `
      WITH agg AS (
        SELECT
          gr."userId" AS user_id,
          COALESCE(SUM(CASE WHEN gr.status = 'WON' THEN gr.score ELSE 0 END), 0) AS total_score,
          COALESCE(SUM(CASE WHEN gr.status = 'WON' THEN 1 ELSE 0 END), 0) AS wins,
          COALESCE(SUM(CASE WHEN gr.status = 'FAILED_GUESSES' THEN 1 ELSE 0 END), 0) AS losses
        FROM "GameResult" gr
        WHERE gr."themeId" = $1
          AND gr.status IN ('WON', 'FAILED_GUESSES')
        GROUP BY gr."userId"
      ),
      ranked AS (
        SELECT
          a.*,
          DENSE_RANK() OVER (ORDER BY a.total_score DESC, a.wins DESC, a.losses ASC) AS rank
        FROM agg a
      )
      SELECT
        r.rank,
        r.total_score,
        r.wins,
        r.losses,
        u.phone
      FROM ranked r
      JOIN "User" u ON u.id = r.user_id
      WHERE r.user_id = $2
      LIMIT 1;
      `,
      themeId,
      userId,
    );

    const top10: LeaderboardRow[] = top.map((r) => ({
      rank: Number(r.rank),
      phone: this.maskPhone(String(r.phone)),
      score: Number(r.total_score),
      wins: Number(r.wins),
      losses: Number(r.losses),
    }));

    const meRow: LeaderboardRow | null = me?.[0]
      ? {
          rank: Number(me[0].rank),
          phone: this.maskPhone(String(me[0].phone)),
          score: Number(me[0].total_score),
          wins: Number(me[0].wins),
          losses: Number(me[0].losses),
        }
      : null;

    return { theme_id: themeId, top10, me: meRow };
  }
}
