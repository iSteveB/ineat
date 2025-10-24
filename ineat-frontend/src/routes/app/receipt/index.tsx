import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/receipt/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/receipt/"!</div>
}
