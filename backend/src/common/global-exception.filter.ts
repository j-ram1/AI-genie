import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type RequestWithRequestId = Request & { requestId?: string; id?: string };

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<RequestWithRequestId>();
    const res = ctx.getResponse<Response>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? this.extractHttpExceptionMessage(exception)
        : 'Internal server error';

    const requestId =
      req.id ?? req.requestId ?? req.header('x-request-id') ?? 'unknown';

    if (statusCode >= 500) {
      const err = exception as { stack?: string; message?: string };
      this.logger.error(
        {
          requestId,
          path: req.originalUrl ?? req.url,
          method: req.method,
          statusCode,
        },
        err?.stack || err?.message || String(exception),
      );
    }

    res.status(statusCode).json({
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: req.originalUrl ?? req.url,
      requestId,
    });
  }

  private extractHttpExceptionMessage(exception: HttpException): string {
    const payload = exception.getResponse();
    if (typeof payload === 'string') return payload;
    if (typeof payload === 'object' && payload !== null) {
      const maybeMessage = (payload as { message?: unknown }).message;
      if (Array.isArray(maybeMessage)) {
        return maybeMessage.join(', ');
      }
      if (typeof maybeMessage === 'string') {
        return maybeMessage;
      }
    }
    return exception.message || 'Request failed';
  }
}
