import {
  BadRequestException,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameService } from '../game/game.service';

@Injectable()
export class LobbyService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => GameService))
    private readonly gameService: GameService,
  ) {}

  private now() {
    return new Date();
  }

  private isTimedOut(lastActivityAt: Date) {
    return this.now().getTime() - lastActivityAt.getTime() >= 10 * 60 * 1000;
  }

  private async getThemesOrdered() {
    // Deterministic ordering -> stable digit mapping
    return this.prisma.theme.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async menu(dto: { user_id: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.user_id },
    });
    if (!user) throw new BadRequestException('Invalid user_id');

    // replace any active lobby
    await this.prisma.lobbySession.updateMany({
      where: { userId: user.id, status: 'ACTIVE' },
      data: { status: 'ENDED_REPLACED', endedAt: this.now() },
    });

    const lobby = await this.prisma.lobbySession.upsert({
      where: { userId: user.id },
      update: {
        status: 'ACTIVE',
        mode: 'THEME_MENU',
        selectedThemeId: null,
        lastActivityAt: this.now(),
        endedAt: null,
      },
      create: {
        userId: user.id,
        status: 'ACTIVE',
        mode: 'THEME_MENU',
        lastActivityAt: this.now(),
      },
    });

    const themes = await this.getThemesOrdered();
    const digitMap: Record<string, any> = {};
    themes.slice(0, 8).forEach((t, i) => {
      digitMap[String(i + 1)] = { theme_id: t.id, label: t.name };
    });

    const parts = themes
      .slice(0, 8)
      .map((t, i) => `Press ${i + 1} for ${t.name}.`);
    const prompt = `Welcome to AI Genie. ${parts.join(' ')} Press 9 to exit.`;

    return {
      lobby_id: lobby.id,
      status: lobby.status,
      mode: lobby.mode,
      prompt,
      allowed_digits: [...themes.slice(0, 8).map((_, i) => i + 1), 9],
      digit_map: digitMap,
    };
  }

  async input(dto: { user_id: string; digit: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.user_id },
    });
    if (!user) throw new BadRequestException('Invalid user_id');

    const lobby = await this.prisma.lobbySession.findUnique({
      where: { userId: user.id },
    });
    if (lobby?.status !== 'ACTIVE') {
      // recreate menu session
      return this.menu({ user_id: user.id });
    }

    if (this.isTimedOut(lobby.lastActivityAt)) {
      await this.prisma.lobbySession.update({
        where: { userId: user.id },
        data: { status: 'EXPIRED', endedAt: this.now() },
      });
      return {
        status: 'EXPIRED',
        mode: 'ENDED',
        prompt: 'Lobby expired due to inactivity. Call menu again.',
      };
    }

    const digit = dto.digit;

    if (digit === 9) {
      const ended = await this.prisma.lobbySession.update({
        where: { userId: user.id },
        data: {
          status: 'ENDED_EXIT',
          endedAt: this.now(),
          lastActivityAt: this.now(),
        },
      });
      return {
        lobby_id: ended.id,
        status: ended.status,
        mode: 'ENDED',
        prompt: 'Exited. Call menu to start again.',
        allowed_digits: [],
      };
    }

    // MODE: THEME_MENU -> digits 1..8 select theme
    if (lobby.mode === 'THEME_MENU') {
      const themes = await this.getThemesOrdered();
      const idx = digit - 1;
      if (idx < 0 || idx >= Math.min(8, themes.length)) {
        throw new BadRequestException('Invalid digit for theme selection');
      }

      const selected = themes[idx];

      const updated = await this.prisma.lobbySession.update({
        where: { userId: user.id },
        data: {
          mode: 'THEME_SELECTED',
          selectedThemeId: selected.id,
          lastActivityAt: this.now(),
        },
      });

      return {
        lobby_id: updated.id,
        status: updated.status,
        mode: updated.mode,
        selected: { theme_id: selected.id, label: selected.name },
        prompt: `${selected.name} selected. Press 1 to start the game. Press 0 to go back. Press 9 to exit.`,
        allowed_digits: [0, 1, 9],
      };
    }

    // MODE: THEME_SELECTED -> 1 start, 0 back
    if (lobby.mode === 'THEME_SELECTED') {
      if (digit === 0) {
        await this.prisma.lobbySession.update({
          where: { userId: user.id },
          data: {
            mode: 'THEME_MENU',
            selectedThemeId: null,
            lastActivityAt: this.now(),
          },
        });
        // return menu prompt
        return this.menu({ user_id: user.id });
      }

      if (digit === 1) {
        if (!lobby.selectedThemeId)
          throw new BadRequestException('No theme selected');

        // Replace any ACTIVE game session for this user (design: always replace)
        await this.prisma.gameSession.updateMany({
          where: { userId: user.id, status: 'ACTIVE' },
          data: {
            status: 'ENDED_REPLACED',
            endedAt: this.now(),
            lastActivityAt: this.now(),
            mode: 'ENDED',
          },
        });

        // End lobby session (started game)
        await this.prisma.lobbySession.update({
          where: { userId: user.id },
          data: {
            status: 'ENDED_STARTED',
            endedAt: this.now(),
            lastActivityAt: this.now(),
          },
        });

        // Start a fresh game session
        return this.gameService.start({
          user_id: user.id,
          theme_id: lobby.selectedThemeId,
        });
      }

      throw new BadRequestException('Invalid digit for THEME_SELECTED');
    }

    throw new BadRequestException('Invalid lobby mode');
  }
}
