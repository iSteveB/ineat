import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/profile/settings')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/profile/settings"!</div>
}
