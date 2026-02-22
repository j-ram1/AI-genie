import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiGenieService {
  constructor(private readonly config: ConfigService) {}

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim();
  }

  private async callAzure(
    prompt: string,
    systemPrompt?: string,
  ): Promise<string> {
    const url = this.config.get<string>('AZURE_OPENAI_URL');
    const key = this.config.get<string>('AZURE_OPENAI_KEY');
    if (!url || !key) return '';
    const timeoutMs = Number(this.config.get('AI_HTTP_TIMEOUT_MS') ?? 8000);
    const maxAttempts = Number(this.config.get('AI_HTTP_RETRIES') ?? 2);

    const systemContent =
      systemPrompt ||
      'You are a game host. Use simple, clear English. Keep responses under 150 characters. Avoid fantasy wording, emojis, and slang.';

    for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': key },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemContent },
              { role: 'user', content: prompt },
            ],
            max_tokens: 150,
            temperature: 0.3,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          if (attempt === maxAttempts || response.status < 500) return '';
          await this.delay(150 * attempt);
          continue;
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
      } catch {
        if (attempt === maxAttempts) return '';
        await this.delay(150 * attempt);
      } finally {
        clearTimeout(timer);
      }
    }

    return '';
  }

  async frameResponse(params: {
    context:
      | 'START'
      | 'HINT'
      | 'WRONG_GUESS'
      | 'WRONG_GUESS_NO_HINTS'
      | 'WIN'
      | 'LOSS';
    themeName: string;
    hintText?: string;
    answer?: string;
    qaHistory?: { q: string; a: string }[];
    remainingGuesses?: number;
    personalityName?: string;
  }): Promise<string> {
    const {
      context,
      themeName,
      hintText,
      answer,
      remainingGuesses,
      personalityName,
    } = params;

    let basePrompt = '';
    if (context === 'START') {
      basePrompt = `I picked a personality from "${themeName}". Press 1 for a hint or press 2 to guess.`;
    } else if (context === 'HINT' && hintText && answer) {
      basePrompt = `Hint: ${hintText} Answer: ${answer} Press 1 for another hint or press 2 to guess.`;
    } else if (context === 'WRONG_GUESS') {
      basePrompt = `That guess is not correct. Press 1 for a hint or press 2 to guess again.`;
    } else if (context === 'WRONG_GUESS_NO_HINTS') {
      basePrompt = `That guess is not correct. No hints are left. Type your next guess. You have ${remainingGuesses} attempts left. Press 9 to exit.`;
    } else if (context === 'WIN') {
      basePrompt = `Correct. The answer is ${personalityName || 'the personality'}. Press 1 to play again, 2 for leaderboard, 3 for theme change, or 9 to exit.`;
    } else if (context === 'LOSS') {
      basePrompt = `No attempts left. The answer is ${personalityName || 'the personality'}. Press 1 to play again, 2 for leaderboard, 3 for theme change, or 9 to exit.`;
    }

    const systemPrompt =
      context === 'HINT' && personalityName
        ? `You are a game host. The user is trying to guess "${personalityName}". NEVER mention their name in the response. Keep language simple and direct.`
        : undefined;

    const aiResponse = await this.callAzure(
      `Rewrite this game prompt in plain, easy English. Keep button instructions exact (for example, "Press 1..." and "Press 2..."). Do not use fantasy words, emojis, or poetic tone: "${basePrompt}"`,
      systemPrompt,
    );
    return this.cleanText(aiResponse || basePrompt);
  }

  async frameOptions(params: {
    themeName: string;
    options: string[];
  }): Promise<string> {
    const { themeName, options } = params;
    const count = options.length;
    const optionsList = options
      .map((opt, i) => `Press ${i + 1} for ${opt}`)
      .join(', ');
    const basePrompt = `Choose a hint about this personality from "${themeName}". ${optionsList}.`;

    const aiResponse = await this.callAzure(
      `Rewrite this in plain, easy English. Keep all digit instructions exactly in the format "Press N for ...". Do not use fantasy words, emojis, or slang: "${basePrompt}"`,
    );
    return this.cleanText(aiResponse || basePrompt);
  }
}
