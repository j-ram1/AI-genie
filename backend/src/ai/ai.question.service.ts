import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service';

type AnswerType = 'YESNO' | 'VALUE';

@Injectable()
export class AiQuestionService {
  private readonly logger = new Logger(AiQuestionService.name);
  private readonly gemini: GoogleGenerativeAI | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const key = (this.config.get<string>('GEMINI_API_KEY') || '').trim();
    if (key) this.gemini = new GoogleGenerativeAI(key);
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async callAzureOpenAi(promptText: string): Promise<string> {
    const url = this.config.get<string>('AZURE_OPENAI_URL');
    const key = this.config.get<string>('AZURE_OPENAI_KEY');
    const timeoutMs = Number(this.config.get('AI_HTTP_TIMEOUT_MS') ?? 8000);
    const maxAttempts = Number(this.config.get('AI_HTTP_RETRIES') ?? 2);

    if (!url || !key) throw new Error('Azure OpenAI URL or Key missing');

    for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': key,
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: promptText }],
            max_tokens: 200,
            temperature: 0.7,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.text();
          if (attempt === maxAttempts || response.status < 500) {
            throw new Error(`Azure OpenAI Error: ${response.status} - ${err}`);
          }
          await this.delay(150 * attempt);
          continue;
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || '';
      } catch (error: any) {
        if (attempt === maxAttempts) {
          throw new Error(error?.message || 'Azure OpenAI request failed');
        }
        await this.delay(150 * attempt);
      } finally {
        clearTimeout(timer);
      }
    }

    throw new Error('Azure OpenAI request failed');
  }

  /**
   * Stable per (themeId, attrKey, answerType).
   * If GEMINI_API_KEY missing OR Gemini errors (quota/network/etc), silently returns fallbackText and caches it.
   */
  async getOrCreateQuestionText(params: {
    themeId: string;
    themeName: string;
    attrKey: string;
    answerType: AnswerType;
    fallbackText: string;
  }): Promise<string> {
    const { themeId, attrKey, answerType } = params;

    const cached = await this.prisma.aiQuestionText.findUnique({
      where: { themeId_attrKey_answerType: { themeId, attrKey, answerType } },
      select: { text: true },
    });
    if (cached?.text) return cached.text;

    const generated = await this.generateText(params);

    const saved = await this.prisma.aiQuestionText.create({
      data: { themeId, attrKey, answerType, text: generated.trim() },
      select: { text: true },
    });
    return saved.text;
  }

  private async generateText(params: {
    themeName: string;
    attrKey: string;
    answerType: AnswerType;
    fallbackText: string;
  }): Promise<string> {
    const { themeName, attrKey, answerType, fallbackText } = params;
    const prompt = this.constructPrompt(
      themeName,
      attrKey,
      answerType,
      fallbackText,
    );

    let generated = fallbackText;
    const provider = this.config.get<string>('AI_PROVIDER') || 'gemini';
    const modelName = (
      this.config.get<string>('AI_QUESTION_MODEL') || 'gemini-1.5-flash-latest'
    ).trim();

    try {
      if (provider === 'azure') {
        generated = await this.callAzureOpenAi(prompt);
      } else if (this.gemini) {
        const model = this.gemini.getGenerativeModel({ model: modelName });
        const resp = await model.generateContent(prompt);
        generated = resp.response.text();
      }
      return this.parseAiResponse(generated, fallbackText);
    } catch (err: any) {
      this.logger.error(
        `AI Provider Error [${provider}]: ${err?.message || String(err)}`,
      );
      return fallbackText;
    }
  }

  private constructPrompt(
    themeName: string,
    attrKey: string,
    answerType: AnswerType,
    fallbackText: string,
  ): string {
    return [
      'Return ONLY valid JSON: {"text":"..."}',
      'Generate one short question for a DTMF keypad guessing game.',
      'Context: The hidden answer is a SPECIFIC PERSON/CHARACTER from the theme.',
      'Rules:',
      `- Theme: ${themeName}`,
      `- Attribute key: ${attrKey}`,
      `- answerType: ${answerType}`,
      '- Ask ONLY about the given attribute key for this PERSON.',
      '- DO NOT refer to the target as "this movie", "this sport", or "this game". Refer to them as "this person", "they", or "the personality".',
      '- YESNO: must be a yes/no question (e.g. "Is this person...").',
      '- VALUE: ask for a short value (e.g. "What is their...").',
      '- Keep it <= 50 characters (best effort).',
      '- Do not mention any specific person name.',
      `- If unsure, use this fallback: ${fallbackText}`,
    ].join('\n');
  }

  private parseAiResponse(generated: string, fallbackText: string): string {
    if (!generated.includes('{')) return generated.trim() || fallbackText;

    try {
      const parsed = JSON.parse(generated);
      if (typeof parsed.text === 'string' && parsed.text.trim()) {
        return parsed.text.trim();
      }
    } catch {
      const m = /\{[\s\S]*\}/.exec(generated);
      if (m) {
        try {
          const parsed2 = JSON.parse(m[0]);
          if (typeof parsed2.text === 'string' && parsed2.text.trim()) {
            return parsed2.text.trim();
          }
        } catch { }
      }
    }
    return generated.trim() || fallbackText;
  }
}
