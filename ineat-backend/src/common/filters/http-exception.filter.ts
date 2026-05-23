import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { SentryExceptionCaptured } from '@sentry/nestjs';

const DEFAULT_ERROR_MESSAGE = 'Une erreur est survenue. Veuillez réessayer.';

interface ExceptionResponseBody {
  code?: string;
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

interface NormalizedErrorResponse {
  success: false;
  code: string;
  message: string;
  requestId: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status = this.getStatus(exception);
    const exceptionResponse = this.getExceptionResponse(exception);
    const requestId = this.getRequestId(request);
    const body = this.buildResponse(status, exceptionResponse, requestId);

    this.logException(exception, request, status, requestId);

    response.setHeader('X-Request-Id', requestId);
    response.status(status).json(body);
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getExceptionResponse(
    exception: unknown,
  ): ExceptionResponseBody | string | null {
    if (exception instanceof HttpException) {
      return exception.getResponse() as ExceptionResponseBody | string;
    }

    return null;
  }

  private getRequestId(request: Request): string {
    const headerValue = request.headers['x-request-id'];

    if (Array.isArray(headerValue)) {
      return headerValue[0] || randomUUID();
    }

    return headerValue || randomUUID();
  }

  private buildResponse(
    status: number,
    exceptionResponse: ExceptionResponseBody | string | null,
    requestId: string,
  ): NormalizedErrorResponse {
    const responseBody = this.normalizeExceptionResponse(exceptionResponse);
    const hasPublicServerError =
      status >= 500 && !!responseBody.code && !!responseBody.message;

    return {
      success: false,
      code: responseBody.code || this.getDefaultCode(status),
      message:
        status < 500 || hasPublicServerError
          ? responseBody.message || this.getDefaultMessage(status)
          : DEFAULT_ERROR_MESSAGE,
      requestId,
    };
  }

  private normalizeExceptionResponse(
    exceptionResponse: ExceptionResponseBody | string | null,
  ): Pick<NormalizedErrorResponse, 'code' | 'message'> {
    if (typeof exceptionResponse === 'string') {
      return {
        code: undefined,
        message: exceptionResponse,
      };
    }

    if (!exceptionResponse) {
      return {
        code: undefined,
        message: undefined,
      };
    }

    return {
      code: exceptionResponse.code,
      message: this.normalizeMessage(exceptionResponse.message),
    };
  }

  private normalizeMessage(message?: string | string[]): string | undefined {
    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return message;
  }

  private getDefaultCode(status: number): string {
    return HttpStatus[status] || 'INTERNAL_SERVER_ERROR';
  }

  private getDefaultMessage(status: number): string {
    if (status >= 500) {
      return DEFAULT_ERROR_MESSAGE;
    }

    return HttpStatus[status] || 'Erreur de requête';
  }

  private logException(
    exception: unknown,
    request: Request,
    status: number,
    requestId: string,
  ): void {
    const method = request.method;
    const url = request.originalUrl || request.url;
    const message =
      exception instanceof Error
        ? exception.message
        : JSON.stringify(exception);
    const logMessage = `[${requestId}] ${method} ${url} ${status} - ${message}`;

    if (status >= 500) {
      this.logger.error(
        logMessage,
        exception instanceof Error ? exception.stack : undefined,
      );
      return;
    }

    this.logger.warn(logMessage);
  }
}
