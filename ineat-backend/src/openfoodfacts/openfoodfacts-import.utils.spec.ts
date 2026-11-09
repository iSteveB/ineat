import { escapeCopyValue } from './openfoodfacts-import.utils';

describe('escapeCopyValue', () => {
  it('removes NUL bytes that PostgreSQL text cannot store', () => {
    expect(escapeCopyValue('before\0after')).toBe('beforeafter');
  });

  it('escapes COPY text delimiters and preserves its null marker', () => {
    expect(escapeCopyValue('a\\b\tc\nd\re')).toBe('a\\\\b\\tc\\nd\\re');
    expect(escapeCopyValue(null)).toBe('\\N');
  });
});
