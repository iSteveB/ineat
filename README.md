# InEat

InEat est une application de gestion des stocks alimentaires pour particuliers. Elle aide a suivre les produits disponibles, les dates de peremption, les achats et le budget alimentaire.

## Structure

Le depot est organise en deux applications principales:

| Dossier | Role | Stack |
| --- | --- | --- |
| `ineat-backend` | API REST, authentification, inventaire et budget | NestJS, Prisma, PostgreSQL, Redis/Bull |
| `ineat-frontend` | Interface utilisateur SPA | React, Vite, TanStack Router, TanStack Query, Zustand |

## Fonctionnalites

- Authentification email/mot de passe et Google OAuth.
- Gestion de profil utilisateur, avatar et preferences.
- Gestion d'inventaire alimentaire avec dates d'achat, peremption, prix et lieu de stockage.
- Recherche et ajout de produits, avec donnees enrichies OpenFoodFacts cote frontend.
- Budget mensuel et depenses, dont depenses creees depuis les achats alimentaires.
- Notifications, recettes et suggestions en cours de structuration.

## Prerequis

- Node.js `>=20`
- pnpm `10.7.0` ou compatible
- PostgreSQL
- Redis, requis pour la configuration Bull et les traitements asynchrones
- Comptes/API externes selon les fonctionnalites activees:
  - Cloudinary pour les uploads
  - Google OAuth pour la connexion sociale

## Lancement Local

Installer les dependances dans chaque application:

```bash
cd ineat-backend
pnpm install

cd ../ineat-frontend
pnpm install
```

Configurer ensuite les fichiers d'environnement:

- Backend: copier `ineat-backend/.env.example` vers `ineat-backend/.env.development`
- Frontend: copier `ineat-frontend/.env.example` vers `ineat-frontend/.env`

Voir les README de chaque application pour la liste des variables.

Demarrer le backend:

```bash
cd ineat-backend
pnpm run prisma:migrate
pnpm run dev
```

Demarrer le frontend:

```bash
cd ineat-frontend
pnpm run dev
```

Par defaut:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Swagger backend en developpement: `http://localhost:3000/docs`
- Health check: `http://localhost:3000/health`

## Commandes Utiles

Depuis la racine, les commandes de validation reproduisent les jobs CI:

```bash
pnpm run ci:frontend
pnpm run ci:backend
pnpm run ci
```

La validation backend utilise une `DATABASE_URL` factice pour `prisma generate`
et les tests unitaires. Elle ne lance pas de migration ni de connexion a une
base reelle.

Backend:

```bash
cd ineat-backend
pnpm run dev
pnpm run build
pnpm run lint        # corrige automatiquement
pnpm run lint:check  # verification CI sans modification
pnpm run test
pnpm run test:e2e
pnpm run prisma:migrate
pnpm run prisma:seed
```

Frontend:

```bash
cd ineat-frontend
pnpm run dev
pnpm run build
pnpm run lint
pnpm run test:run
pnpm run preview
```

## Architecture Produit

Le coeur produit repose sur ce flux:

1. L'utilisateur ajoute ou scanne des produits dans son inventaire.
2. Les produits alimentent les widgets du dashboard: stock, produits recents, produits proches de peremption, score global.
3. Les prix d'achat peuvent creer des depenses et impacter le budget mensuel.

## Documentation Detaillee

- Backend: `ineat-backend/README.md`
- Frontend: `ineat-frontend/README.md`
- Deploiement production: `docs/production-deployment.md`

## Notes De Developpement

- Le backend charge `.env.${NODE_ENV}`. En developpement, il attend donc `.env.development`.
- `prisma generate` exige `DATABASE_URL`, meme pour un build sans connexion effective.
- Les routes backend sont exposees directement a la racine du domaine API.
- Les routes `/app` du frontend sont protegees par verification d'authentification.
