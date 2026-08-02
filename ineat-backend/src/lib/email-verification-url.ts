export const withEmailVerificationCallback = (
  verificationUrl: string,
  frontendUrl: string | undefined,
) => {
  const normalizedFrontendUrl = frontendUrl?.trim().replace(/\/$/, '');
  if (!normalizedFrontendUrl) return verificationUrl;

  const url = new URL(verificationUrl);
  url.searchParams.set(
    'callbackURL',
    `${normalizedFrontendUrl}/verify-email`,
  );

  return url.toString();
};
