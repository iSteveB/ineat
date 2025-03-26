import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/inventory/import-product')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/inventory/import-product"!</div>
}
