import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((err) => {
          const path = err.path.length > 0 ? err.path.join('.') : 'root';
          return `${path}: ${err.message}`;
        });

        throw new BadRequestException({
          message: 'Données de validation invalides',
          errors: errorMessages,
          statusCode: 400,
        });
      }
      throw new BadRequestException('Erreur de validation');
    }
  }
}

/**
 * Factory pour créer des pipes Zod spécifiques
 */
export function createZodPipe<T>(schema: ZodSchema<T>) {
  return new ZodValidationPipe(schema);
}
