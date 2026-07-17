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
- `BETTER_AUTH_SECRET`, genere aleatoirement avec au moins 32 caracteres
- `BETTER_AUTH_URL`, origine publique du backend sans suffixe `/auth`
- `FRONTEND_URL=https://ineat.store`
- `CORS_ORIGIN=https://ineat.store` (plusieurs origines peuvent etre separees
  par des virgules pendant une migration de domaine)
- `PASSWORD_RESET_WEBHOOK_URL`, webhook d'envoi email pour les liens de
  reinitialisation de mot de passe
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` si Google OAuth Better Auth est actif
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CLOUDINARY_AVATAR_PRESET`

Frontend:

- `VITE_API_URL`, pointe vers l'origine backend publique, par exemple
  `https://api.ineat.store`.

## Verification Apres Deploiement

1. Verifier que le backend repond `200` sur `/health`.
2. Verifier que le frontend repond `200` sur `/health`.
3. Ouvrir le frontend public et confirmer que les appels ciblent directement
   `${VITE_API_URL}`.
4. Controler les logs backend pour confirmer que `prisma migrate deploy` s'est
   termine avant le demarrage NestJS.
5. Tester un parcours authentifie simple puis un upload d'avatar si les secrets
   Cloudinary sont disponibles.

## Auth Better Auth

Avant mise en production:

1. Verifier que la migration Prisma Better Auth est presente et appliquee par
   `prisma migrate deploy`: tables `session`, `account`, `verification` et
   colonnes utilisateur `name`, `emailVerified`.
2. Confirmer que `BETTER_AUTH_URL` correspond exactement a l'origine publique du
   backend, par exemple `https://ineat-backend-production.up.railway.app`.
   Le domaine `https://ineat.store` est celui du frontend et ne doit etre utilise
   ici que si l'API est effectivement servie sur cette meme origine.
3. Confirmer que le frontend utilise l'origine seule dans `VITE_API_URL`, afin
   que le client Better Auth cible `${VITE_API_URL}/auth`.
4. Tester `sign-in/email`, `sign-up/email`, `sign-out` et `/auth/profile`
   depuis le frontend avec cookies `Secure` et `SameSite=None` en production.
5. Tester Google OAuth via Better Auth si `GOOGLE_CLIENT_ID` et
   `GOOGLE_CLIENT_SECRET` sont configures. Le callback attendu cote Google est
   `/auth/callback/google`.
6. Surveiller les logs pour les erreurs d'origine/CSRF Better Auth. Les origines
   autorisees doivent couvrir `https://ineat.store`, `FRONTEND_URL` et
   `CORS_ORIGIN`.

Les flux web utilisent exclusivement les sessions Better Auth. Les anciens JWT,
cookies `auth_token`, strategies Passport et endpoints Nest `login/register`
ont ete retires.

## Rollback

1. Redeployer le dernier commit stable depuis Railway ou repointer la branche sur
   le commit stable.
2. Si une migration destructive est en cause, restaurer un backup PostgreSQL avant
   de redeployer le code compatible.
3. Verifier `/health` backend et frontend.
4. Controler les logs backend apres rollback.

Ne pas modifier manuellement le schema de production hors migration Prisma
commitee, sauf procedure de recuperation documentee.
