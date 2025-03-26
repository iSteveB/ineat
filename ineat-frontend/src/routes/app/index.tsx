import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/')({
  component: Dashboard,
})

function Dashboard() {
  return <div>Hello "/app/"!</div>
}
