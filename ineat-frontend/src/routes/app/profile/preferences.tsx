import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/profile/preferences')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/profile/preferences"!</div>
}
