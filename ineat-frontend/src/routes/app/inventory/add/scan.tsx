import { createFileRoute } from '@tanstack/react-router'
import ScannerPage from '@/pages/Inventory/ScannerPage'

export const Route = createFileRoute('/app/inventory/add/scan')({
  component: ScannerPage,
})