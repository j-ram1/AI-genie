import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateQuestionSetFromDb, Question } from './question.builder';
import { normalize, scoreGuess } from './guess.matcher';
import { AiQuestionService } from '../ai/ai.question.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';
import { AiGenieService } from '../ai/ai.genie.service';
import { LobbyService } from '../lobby/lobby.service';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiQuestionService: AiQuestionService,
    private readonly leaderboardService: LeaderboardService,
    private readonly aiGenieService: AiGenieService,
    @Inject(forwardRef(() => LobbyService))
    private readonly lobbyService: LobbyService,
  ) {}

  private now() {
    return new Date();
  }

  private isTimedOut(lastActivityAt: Date) {
    return this.now().getTime() - lastActivityAt.getTime() >= 10 * 60 * 1000;
  }

  async listThemes() {
    const themes = await this.prisma.theme.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return { themes };
  }

  private async withAiQuestionText(themeId: string, set: Question[]) {
    const theme = await this.prisma.theme.findUnique({
      where: { id: themeId },
      select: { id: true, name: true },
    });
    const themeName = theme?.name ?? themeId;

    const out: Question[] = [];
    for (const q of set) {
      const fallbackText = q.text;
      this.logger.debug(
        `DEBUG AI: Checking for attr "${q.attrKey}" (Fallback: "${fallbackText}")`,
      );
      const text = await this.aiQuestionService.getOrCreateQuestionText({
        themeId,
        themeName,
        attrKey: q.attrKey,
        answerType: q.answerType as any,
        fallbackText,
      });
      this.logger.debug(`DEBUG AI: Result for "${q.attrKey}": "${text}"`);
      out.push({ ...q, text });
    }
    return out;
  }

  async start(dto: {
    theme_id: string;
    user_id?: string;
    user_phone?: string;
  }) {
    let user;
    if (dto.user_id) {
      user = await this.prisma.user.findUnique({ where: { id: dto.user_id } });
      if (!user) throw new BadRequestException('Invalid user_id');
    } else {
      const phone = (dto.user_phone || '').trim();
      if (!phone)
        throw new BadRequestException('user_id or user_phone is required');
      user = await this.prisma.user.upsert({
        where: { phone },
        update: {},
        create: { phone },
      });
    }

    await this.prisma.gameSession.updateMany({
      where: { userId: user.id, status: 'ACTIVE' },
      data: { status: 'ENDED_REPLACED', endedAt: this.now(), mode: 'ENDED' },
    });

    const personalities = await this.prisma.personality.findMany({
      where: { themeId: dto.theme_id },
      select: { id: true },
    });
    if (personalities.length < 10) {
      throw new BadRequestException(
        `Theme ${dto.theme_id} must have at least 10 personalities (found ${personalities.length})`,
      );
    }
    const picked =
      personalities[Math.floor(Math.random() * personalities.length)];

    const theme = await this.prisma.theme.findUnique({
      where: { id: dto.theme_id },
    });
    const prompt = await this.aiGenieService.frameResponse({
      context: 'START',
      themeName: theme?.name || dto.theme_id,
    });

    const session = await this.prisma.gameSession.create({
      data: {
        userId: user.id,
        themeId: dto.theme_id,
        status: 'ACTIVE',
        mode: 'QUESTION_SET',
        lastActivityAt: this.now(),
        selectedPersonalityId: picked.id,
        pendingQuestionSet: [] as any, // No longer used for list selection
        usedAttrKeys: [] as any,
        disabledGroupIds: [] as any,
        qaHistory: [] as any,
        prompt: prompt,
      },
    });

    return this.serializeSession(session, {
      prompt,
      allowed_digits: [1, 2, 9], // 1: Hint, 2: Guess, 9: Exit
    });
  }

  private async endSession(sessionId: string, status: string) {
    const ended = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { status, endedAt: this.now(), mode: 'ENDED' },
    });
    await this.createGameResultIfNeeded(ended);
    return ended;
  }

  private async revealName(personalityId: string | null) {
    if (!personalityId) return 'Unknown';
    const p = await this.prisma.personality.findUnique({
      where: { id: personalityId },
      select: { name: true },
    });
    return p?.name ?? 'Unknown';
  }

  private shouldPersistResult(status: string) {
    return ['WON', 'FAILED_HINTS', 'FAILED_GUESSES', 'FAILED_TIMEOUT'].includes(
      status,
    );
  }

  private computeScore(params: {
    status: string;
    hintsUsed: number;
    maxHints: number;
    wrongGuesses: number;
    maxGuesses: number;
    durationSec: number;
  }) {
    const {
      status,
      hintsUsed,
      maxHints,
      wrongGuesses,
      maxGuesses,
      durationSec,
    } = params;
    if (status !== 'WON') return 0;
    const winBonus = 1000;
    const hintComponent = Math.max(0, maxHints - hintsUsed) * 50;
    const guessComponent = Math.max(0, maxGuesses - wrongGuesses) * 30;
    const timePenalty = Math.floor(Math.max(0, durationSec) / 2);
    return winBonus + hintComponent + guessComponent - timePenalty;
  }

  private async createGameResultIfNeeded(ended: any) {
    if (!this.shouldPersistResult(ended.status)) return;
    const durationSec = Math.max(
      0,
      Math.floor((ended.endedAt.getTime() - ended.createdAt.getTime()) / 1000),
    );
    const score = this.computeScore({
      status: ended.status,
      hintsUsed: ended.hintsUsed,
      maxHints: ended.maxHints,
      wrongGuesses: ended.wrongGuesses,
      maxGuesses: ended.maxGuesses,
      durationSec,
    });
    await this.prisma.gameResult.upsert({
      where: { sessionId: ended.id },
      update: {
        score,
        hintsUsed: ended.hintsUsed,
        wrongGuesses: ended.wrongGuesses,
        durationSec,
        status: ended.status,
      },
      create: {
        sessionId: ended.id,
        userId: ended.userId,
        themeId: ended.themeId,
        status: ended.status,
        score,
        hintsUsed: ended.hintsUsed,
        wrongGuesses: ended.wrongGuesses,
        durationSec,
      },
    });
  }

  private counters(session: any) {
    return {
      hints_used: session.hintsUsed,
      max_hints: session.maxHints,
      wrong_guesses: session.wrongGuesses,
      max_guesses: session.maxGuesses,
    };
  }

  private serializeSession(session: any, extra: any = {}) {
    return {
      session_id: session.id,
      status: session.status,
      mode: session.mode,
      prompt: extra.prompt || session.prompt,
      allowed_digits:
        extra.allowed_digits || this.defaultAllowedDigits(session),
      counters: this.counters(session),
      summary: session.qaHistory ?? [],
      ...extra,
    };
  }

  private defaultAllowedDigits(session: any) {
    if (session.mode === 'QUESTION_SET') return [0, 1, 2, 3, 4, 9];
    if (session.mode === 'POST_ANSWER_MENU') return [0, 1, 2, 9];
    if (session.mode === 'GUESS_INPUT') return [9];
    if (session.mode === 'GUESS_CONFIRM') return [1, 2, 9];
    if (session.mode === 'ENDED') return [1, 2, 3, 9];
    return [1, 9];
  }

  async guess(dto: { session_id: string; text: string }) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: dto.session_id },
    });
    if (!session) throw new BadRequestException('Invalid session_id');

    if (session.status !== 'ACTIVE' && session.mode !== 'ENDED') {
      return this.serializeSession(session, {
        mode: 'ENDED',
        prompt:
          'This session is no longer active. Press 1 to start a new game, 3 for theme change, or 9 to exit.',
        allowed_digits: [1, 3, 9],
      });
    }

    if (this.isTimedOut(session.lastActivityAt)) {
      const ended = await this.endSession(session.id, 'FAILED_TIMEOUT');
      return this.serializeSession(ended, {
        prompt:
          'Session expired due to inactivity. Press 1 to play again, 2 for leaderboard, 3 for theme change, or 9 to exit.',
      });
    }

    if (session.mode !== 'GUESS_INPUT') {
      throw new BadRequestException(
        `Guess not allowed in mode ${session.mode}`,
      );
    }

    const input = normalize(dto.text);
    if (!input) {
      return this.serializeSession(session, {
        prompt: "Empty guess. Type the personality's name.",
      });
    }

    const people = await this.prisma.personality.findMany({
      where: { themeId: session.themeId },
      select: { id: true, name: true, aliases: { select: { alias: true } } },
    });

    let best: { id: string; name: string; score: number } | null = null;
    for (const p of people) {
      const candidates = [p.name, ...p.aliases.map((a) => a.alias)];
      let top = 0;
      for (const c of candidates) top = Math.max(top, scoreGuess(input, c));
      if (!best || top > best.score)
        best = { id: p.id, name: p.name, score: top };
    }

    if (!best || best.score < 50) {
      return this.handleWrongGuess(session.id);
    }

    if (best.score === 100) {
      return this.evaluateGuess(session.id, best.id);
    }

    const updated = await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        pendingGuessCandidateId: best.id,
        mode: 'GUESS_CONFIRM',
        lastActivityAt: this.now(),
      },
    });

    return this.serializeSession(updated, {
      prompt: `Did you mean ${best.name}? Press 1 for Yes, 2 for No.`,
    });
  }

  async inputDtmf(dto: { session_id: string; digit: number }) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: dto.session_id },
    });
    if (!session) throw new BadRequestException('Invalid session_id');

    const validationResult =
      await this.validateSessionAndHandleTimeout(session);
    if (validationResult) return validationResult;

    const digit = dto.digit;

    if (session.mode === 'GUESS_INPUT')
      return this.handleGuessInput(session, digit);
    if (session.mode === 'ENDED') return this.handleEnded(session, digit);
    if (session.mode === 'GUESS_CONFIRM')
      return this.handleGuessConfirm(session, digit);

    if (digit === 0) return this.handleGlobalBack(session);
    if (digit === 9) return this.handleGlobalExit(session);

    if (session.mode === 'QUESTION_SET') {
      const result = await this.handleQuestionSet(session, digit);
      if (result) return result;
    }

    if (session.mode === 'HINT_SELECTION') {
      const result = await this.handleHintSelection(session, digit);
      if (result) return result;
    }

    throw new BadRequestException(`DTMF not supported in mode ${session.mode}`);
  }

  private async validateSessionAndHandleTimeout(session: any) {
    if (session.status !== 'ACTIVE' && session.mode !== 'ENDED') {
      return this.serializeSession(session, {
        mode: 'ENDED',
        prompt:
          'This session is no longer active. Press 1 to start a new game, 3 for theme change, or 9 to exit.',
        allowed_digits: [1, 3, 9],
      });
    }

    if (this.isTimedOut(session.lastActivityAt)) {
      const ended = await this.endSession(session.id, 'FAILED_TIMEOUT');
      return this.serializeSession(ended, {
        prompt:
          'Session expired due to inactivity. Press 1 to play again, 2 for leaderboard, 3 for theme change, or 9 to exit.',
      });
    }
    return null;
  }

  private async handleGlobalBack(session: any) {
    const prompt =
      session.mode === 'QUESTION_SET'
        ? 'Choose a question:'
        : 'Press 1 for the next set of questions. Press 2 to guess. Press 0 to repeat. Press 9 to exit.';
    return this.serializeSession(session, {
      prompt,
      question_set:
        session.mode === 'QUESTION_SET'
          ? session.pendingQuestionSet
          : undefined,
    });
  }

  private async handleGlobalExit(session: any) {
    const ended = await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        status: 'ENDED_EXIT',
        endedAt: this.now(),
        lastActivityAt: this.now(),
        mode: 'ENDED',
      },
    });
    return this.serializeSession(ended, {
      prompt:
        'Exited. Press 1 to play again, 2 for leaderboard, 3 for theme change, or 9 to exit.',
      allowed_digits: [1, 2, 3, 9],
    });
  }

  private async handleGuessInput(session: any, digit: number) {
    if (digit === 9) {
      const ended = await this.prisma.gameSession.update({
        where: { id: session.id },
        data: {
          status: 'ENDED_EXIT',
          mode: 'ENDED',
          endedAt: this.now(),
          lastActivityAt: this.now(),
        },
      });
      return this.serializeSession(ended, {
        prompt:
          'Exited. Press 1 to play again, 2 for leaderboard, 3 for theme change, or 9 to exit.',
      });
    }
    throw new BadRequestException('Invalid digit for GUESS_INPUT');
  }

  private async handleEnded(session: any, digit: number) {
    if (digit === 1)
      return this.start({ theme_id: session.themeId, user_id: session.userId });
    if (digit === 2)
      return this.leaderboardService.getThemeLeaderboard({
        themeId: session.themeId,
        userId: session.userId,
      });
    if (digit === 3) return this.lobbyService.menu({ user_id: session.userId });
    if (digit === 9)
      return this.serializeSession(session, { prompt: 'Exited.' });
    if (digit === 0)
      return this.serializeSession(session, {
        prompt:
          'Press 1 to play again. Press 2 for leaderboard. Press 3 for theme change. Press 9 to exit.',
      });
    throw new BadRequestException('Invalid digit for ENDED menu');
  }

  private async handleGuessConfirm(session: any, digit: number) {
    if (digit === 1)
      return this.evaluateGuess(session.id, session.pendingGuessCandidateId);
    if (digit === 2) {
      const updated = await this.prisma.gameSession.update({
        where: { id: session.id },
        data: {
          pendingGuessCandidateId: null,
          mode: 'GUESS_INPUT',
          lastActivityAt: this.now(),
        },
      });
      return this.serializeSession(updated, {
        prompt: 'Okay. Type your guess again.',
      });
    }
    if (digit === 9) {
      const ended = await this.prisma.gameSession.update({
        where: { id: session.id },
        data: {
          status: 'ENDED_EXIT',
          endedAt: this.now(),
          lastActivityAt: this.now(),
          mode: 'ENDED',
        },
      });
      return this.serializeSession(ended, { prompt: 'Exited.' });
    }
    if (digit === 0)
      return this.serializeSession(session, {
        prompt:
          'Did you mean the suggested personality? Press 1 for Yes, 2 for No.',
      });
    throw new BadRequestException('Invalid digit for GUESS_CONFIRM');
  }

  private async handleQuestionSet(session: any, digit: number) {
    if (digit === 1) {
      // Request Options
      const used = (session.usedAttrKeys as string[]) ?? [];
      const nextSetRaw = await generateQuestionSetFromDb(
        this.prisma,
        session.themeId,
        used,
      );

      // Take up to 4 questions
      const limitedSetRaw = nextSetRaw.slice(0, 4);
      if (limitedSetRaw.length === 0) {
        return this.serializeSession(session, {
          prompt:
            "I'm out of hints! You'll have to guess now. Press 2 to guess.",
          allowed_digits: [2, 9],
        });
      }

      const nextSet = await this.withAiQuestionText(
        session.themeId,
        limitedSetRaw,
      );
      const theme = await this.prisma.theme.findUnique({
        where: { id: session.themeId },
      });

      const personaPrompt = await this.aiGenieService.frameOptions({
        themeName: theme?.name || session.themeId,
        options: nextSet.map((q) => q.text),
      });

      const updated = await this.prisma.gameSession.update({
        where: { id: session.id },
        data: {
          pendingQuestionSet: nextSet,
          mode: 'HINT_SELECTION',
          lastActivityAt: this.now(),
          prompt: personaPrompt,
        },
      });

      return this.serializeSession(updated, {
        prompt: personaPrompt,
        question_set: nextSet,
        allowed_digits: [...nextSet.map((q) => q.dtmf), 9],
      });
    }

    if (digit === 2) {
      // Switch to Guess
      const updated = await this.prisma.gameSession.update({
        where: { id: session.id },
        data: { mode: 'GUESS_INPUT', lastActivityAt: this.now() },
      });
      return this.serializeSession(updated, {
        prompt: "I'm listening! Who is the hidden personality?",
      });
    }
    return null;
  }

  private async handleHintSelection(session: any, digit: number) {
    const selectionSet = (session.pendingQuestionSet as any[]) || [];
    const chosen = selectionSet.find((q) => q.dtmf === digit);

    if (chosen) {
      const attr = await this.prisma.personalityAttribute.findUnique({
        where: {
          personalityId_key: {
            personalityId: session.selectedPersonalityId!,
            key: chosen.attrKey,
          },
        },
      });

      let answer = 'Unknown.';
      if (attr) {
        if (attr.type === 'YESNO') {
          answer = attr.value === 'YES' ? 'Yes.' : 'No.';
        } else {
          answer = `${attr.value}.`;
        }
      }

      const history = (session.qaHistory ?? []).concat([
        { q: chosen.text, a: answer },
      ]);
      const used = (session.usedAttrKeys as string[]) ?? [];
      const usedKeys = Array.from(new Set([...used, chosen.attrKey]));

      const theme = await this.prisma.theme.findUnique({
        where: { id: session.themeId },
      });
      const personality = await this.prisma.personality.findUnique({
        where: { id: session.selectedPersonalityId ?? undefined },
      });
      const personaPrompt = await this.aiGenieService.frameResponse({
        context: 'HINT',
        themeName: theme?.name || session.themeId,
        hintText: chosen.text,
        answer,
        qaHistory: history,
        personalityName: personality?.name ?? undefined,
      });

      const updated = await this.prisma.gameSession.update({
        where: { id: session.id },
        data: {
          hintsUsed: session.hintsUsed + 1,
          usedAttrKeys: usedKeys,
          qaHistory: history,
          mode: 'QUESTION_SET', // Back to main menu after reveal
          pendingQuestionSet: [],
          lastActivityAt: this.now(),
          prompt: personaPrompt,
        },
      });

      if (updated.hintsUsed >= updated.maxHints) {
        const switched = await this.prisma.gameSession.update({
          where: { id: updated.id },
          data: { mode: 'GUESS_INPUT', lastActivityAt: this.now() },
        });
        return this.serializeSession(switched, {
          prompt: 'Hints exhausted! Time to guess. Type your guess now.',
        });
      }

      return this.serializeSession(updated, {
        prompt: personaPrompt,
        allowed_digits: [1, 2, 9],
      });
    }
    return null;
  }

  private async evaluateGuess(sessionId: string, candidateId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new BadRequestException('Invalid session');

    const selected = session.selectedPersonalityId;
    if (!selected)
      throw new BadRequestException('Session missing selectedPersonalityId');

    const isCorrect = candidateId === selected;
    const theme = await this.prisma.theme.findUnique({
      where: { id: session.themeId },
    });

    if (isCorrect) {
      const ended = await this.endSession(session.id, 'WON');
      const personaPrompt = await this.aiGenieService.frameResponse({
        context: 'WIN',
        themeName: theme?.name || session.themeId,
      });
      await this.prisma.gameSession.update({
        where: { id: session.id },
        data: { prompt: personaPrompt },
      });

      return this.serializeSession(ended, {
        prompt: personaPrompt,
        reveal: { name: await this.revealName(selected) },
      });
    }

    return this.handleWrongGuess(session.id);
  }

  private async handleWrongGuess(sessionId: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new BadRequestException('Invalid session');

    const updated = await this.prisma.gameSession.update({
      where: { id: session.id },
      data: {
        wrongGuesses: session.wrongGuesses + 1,
        pendingGuessCandidateId: null,
        mode:
          session.hintsUsed >= session.maxHints
            ? 'GUESS_INPUT'
            : 'QUESTION_SET',
        lastActivityAt: this.now(),
      },
    });

    const theme = await this.prisma.theme.findUnique({
      where: { id: session.themeId },
    });

    const personality = await this.prisma.personality.findUnique({
      where: { id: session.selectedPersonalityId ?? undefined },
    });

    if (updated.wrongGuesses >= updated.maxGuesses) {
      const ended = await this.endSession(updated.id, 'FAILED_GUESSES');
      const lossPrompt = await this.aiGenieService.frameResponse({
        context: 'LOSS',
        themeName: theme?.name || session.themeId,
        personalityName: personality?.name,
      });
      await this.prisma.gameSession.update({
        where: { id: updated.id },
        data: { prompt: lossPrompt },
      });

      return this.serializeSession(ended, {
        prompt: lossPrompt,
        reveal: { name: await this.revealName(session.selectedPersonalityId) },
      });
    }

    const personaPrompt = await this.aiGenieService.frameResponse({
      context:
        updated.mode === 'GUESS_INPUT' ? 'WRONG_GUESS_NO_HINTS' : 'WRONG_GUESS',
      themeName: theme?.name || session.themeId,
      remainingGuesses: updated.maxGuesses - updated.wrongGuesses,
      personalityName: personality?.name,
    });
    const finalUpdate = await this.prisma.gameSession.update({
      where: { id: updated.id },
      data: { prompt: personaPrompt },
    });

    return this.serializeSession(finalUpdate, {
      prompt: personaPrompt,
      result: 'INCORRECT',
      allowed_digits: finalUpdate.mode === 'QUESTION_SET' ? [1, 2, 9] : [9],
    });
  }

  async debugReveal(dto: { session_id: string }) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: dto.session_id },
    });
    if (!session) throw new BadRequestException('Invalid session_id');
    const personalityId = session.selectedPersonalityId;
    if (!personalityId) return { session_id: session.id, selected: null };
    const p = await this.prisma.personality.findUnique({
      where: { id: personalityId },
      select: { id: true, name: true },
    });
    return { session_id: session.id, selected: p };
  }
}
