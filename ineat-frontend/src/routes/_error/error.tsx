import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_error/error')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_error/error"!</div>
}
