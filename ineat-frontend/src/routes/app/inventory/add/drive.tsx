import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/inventory/add/drive')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/inventory/add/drive"!</div>
}
