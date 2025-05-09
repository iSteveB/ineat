import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/profile/personal-info/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/app/profile/personal-info/"!</div>
}
