import { estimateExpiryDate } from './expiry-estimation.service';

describe('estimateExpiryDate', () => {
  it('keeps a manual expiry date as the source of truth', () => {
    const result = estimateExpiryDate({
      productName: 'Yaourt nature',
      categorySlug: 'produits-laitiers',
      storageLocation: 'refrigerateur',
      purchaseDate: '2026-05-01',
      manualExpiryDate: '2026-05-06',
    });

    expect(result).toEqual({
      expiryDate: new Date('2026-05-06'),
      source: 'MANUAL',
    });
  });

  it('uses the seeded category rules before storage fallback', () => {
    const result = estimateExpiryDate({
      categorySlug: 'epicerie-sucree',
      categoryName: 'Épicerie sucrée',
      storageLocation: 'placard',
      purchaseDate: '2026-05-01',
    });

    expect(result.expiryDate).toEqual(new Date('2028-04-30'));
    expect(result.source).toBe('ESTIMATED');
    expect(result.reason).toBe('épicerie sucrée + placard');
  });

  it('prioritizes product rules over broad category rules', () => {
    const result = estimateExpiryDate({
      productName: 'Pain complet',
      categorySlug: 'epicerie-salee',
      storageLocation: 'placard',
      purchaseDate: '2026-05-01',
    });

    expect(result.expiryDate).toEqual(new Date('2026-05-06'));
    expect(result.reason).toBe('pain + placard');
  });

  it('falls back to storage rules when no product or category rule matches', () => {
    const result = estimateExpiryDate({
      productName: 'Produit mystère',
      categorySlug: 'categorie-inconnue',
      storageLocation: 'congelateur',
      purchaseDate: '2026-05-01',
    });

    expect(result.expiryDate).toEqual(new Date('2026-10-28'));
    expect(result.reason).toBe('stockage congelateur');
  });
});
