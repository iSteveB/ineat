import { CiqualReferenceService } from './ciqual-reference.service';

describe('CiqualReferenceService', () => {
  const service = new CiqualReferenceService();

  it('matches an unpackaged mango receipt label to the generic mango entry', () => {
    const match = service.matchInvoiceItem({
      detectedName: 'Mangue affinée bateau 1 pièce',
      category: 'fruits-et-legumes',
      quantity: 1,
      confidence: 0.95,
    });

    expect(match).toMatchObject({
      code: '13025',
      name: 'Mangue, chair sans peau, sans noyau, crue',
      version: '2025-11-03',
    });
    expect(match?.nutrients.energy).toBe(71.1);
  });

  it('does not use CIQUAL for a barcode product', () => {
    expect(
      service.matchInvoiceItem({
        detectedName: 'Mangue',
        category: 'fruits-et-legumes',
        selectedEan: '12345678',
        quantity: 1,
        confidence: 0.95,
      }),
    ).toBeNull();
  });

  it('does not use CIQUAL outside the produce category', () => {
    expect(
      service.matchInvoiceItem({
        detectedName: 'Mangue',
        category: 'epicerie-sucree',
        quantity: 1,
        confidence: 0.95,
      }),
    ).toBeNull();
  });

  it('matches fresh eggs in the meat, fish and eggs category', () => {
    const match = service.matchInvoiceItem({
      detectedName: '6 oeufs frais plein air',
      category: 'viandes-et-poissons',
      quantity: 1,
      confidence: 0.92,
    });

    expect(match?.name.toLowerCase()).toContain('oeuf');
  });
});
