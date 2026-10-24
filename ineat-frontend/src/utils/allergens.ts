/**
 * Repérage indicatif des allergènes majeurs (règlement UE 1169/2011) dans une liste
 * d'ingrédients. Simple aide à la lecture : l'étiquette du produit fait foi.
 */
const ALLERGEN_GROUPS: { label: string; keywords: string[] }[] = [
	{
		label: 'Gluten',
		keywords: ['gluten', 'blé', 'seigle', 'orge', 'avoine', 'épeautre', 'kamut'],
	},
	{
		label: 'Lait',
		keywords: ['lait', 'lactose', 'crème', 'beurre', 'fromage', 'lactosérum', 'caséine', 'babeurre'],
	},
	{ label: 'Œufs', keywords: ['oeuf'] },
	{ label: 'Arachides', keywords: ['arachide', 'cacahuète', 'cacahouète'] },
	{
		label: 'Fruits à coque',
		keywords: ['noix', 'amande', 'noisette', 'pistache', 'cajou', 'pécan', 'macadamia'],
	},
	{ label: 'Soja', keywords: ['soja', 'soya'] },
	{ label: 'Poisson', keywords: ['poisson', 'thon', 'saumon', 'cabillaud', 'anchois', 'sardine'] },
	{ label: 'Crustacés', keywords: ['crustacé', 'crevette', 'crabe', 'homard', 'langoustine'] },
	{
		label: 'Mollusques',
		keywords: ['mollusque', 'moule', 'huître', 'calmar', 'calamar', 'seiche', 'poulpe'],
	},
	{ label: 'Céleri', keywords: ['céleri'] },
	{ label: 'Moutarde', keywords: ['moutarde'] },
	{ label: 'Sésame', keywords: ['sésame'] },
	{ label: 'Sulfites', keywords: ['sulfite', 'disulfite', 'métabisulfite', 'anhydride sulfureux'] },
	{ label: 'Lupin', keywords: ['lupin'] },
];

/**
 * Expressions qui contiennent un mot-clé d'une autre catégorie, traitées avant les mots seuls :
 * « noix de coco » n'est pas un fruit à coque réglementaire, « beurre de cacao » n'est pas du lait,
 * mais « noix de Saint-Jacques » est un mollusque et « beurre de cacahuète » une arachide.
 */
const COMPOUND_TERMS: { phrase: string; label: string | null }[] = [
	{ phrase: 'noix de coco', label: null },
	{ phrase: 'noix de muscade', label: null },
	{ phrase: 'lait de coco', label: null },
	{ phrase: 'crème de coco', label: null },
	{ phrase: 'beurre de cacao', label: null },
	{ phrase: 'beurre de karité', label: null },
	{ phrase: 'crème de marrons', label: null },
	{ phrase: 'lait d’amande', label: 'Fruits à coque' },
	{ phrase: "lait d'amande", label: 'Fruits à coque' },
	{ phrase: 'beurre de cacahuète', label: 'Arachides' },
	{ phrase: 'noix de saint-jacques', label: 'Mollusques' },
];

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Mot entier, au singulier ou au pluriel (s/x), sans toucher aux mots plus longs (« laitue », « moulé »). */
const wordPattern = (keyword: string) =>
	new RegExp(`(?<!\\p{L})${escapeRegExp(keyword)}(?:s|x)?(?!\\p{L})`, 'u');

const normalize = (value: string) => value.toLocaleLowerCase('fr-FR').replace(/œ/g, 'oe');

const GROUP_PATTERNS = ALLERGEN_GROUPS.map(({ label, keywords }) => ({
	label,
	patterns: keywords.map((keyword) => wordPattern(normalize(keyword))),
}));

const COMPOUND_PATTERNS = COMPOUND_TERMS.map(({ phrase, label }) => ({
	label,
	pattern: new RegExp(wordPattern(normalize(phrase)).source, 'gu'),
}));

/** Renvoie les libellés des allergènes repérés, sans doublon, dans l'ordre réglementaire. */
export function detectAllergens(ingredients: string): string[] {
	// Les expressions composées sont retirées du texte avant la recherche des mots seuls ;
	// le reste est conservé : « beurre de cacao, beurre » signale bien le lait.
	let text = normalize(ingredients);
	const found = new Set<string>();
	for (const { label, pattern } of COMPOUND_PATTERNS) {
		if (label && pattern.test(text)) found.add(label);
		pattern.lastIndex = 0;
		text = text.replace(pattern, ' ');
	}
	for (const { label, patterns } of GROUP_PATTERNS) {
		if (patterns.some((pattern) => pattern.test(text))) found.add(label);
	}

	return ALLERGEN_GROUPS.map(({ label }) => label).filter((label) => found.has(label));
}
