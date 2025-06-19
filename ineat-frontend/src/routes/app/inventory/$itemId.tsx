import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/inventory/$itemId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/inventory/$itemId"!</div>
}
