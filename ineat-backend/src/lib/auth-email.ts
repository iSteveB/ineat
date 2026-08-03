const emailAuthPathSuffixes = ['/sign-in/email', '/sign-up/email'];

export const normalizeAuthEmail = (email: string) =>
  email.trim().toLowerCase();

export const isEmailAuthPath = (path: string) =>
  emailAuthPathSuffixes.some(
    (suffix) => path === suffix || path.endsWith(suffix),
  );

export const isSignUpEmailPath = (path: string) =>
  path === '/sign-up/email' || path.endsWith('/sign-up/email');
