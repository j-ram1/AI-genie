import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

type RequestWithId = Request & { requestId?: string; id?: string };

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction) {
    const headerValue = req.header('x-request-id');
    const requestId =
      headerValue && headerValue.trim()
        ? headerValue.trim()
        : randomUUID();

    req.requestId = requestId;
    req.id = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
