interface PresentableProduct {
	imageUrl?: string | null;
	category?: { slug?: string | null } | null;
}

const CATEGORY_IMAGES: Record<string, string> = {
	'fruits-et-legumes': '/images/categories/fruits-et-legumes.svg',
	'viandes-et-poissons': '/images/categories/viandes-et-poissons.svg',
};

const NOVA_LABELS: Record<string, string> = {
	GROUP_1: '1 - Aliments non transformés ou transformés minimalement',
	GROUP_2: '2 - Ingrédients culinaires transformés',
	GROUP_3: '3 - Aliments transformés',
	GROUP_4: '4 - Produits alimentaires ultra-transformés',
};

export function getProductImageUrl(product: PresentableProduct): string | null {
	if (product.imageUrl) return product.imageUrl;
	const slug = product.category?.slug;
	return slug ? CATEGORY_IMAGES[slug] ?? null : null;
}

export function formatNovaScore(score?: string | null): string {
	if (!score) return 'Information non disponible';
	return NOVA_LABELS[score] ?? score;
}
