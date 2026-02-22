import { Writable } from 'node:stream';

interface TeeLogStreamOptions {
  streams: Writable[];
}

export class TeeLogStream extends Writable {
  private readonly streams: Writable[];

  constructor(options: TeeLogStreamOptions) {
    super();
    this.streams = options.streams;
  }

  _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (this.streams.length === 0) {
      callback();
      return;
    }

    let pending = this.streams.length;
    let hasErrored = false;

    const done = (error?: Error | null) => {
      if (error && !hasErrored) {
        hasErrored = true;
        callback(error);
        return;
      }

      pending -= 1;
      if (pending === 0 && !hasErrored) {
        callback();
      }
    };

    for (const stream of this.streams) {
      stream.write(chunk, encoding, done);
    }
  }

  _final(callback: (error?: Error | null) => void): void {
    if (this.streams.length === 0) {
      callback();
      return;
    }

    let pending = this.streams.length;
    let hasErrored = false;

    const done = (error?: Error | null) => {
      if (error && !hasErrored) {
        hasErrored = true;
        callback(error);
        return;
      }

      pending -= 1;
      if (pending === 0 && !hasErrored) {
        callback();
      }
    };

    for (const stream of this.streams) {
      if (stream === process.stdout || stream === process.stderr) {
        done();
        continue;
      }
      stream.end(done);
    }
  }
}

export function createTeeLogStream(streams: Writable[]): Writable {
  return new TeeLogStream({ streams });
}
