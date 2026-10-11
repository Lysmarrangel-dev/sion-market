import { HttpStatus, type PipeTransform } from '@nestjs/common';
import { z } from 'zod';
import { AppError } from './errors.js';

/** Validates a request body or query against a schema from @sionmarket/contracts. */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw new AppError('VALIDATION', 'Datos inválidos', HttpStatus.BAD_REQUEST, z.flattenError(result.error));
    }
    return result.data;
  }
}
