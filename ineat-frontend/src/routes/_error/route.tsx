import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_error')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_error"!</div>
}
