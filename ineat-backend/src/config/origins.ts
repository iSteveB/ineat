const PRODUCTION_FRONTEND_ORIGIN = 'https://ineat.store';

const parseOrigins = (...values: Array<string | undefined>): string[] =>
  values
    .flatMap((value) => value?.split(',') ?? [])
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

export const getAllowedOrigins = (
  environment: string | undefined,
  frontendUrl: string | undefined,
  corsOrigin: string | undefined,
): string[] => {
  const configuredOrigins = parseOrigins(frontendUrl, corsOrigin);

  if (environment === 'production') {
    return [...new Set([PRODUCTION_FRONTEND_ORIGIN, ...configuredOrigins])];
  }

  return [
    ...new Set([
      ...configuredOrigins,
      'https://ineat-frontend-developpement.up.railway.app',
      'https://ineat-backend-developpement.up.railway.app',
      'https://192.168.1.28:5173',
      'https://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000',
    ]),
  ];
};
