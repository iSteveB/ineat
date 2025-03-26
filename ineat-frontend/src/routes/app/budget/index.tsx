import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/budget/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/budget/"!</div>
}
