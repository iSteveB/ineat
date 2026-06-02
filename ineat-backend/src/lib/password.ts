import * as bcrypt from 'bcryptjs';
import {
  hashPassword as hashScryptPassword,
  verifyPassword as verifyScryptPassword,
} from 'better-auth/crypto';

const isLegacyBcryptHash = (hash: string) => /^\$2[aby]\$/.test(hash);

export const hashPassword = (password: string) => hashScryptPassword(password);

export const verifyPassword = async ({
  hash,
  password,
}: {
  hash: string;
  password: string;
}) => {
  if (isLegacyBcryptHash(hash)) {
    return bcrypt.compare(password, hash);
  }

  return verifyScryptPassword({ hash, password });
};
