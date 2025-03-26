import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/inventory/scan-product')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/inventory/scan-product"!</div>
}
