import { ArgumentsHost, Catch, HttpException, HttpStatus, type ExceptionFilter } from '@nestjs/common';
import type { ErrorCode } from '@sionmarket/contracts';
import type { FastifyReply } from 'fastify';

/** Business error with a stable code from @sionmarket/contracts. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status = HttpStatus.UNPROCESSABLE_ENTITY,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new AppError('NOT_FOUND', `${what} no existe`, HttpStatus.NOT_FOUND);
export const forbidden = (message = 'No tienes permiso para esta acción') =>
  new AppError('FORBIDDEN', message, HttpStatus.FORBIDDEN);

@Catch()
export class ErrorFilter implements ExceptionFilter {
  catch(err: unknown, host: ArgumentsHost) {
    const reply = host.switchToHttp().getResponse<FastifyReply>();
    if (err instanceof AppError) {
      return reply.status(err.status).send({ code: err.code, message: err.message, details: err.details });
    }
    if (err instanceof HttpException) {
      const status = err.getStatus();
      const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : status === 404 ? 'NOT_FOUND' : 'VALIDATION';
      return reply.status(status).send({ code, message: err.message });
    }
    console.error(err);
    return reply.status(500).send({ code: 'INTERNAL', message: 'Error interno' });
  }
}
