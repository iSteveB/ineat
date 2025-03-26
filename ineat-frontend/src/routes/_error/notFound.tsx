import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_error/notFound')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_error/notFound"!</div>
}
