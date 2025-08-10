import { createFileRoute } from '@tanstack/react-router';
import ProductDetailPage from '@/pages/product/ProductDetailPage';


// Définition de la route avec le paramètre productId
export const Route = createFileRoute('/app/inventory/$productId')({
	component: ProductDetailPage,
});


