import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { Writable } from 'node:stream';
import { createWriteStream, type WriteStream } from 'node:fs';
import { join } from 'node:path';

interface HourlyRotatingLogStreamOptions {
  directory: string;
  retentionHours: number;
  filePrefix?: string;
}

const DEFAULT_PREFIX = 'ai-genie';

function toHourKey(date: Date): string {
  const year = date.getFullYear().toString();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  return `${year}-${month}-${day}-${hour}`;
}

function fromHourKey(hourKey: string): number | null {
  const dashedMatch = hourKey.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})$/);
  if (dashedMatch) {
    const [, year, month, day, hour] = dashedMatch;
    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      0,
      0,
      0,
    ).getTime();
  }

  // Backward compatibility with old format: YYYYMMDDHH
  if (/^\d{10}$/.test(hourKey)) {
    const year = Number(hourKey.slice(0, 4));
    const month = Number(hourKey.slice(4, 6));
    const day = Number(hourKey.slice(6, 8));
    const hour = Number(hourKey.slice(8, 10));
    return new Date(year, month - 1, day, hour, 0, 0, 0).getTime();
  }

  return null;
}

export class HourlyRotatingLogStream extends Writable {
  private readonly directory: string;
  private readonly retentionMs: number;
  private readonly filePrefix: string;
  private currentHourKey: string;
  private currentStream: WriteStream;

  constructor(options: HourlyRotatingLogStreamOptions) {
    super();
    this.directory = options.directory;
    this.filePrefix = options.filePrefix ?? DEFAULT_PREFIX;
    this.retentionMs = Math.max(1, options.retentionHours) * 60 * 60 * 1000;

    mkdirSync(this.directory, { recursive: true });

    const now = new Date();
    this.currentHourKey = toHourKey(now);
    this.currentStream = this.openStream(this.currentHourKey);
    this.pruneOldFiles(now.getTime());
  }

  _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    try {
      this.rotateIfNeeded();
      this.currentStream.write(chunk, encoding, callback);
    } catch (error) {
      callback(error as Error);
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    this.currentStream.end(callback);
  }

  private rotateIfNeeded(): void {
    const now = new Date();
    const nextHourKey = toHourKey(now);
    if (nextHourKey === this.currentHourKey) {
      return;
    }

    this.currentHourKey = nextHourKey;
    const oldStream = this.currentStream;
    this.currentStream = this.openStream(this.currentHourKey);
    oldStream.end();
    this.pruneOldFiles(now.getTime());
  }

  private openStream(hourKey: string): WriteStream {
    const fileName = `${this.filePrefix}-${hourKey}.log`;
    const filePath = join(this.directory, fileName);
    return createWriteStream(filePath, { flags: 'a' });
  }

  private pruneOldFiles(nowMs: number): void {
    const files = readdirSync(this.directory);
    const fileRegex = new RegExp(
      `^${this.filePrefix}-((\\d{4}-\\d{2}-\\d{2}-\\d{2})|(\\d{10}))\\.log$`,
    );

    for (const fileName of files) {
      const match = fileName.match(fileRegex);
      if (!match) {
        continue;
      }

      const logTimeMs = fromHourKey(match[1]);
      if (logTimeMs === null) {
        continue;
      }

      if (nowMs - logTimeMs < this.retentionMs) {
        continue;
      }

      rmSync(join(this.directory, fileName), { force: true });
    }
  }
}

export function createHourlyRotatingLogStream(
  options: HourlyRotatingLogStreamOptions,
): Writable {
  return new HourlyRotatingLogStream(options);
}
