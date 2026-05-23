import {
  ArgumentsHost,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

const SENSITIVE_TERMS = [
  'api_key',
  'Invalid Signature',
  'CLOUDINARY_API_SECRET',
  'stack',
  'Cloudinary',
];

const expectNoSensitiveTerms = (value: unknown) => {
  const serialized = JSON.stringify(value);

  SENSITIVE_TERMS.forEach((term) => {
    expect(serialized).not.toContain(term);
  });
};

const createHost = (headers: Record<string, string> = {}) => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const setHeader = jest.fn();
  const request = {
    headers,
    method: 'GET',
    originalUrl: '/api/test',
    url: '/api/test',
  };
  const response = {
    setHeader,
    status,
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as ArgumentsHost;

  return { host, json, status, setHeader };
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.spyOn((filter as any).logger, 'error').mockImplementation(jest.fn());
    jest.spyOn((filter as any).logger, 'warn').mockImplementation(jest.fn());
  });

  it('normalise les erreurs 400 en conservant le message métier', () => {
    const { host, json, status, setHeader } = createHost({
      'x-request-id': 'req-test',
    });

    filter.catch(
      new BadRequestException({
        message: ['Le nom est requis', 'La quantité doit être positive'],
      }),
      host,
    );

    expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-test');
    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      success: false,
      code: 'BAD_REQUEST',
      message: 'Le nom est requis, La quantité doit être positive',
      requestId: 'req-test',
    });
  });

  it.each([
    'Invalid api_key 738474456436988',
    'Invalid Signature abc123 for Cloudinary upload',
    'Missing CLOUDINARY_API_SECRET in environment',
    'Cloudinary stack trace at upload_stream',
  ])('masque les erreurs 500 techniques: %s', (message) => {
    const { host, json, status } = createHost({
      'x-request-id': 'req-500',
    });

    filter.catch(new InternalServerErrorException(message), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Une erreur est survenue. Veuillez réessayer.',
      requestId: 'req-500',
    });
    expectNoSensitiveTerms(json.mock.calls[0][0]);
  });

  it('conserve les erreurs 500 explicitement publiques avec code stable', () => {
    const { host, json, status } = createHost({
      'x-request-id': 'req-public',
    });

    filter.catch(
      new InternalServerErrorException({
        code: 'RECEIPT_UPLOAD_FAILED',
        message:
          "Impossible d'envoyer le ticket. Veuillez réessayer dans quelques instants.",
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      success: false,
      code: 'RECEIPT_UPLOAD_FAILED',
      message:
        "Impossible d'envoyer le ticket. Veuillez réessayer dans quelques instants.",
      requestId: 'req-public',
    });
  });
});
