import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { threadId } from 'node:worker_threads';
import { Params } from 'nestjs-pino';
import pretty from 'pino-pretty';
import { createHourlyRotatingLogStream } from './hourly-rotating-log.stream';
import { createTeeLogStream } from './tee-log.stream';

const parsedRetentionHours = Number(process.env.LOG_RETENTION_HOURS ?? '16');
const retentionHours = Number.isFinite(parsedRetentionHours)
  ? parsedRetentionHours
  : 16;
const logDirectory = process.env.LOG_DIRECTORY ?? join(process.cwd(), 'logs');
const rotatingFileStream = createHourlyRotatingLogStream({
  directory: logDirectory,
  retentionHours,
});
const prettyConsoleStream = pretty({
  colorize: true,
  translateTime: 'SYS:standard',
  singleLine: false,
  ignore: 'pid,hostname',
});
const stream = createTeeLogStream([prettyConsoleStream, rotatingFileStream]);

export const pinoLoggerConfig: Params = {
  pinoHttp: [
    {
      level: process.env.LOG_LEVEL ?? 'info',
      mixin: () => ({
        pid: process.pid,
        threadId,
      }),
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const headerId = Array.isArray(incoming) ? incoming[0] : incoming;
        const requestId = headerId?.trim() || randomUUID();
        res.setHeader('x-request-id', requestId);
        return requestId;
      },
      customProps: (req) => ({
        requestId: req.id,
      }),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.phone',
          'req.body.user_phone',
        ],
        censor: '[REDACTED]',
      },
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    },
    stream,
  ],
};
