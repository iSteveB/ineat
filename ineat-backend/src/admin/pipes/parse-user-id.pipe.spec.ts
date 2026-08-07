import { BadRequestException } from '@nestjs/common';
import { ParseUserIdPipe } from './parse-user-id.pipe';

describe('ParseUserIdPipe', () => {
  const pipe = new ParseUserIdPipe();

  it.each([
    'Dbrg0cqW9sA5ZXWOlQLMSAvMaA9n02o3',
    'c6a6ed22-6d12-4d5b-85ac-2dbadf8f8ce1',
    'user_123',
  ])('accepte un identifiant Better Auth valide : %s', (id) => {
    expect(pipe.transform(id)).toBe(id);
  });

  it.each(['', '../admin', 'user id', 'a'.repeat(129)])(
    'refuse un identifiant invalide : %s',
    (id) => {
      expect(() => pipe.transform(id)).toThrow(BadRequestException);
    },
  );
});
