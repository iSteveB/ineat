import InventoryPage from "@/pages/Inventory/InventoryPage";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/app/inventory/')({
	component: InventoryPage,
});
	