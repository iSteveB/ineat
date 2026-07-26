export const INVOICE_CATEGORY_SLUGS = [
  'fruits-et-legumes',
  'viandes-et-poissons',
  'produits-laitiers',
  'epicerie-salee',
  'epicerie-sucree',
  'surgeles',
  'boissons',
  'autres',
] as const;

export const INVOICE_STORAGE_LOCATIONS = [
  'Réfrigérateur',
  'Congélateur',
  'Placard',
  'Cave',
  'Garde-manger',
  'Fruitier',
  'Autre',
] as const;

const CATEGORY_ALIASES: Record<string, (typeof INVOICE_CATEGORY_SLUGS)[number]> = {
  fruit: 'fruits-et-legumes',
  fruits: 'fruits-et-legumes',
  legume: 'fruits-et-legumes',
  legumes: 'fruits-et-legumes',
  'fruits legumes': 'fruits-et-legumes',
  'fruits et legumes': 'fruits-et-legumes',
  viande: 'viandes-et-poissons',
  viandes: 'viandes-et-poissons',
  poisson: 'viandes-et-poissons',
  poissons: 'viandes-et-poissons',
  charcuterie: 'viandes-et-poissons',
  lait: 'produits-laitiers',
  laitage: 'produits-laitiers',
  laitages: 'produits-laitiers',
  fromage: 'produits-laitiers',
  yaourt: 'produits-laitiers',
  'produits laitiers': 'produits-laitiers',
  epicerie: 'epicerie-salee',
  'epicerie salee': 'epicerie-salee',
  'epicerie sucree': 'epicerie-sucree',
  sucre: 'epicerie-sucree',
  biscuit: 'epicerie-sucree',
  biscuits: 'epicerie-sucree',
  chocolat: 'epicerie-sucree',
  surgele: 'surgeles',
  surgeles: 'surgeles',
  boisson: 'boissons',
  boissons: 'boissons',
  eau: 'boissons',
  jus: 'boissons',
  autres: 'autres',
  autre: 'autres',
};

for (const slug of INVOICE_CATEGORY_SLUGS) {
  CATEGORY_ALIASES[slug.replace(/-/g, ' ')] = slug;
}

const STORAGE_BY_CATEGORY: Partial<
  Record<(typeof INVOICE_CATEGORY_SLUGS)[number], string>
> = {
  'viandes-et-poissons': 'Réfrigérateur',
  'produits-laitiers': 'Réfrigérateur',
  surgeles: 'Congélateur',
  boissons: 'Placard',
  'epicerie-salee': 'Placard',
  'epicerie-sucree': 'Placard',
};

const REFRIGERATED_PRODUCE =
  /\b(salade|endive|epinard|champignon|fraise|framboise|myrtille|legume|carotte|courgette|poireau|brocoli|chou|tomate)\b/i;
const FRUITIER_PRODUCE =
  /\b(pomme|poire|banane|orange|citron|mandarine|clementine|avocat|kiwi|mangue|peche|nectarine)s?\b/i;

export function normalizeInvoiceCategory(
  ...candidates: Array<string | null | undefined>
): (typeof INVOICE_CATEGORY_SLUGS)[number] | null {
  for (const candidate of candidates) {
    const normalized = normalize(candidate);

    if (!normalized) continue;

    const exact = CATEGORY_ALIASES[normalized];
    if (exact) return exact;

    for (const [alias, slug] of Object.entries(CATEGORY_ALIASES)) {
      if (normalized.includes(alias)) return slug;
    }
  }

  return null;
}

export function suggestInvoiceStorageLocation({
  category,
  name,
}: {
  category: string | null;
  name: string;
}): string | null {
  const normalizedCategory = normalizeInvoiceCategory(category);
  if (!normalizedCategory) return null;

  if (normalizedCategory === 'fruits-et-legumes') {
    const normalizedName = normalize(name);
    if (REFRIGERATED_PRODUCE.test(normalizedName)) return 'Réfrigérateur';
    if (FRUITIER_PRODUCE.test(normalizedName)) return 'Fruitier';
    return null;
  }

  return STORAGE_BY_CATEGORY[normalizedCategory] ?? null;
}

export function isInvoiceStorageLocation(value: string): boolean {
  return (INVOICE_STORAGE_LOCATIONS as readonly string[]).includes(value);
}

function normalize(value?: string | null): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^\w{2}:/, '')
    .replace(/[_-]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
