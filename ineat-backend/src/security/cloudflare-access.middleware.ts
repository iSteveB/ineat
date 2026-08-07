import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export interface CloudflareAccessOptions {
  enabled: boolean;
  teamDomain?: string;
  audience?: string;
}

export type CloudflareAccessTokenVerifier = (token: string) => Promise<void>;

const PUBLIC_PATHS = new Set([
  '/health',
  '/billing/webhook',
  '/email/webhook',
]);

const createTokenVerifier = (
  teamDomain: string,
  audience: string,
): CloudflareAccessTokenVerifier => {
  const issuer = `https://${teamDomain}`;
  const keys = createRemoteJWKSet(
    new URL(`${issuer}/cdn-cgi/access/certs`),
  );

  return async (token: string) => {
    await jwtVerify(token, keys, {
      issuer,
      audience,
    });
  };
};

export const createCloudflareAccessMiddleware = (
  options: CloudflareAccessOptions,
  verifier?: CloudflareAccessTokenVerifier,
): RequestHandler => {
  if (!options.enabled) {
    return (_request, _response, next) => next();
  }

  if (!options.teamDomain || !options.audience) {
    throw new Error(
      'Cloudflare Access requires a team domain and application audience',
    );
  }

  const verifyToken =
    verifier ?? createTokenVerifier(options.teamDomain, options.audience);

  return (
    request: Request,
    response: Response,
    next: NextFunction,
  ): void => {
    if (request.method === 'OPTIONS' || PUBLIC_PATHS.has(request.path)) {
      next();
      return;
    }

    const token = request.get('Cf-Access-Jwt-Assertion');
    if (!token) {
      response.status(403).json({
        statusCode: 403,
        code: 'CLOUDFLARE_ACCESS_REQUIRED',
        message: 'Cloudflare Access authentication is required.',
      });
      return;
    }

    void verifyToken(token)
      .then(() => next())
      .catch(() => {
        response.status(403).json({
          statusCode: 403,
          code: 'CLOUDFLARE_ACCESS_INVALID',
          message: 'Cloudflare Access authentication is invalid.',
        });
      });
  };
};
