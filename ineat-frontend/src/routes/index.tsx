// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Link } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  return (
    <div className="p-4 max-w-5xl mx-auto">
      <section className="py-12">
        <h1 className="text-4xl font-bold mb-4">Bienvenue sur InEat</h1>
        <p className="text-xl mb-8">
          Gérez vos stocks alimentaires, réduisez le gaspillage et économisez de l'argent
        </p>
        <div className="flex gap-4">
          <Link to="/login" className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Se connecter
          </Link>
          <Link to="/register" className="px-6 py-3 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50">
            S'inscrire
          </Link>
        </div>
      </section>
      
      {/* TO DO : Autres sections de la landing page */}
    </div>
  )
}