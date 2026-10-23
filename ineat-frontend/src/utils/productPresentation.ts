interface PresentableProduct {
	imageUrl?: string | null;
	category?: { slug?: string | null } | null;
}

const CATEGORY_IMAGES: Record<string, string> = {
	'fruits-et-legumes': '/images/categories/fruits-et-legumes.svg',
	'viandes-et-poissons': '/images/categories/viandes-et-poissons.svg',
};

export function getProductImageUrl(product: PresentableProduct): string | null {
	if (product.imageUrl) return product.imageUrl;
	const slug = product.category?.slug;
	return slug ? CATEGORY_IMAGES[slug] ?? null : null;
}
