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
      ruleLevel: 'manual',
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
    expect(result).toEqual(
      expect.objectContaining({
        ruleId: 'epicerie-sucree',
        ruleLevel: 'category',
        storageGroup: 'pantry',
        durationDays: 730,
        referenceDate: new Date('2026-05-01'),
      }),
    );
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
    expect(result.ruleId).toBe('pain');
    expect(result.ruleLevel).toBe('product');
    expect(result.durationDays).toBe(5);
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
    expect(result.ruleId).toBeUndefined();
    expect(result.ruleLevel).toBe('storage');
    expect(result.storageGroup).toBe('freezer');
    expect(result.durationDays).toBe(180);
  });

  it('uses the addition date when no purchase date is available', () => {
    const result = estimateExpiryDate({
      categorySlug: 'plats-prepares',
      storageLocation: 'refrigerateur',
      addedAt: '2026-05-02',
    });

    expect(result.expiryDate).toEqual(new Date('2026-05-05'));
    expect(result.referenceDate).toEqual(new Date('2026-05-02'));
  });

  it('uses a short cold-storage duration for cooked products', () => {
    const result = estimateExpiryDate({
      productName: 'Riz',
      categorySlug: 'epicerie-salee',
      storageLocation: 'refrigerateur',
      preparationStatus: 'COOKED',
      purchaseDate: '2026-05-01',
    });

    expect(result.expiryDate).toEqual(new Date('2026-05-04'));
    expect(result.durationDays).toBe(3);
    expect(result.reason).toBe('épicerie salée + refrigerateur + cuit');
  });

  it('caps shelf life for opened packaged products', () => {
    const result = estimateExpiryDate({
      productName: 'Lait',
      categorySlug: 'produits-laitiers',
      storageLocation: 'refrigerateur',
      packageStatus: 'OPENED',
      purchaseDate: '2026-05-01',
    });

    expect(result.expiryDate).toEqual(new Date('2026-05-06'));
    expect(result.durationDays).toBe(5);
    expect(result.reason).toBe('produits laitiers + refrigerateur + ouvert');
  });
});
