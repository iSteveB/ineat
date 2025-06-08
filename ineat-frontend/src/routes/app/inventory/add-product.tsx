import { createFileRoute } from '@tanstack/react-router'
import { AddProductPage } from '@/pages/product/AddProductPage'

export const Route = createFileRoute('/app/inventory/add-product')({
  component: AddProductPage,
})
