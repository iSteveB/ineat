import { getAllowedOrigins } from './origins';

describe('getAllowedOrigins', () => {
  it('always trusts the canonical frontend in production', () => {
    expect(getAllowedOrigins('production', undefined, undefined)).toEqual([
      'https://ineat.store',
    ]);
  });

  it('normalizes, splits and deduplicates configured origins', () => {
    expect(
      getAllowedOrigins(
        'production',
        'https://ineat.store/',
        ' https://legacy.example.com/, https://ineat.store ',
      ),
    ).toEqual(['https://ineat.store', 'https://legacy.example.com']);
  });

  it('keeps local origins available outside production', () => {
    expect(getAllowedOrigins('development', undefined, undefined)).toEqual(
      expect.arrayContaining([
        'https://localhost:5173',
        'http://localhost:5173',
      ]),
    );
  });
});
