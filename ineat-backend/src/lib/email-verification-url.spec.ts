import { withEmailVerificationCallback } from './email-verification-url';

describe('withEmailVerificationCallback', () => {
  it('replaces the API fallback callback with the frontend result page', () => {
    expect(
      withEmailVerificationCallback(
        'https://api.ineat.store/auth/verify-email?token=secret&callbackURL=%2F',
        'https://ineat.store/',
      ),
    ).toBe(
      'https://api.ineat.store/auth/verify-email?token=secret&callbackURL=https%3A%2F%2Fineat.store%2Fverify-email',
    );
  });

  it('keeps the provider URL when the frontend URL is not configured', () => {
    const verificationUrl =
      'http://localhost:3000/auth/verify-email?token=secret&callbackURL=%2F';

    expect(withEmailVerificationCallback(verificationUrl, undefined)).toBe(
      verificationUrl,
    );
  });
});
