# Deploiement Production

Cette note decrit le deploiement Railway attendu pour InEat.

## Services Railway

Le depot contient deux services deployables:

| Service | Dossier racine | Build | Start | Health check |
| --- | --- | --- | --- | --- |
| Backend | `ineat-backend` | `pnpm install --frozen-lockfile && pnpm prisma generate && pnpm run build` | `pnpm run deploy:start` | `/health` |
| Frontend | `ineat-frontend` | `pnpm install --frozen-lockfile && pnpm run build` | `caddy run --config Caddyfile --adapter caddyfile` | `/health` |

Le backend execute `prisma migrate deploy` au demarrage via `pnpm run deploy:start`,
puis lance l'API NestJS en production. Les migrations doivent donc etre commitees
avant tout deploiement.

## Variables Production

Backend:

- `NODE_ENV=production`
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `COOKIE_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGIN`
- `CLIENT_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` si OAuth est actif
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CLOUDINARY_AVATAR_PRESET`, `CLOUDINARY_RECEIPT_PRESET`
- `ANTHROPIC_API_KEY` et/ou `OPENAI_API_KEY` pour l'analyse LLM des tickets
- Variables Mindee si ce provider OCR est active

Frontend:

- `VITE_API_URL`, sans suffixe `/api`, pointe vers l'origine backend publique.

## Verification Apres Deploiement

1. Verifier que le backend repond `200` sur `/health`.
2. Verifier que le frontend repond `200` sur `/health`.
3. Ouvrir le frontend public et confirmer que les appels API ciblent
   `${VITE_API_URL}/api`.
4. Controler les logs backend pour confirmer que `prisma migrate deploy` s'est
   termine avant le demarrage NestJS.
5. Tester un parcours authentifie simple puis un upload receipt si les secrets
   Cloudinary et LLM sont disponibles.

## Rollback

1. Redeployer le dernier commit stable depuis Railway ou repointer la branche sur
   le commit stable.
2. Si une migration destructive est en cause, restaurer un backup PostgreSQL avant
   de redeployer le code compatible.
3. Verifier `/health` backend et frontend.
4. Controler les logs `receipt-processing` Redis/Bull apres rollback si des jobs
   etaient en cours.

Ne pas modifier manuellement le schema de production hors migration Prisma
commitee, sauf procedure de recuperation documentee.
