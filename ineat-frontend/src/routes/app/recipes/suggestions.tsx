import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/recipes/suggestions')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/recipes/suggestions"!</div>
}
