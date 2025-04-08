import { http, HttpResponse } from 'msw';

// Interface pour le type de produit
interface Product {
	id: string;
	name: string;
	quantity: number;
	category: string;
	expiryDate: string;
}

// Interface pour les données d'ajout d'un produit
interface AddProductRequest {
	name: string;
	quantity: number;
	category: string;
	expiryDate: string;
	[key: string]: unknown; // Pour permettre d'autres propriétés éventuelles
}

// Définition des handlers qui intercepteront les requêtes API
export const handlers = [
	// Exemple d'interception d'une requête GET
	http.get(`${import.meta.env.VITE_API_URL}/products`, () => {
		const products: Product[] = [
			{
				id: '1',
				name: 'Pommes',
				quantity: 5,
				category: 'Fruits',
				expiryDate: '2023-12-31',
			},
			{
				id: '2',
				name: 'Lait',
				quantity: 1,
				category: 'Produits laitiers',
				expiryDate: '2023-12-15',
			},
		];
		return HttpResponse.json(products);
	}),

	// Exemple d'interception d'une requête POST
	http.post(
		`${import.meta.env.VITE_API_URL}/inventory/add`,
		async ({ request }) => {
			const data = (await request.json()) as AddProductRequest;
			const newProduct: Product = {
				...data,
				id: '3',
			};
			return HttpResponse.json(newProduct, { status: 201 });
		}
	),
];
