import { ReactNode } from 'react'

interface MainLayoutProps {
  children: ReactNode
}

export default function MainLayout({ children }: MainLayoutProps) {
  // Contenu du layout comme précédemment
  return (
    <div className="min-h-screen flex flex-col">
      {/* En-tête global */}
      <header className="bg-white border-b">
        {/* ... */}
      </header>

      {/* Contenu principal */}
      <main className="flex-grow">
        {children}
      </main>

      {/* Pied de page global */}
      <footer className="bg-gray-100 py-6">
        {/* ... */}
      </footer>
    </div>
  )
}