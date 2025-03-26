import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/recipes/$recipeId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/recipes/$recipeId"!</div>
}
