import {
  isEmailAuthPath,
  isSignUpEmailPath,
  normalizeAuthEmail,
} from './auth-email';

describe('auth email helpers', () => {
  it('normalizes email credentials before Better Auth handles them', () => {
    expect(normalizeAuthEmail('  User.Name@Example.COM ')).toBe(
      'user.name@example.com',
    );
  });

  it('matches Better Auth email routes with or without basePath', () => {
    expect(isEmailAuthPath('/sign-in/email')).toBe(true);
    expect(isEmailAuthPath('/sign-up/email')).toBe(true);
    expect(isEmailAuthPath('/auth/sign-in/email')).toBe(true);
    expect(isEmailAuthPath('/auth/sign-up/email')).toBe(true);
    expect(isEmailAuthPath('/auth/profile')).toBe(false);
  });

  it('identifies sign-up email routes with or without basePath', () => {
    expect(isSignUpEmailPath('/sign-up/email')).toBe(true);
    expect(isSignUpEmailPath('/auth/sign-up/email')).toBe(true);
    expect(isSignUpEmailPath('/auth/sign-in/email')).toBe(false);
  });
});
