import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/profile/security/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/profile/security/"!</div>
}
