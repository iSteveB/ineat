import type { NextFunction, Request, Response } from 'express';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(),
  jwtVerify: jest.fn(),
}));

import {
  createCloudflareAccessMiddleware,
  type CloudflareAccessTokenVerifier,
} from './cloudflare-access.middleware';

const options = {
  enabled: true,
  teamDomain: 'ineat.cloudflareaccess.com',
  audience: 'ineat-development',
};

const createRequest = (
  path: string,
  method = 'GET',
  token?: string,
) =>
  ({
    path,
    method,
    get: jest.fn().mockReturnValue(token),
  }) as unknown as Request;

const createResponse = () => {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);
  response.json.mockReturnValue(response);
  return response as unknown as Response;
};

describe('createCloudflareAccessMiddleware', () => {
  it('does not protect requests when Cloudflare Access is disabled', () => {
    const next = jest.fn() as NextFunction;

    createCloudflareAccessMiddleware({ enabled: false })(
      createRequest('/auth/session'),
      createResponse(),
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['GET', '/health'],
    ['POST', '/billing/webhook'],
    ['POST', '/email/webhook'],
    ['OPTIONS', '/auth/session'],
  ])('allows the exempt %s %s request', (method, path) => {
    const next = jest.fn() as NextFunction;
    const verifier = jest.fn() as CloudflareAccessTokenVerifier;

    createCloudflareAccessMiddleware(options, verifier)(
      createRequest(path, method),
      createResponse(),
      next,
    );

    expect(next).toHaveBeenCalledTimes(1);
    expect(verifier).not.toHaveBeenCalled();
  });

  it('rejects a protected request without an Access token', () => {
    const next = jest.fn() as NextFunction;
    const response = createResponse();

    createCloudflareAccessMiddleware(options, jest.fn())(
      createRequest('/auth/session'),
      response,
      next,
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CLOUDFLARE_ACCESS_REQUIRED' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('allows a request with a valid Access token', async () => {
    const next = jest.fn() as NextFunction;
    const verifier = jest.fn().mockResolvedValue(undefined);

    createCloudflareAccessMiddleware(options, verifier)(
      createRequest('/auth/session', 'GET', 'valid-token'),
      createResponse(),
      next,
    );
    await Promise.resolve();

    expect(verifier).toHaveBeenCalledWith('valid-token');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects a request with an invalid Access token', async () => {
    const next = jest.fn() as NextFunction;
    const response = createResponse();
    const verifier = jest.fn().mockRejectedValue(new Error('invalid token'));

    createCloudflareAccessMiddleware(options, verifier)(
      createRequest('/auth/session', 'GET', 'invalid-token'),
      response,
      next,
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'CLOUDFLARE_ACCESS_INVALID' }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('fails fast when enabled without a complete configuration', () => {
    expect(() =>
      createCloudflareAccessMiddleware({ enabled: true }),
    ).toThrow('Cloudflare Access requires');
  });
});
