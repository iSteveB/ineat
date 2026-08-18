# Deploiement Production

Cette note decrit le deploiement Railway attendu pour InEat.

## Services Railway

Le depot contient trois services deployables, auxquels s'ajoute Redis:

| Service  | Dossier racine   | Build                                                                      | Start                                              | Health check    |
| -------- | ---------------- | -------------------------------------------------------------------------- | -------------------------------------------------- | --------------- |
| Backend  | `ineat-backend`  | `pnpm install --frozen-lockfile && pnpm prisma generate && pnpm run build` | `pnpm run deploy:start`                            | `/health`       |
| Worker   | `ineat-backend`  | `pnpm install --frozen-lockfile && pnpm prisma generate && pnpm run build` | `pnpm run start:worker`                            | Aucun port HTTP |
| Frontend | `ineat-frontend` | `pnpm install --frozen-lockfile && pnpm run build`                         | `caddy run --config Caddyfile --adapter caddyfile` | `/health`       |

Le service Redis est cree depuis le template Railway dans le meme projet et le
meme environnement. Les services Backend et Worker referencent sa variable sans
copier le secret:

```env
REDIS_URL=${{Redis.REDIS_URL}}
REDIS_KEY_PREFIX=ineat:production
ADMIN_AUDIT_RETENTION_DAYS=365
```

Le basculement du scheduler est controle par service:

- Backend: `NOTIFICATION_SCHEDULER_MODE=disabled` pour couper le timer local;
- Worker: `NOTIFICATION_SCHEDULER_MODE=bullmq` pour enregistrer et traiter les
  jobs planifies;
- rollback: remettre le Backend en `legacy` puis desactiver le Worker. Ne jamais
  laisser `legacy` et `bullmq` actifs durablement en meme temps.

La livraison email possede un basculement distinct. Conserver
`NOTIFICATION_DELIVERY_MODE=legacy` pendant la validation du scheduler, puis
passer Backend et Worker a `bullmq`. En rollback, remettre d'abord le Backend en
`legacy` afin que les nouvelles alertes continuent a etre envoyees.

La concurrence des synchronisations utilisateur peut etre ajustee avec
`NOTIFICATION_WORKER_CONCURRENCY` (5 par defaut, 20 maximum).

### Supervision BullMQ

La route admin authentifiee `GET /admin/queues` retourne uniquement des
agregats par file: jobs en attente, actifs, retardes, termines, echoues, age du
plus ancien job en attente et echecs de la derniere heure. Elle n'expose jamais
le payload des jobs.

Seuils par defaut:

- degrade: 100 jobs en attente, 5 minutes de retard ou 5 echecs par heure;
- critique: 1 000 jobs en attente, 30 minutes de retard ou 20 echecs par heure.

Ils peuvent etre ajustes avec `QUEUE_WARNING_BACKLOG`,
`QUEUE_CRITICAL_BACKLOG`, `QUEUE_WARNING_LAG_MS`, `QUEUE_CRITICAL_LAG_MS`,
`QUEUE_WARNING_FAILURES_PER_HOUR` et
`QUEUE_CRITICAL_FAILURES_PER_HOUR`.

Configurer une alerte externe sur un snapshot `degraded` persistant pendant 10
minutes et une alerte immediate sur `critical`. Les logs worker structurent les
echecs avec le nom de file, le nom du job, son identifiant et la tentative, sans
inclure les donnees utilisateur.

### Diagnostic et replay

1. Verifier `/health`, puis `GET /admin/queues` avec un compte administrateur.
2. Consulter les logs du worker en filtrant `queue.job.failed` et noter la file,
   le job et la derniere erreur.
3. Verifier l'etat PostgreSQL correspondant avant tout replay. Pour une
   livraison, `NotificationDelivery` reste la source de verite.
4. Corriger la cause externe ou applicative avant de republier.
5. Rejouer uniquement un job confirme en echec via
   `POST /admin/queues/:queueName/jobs/:jobId/retry`. La route refuse les files
   inconnues et les jobs qui ne sont pas dans l'etat `failed`. Ne jamais modifier
   directement les cles Redis.
6. Confirmer le retour a `healthy` et l'absence de double livraison. Les cles
   d'idempotence PostgreSQL et Resend doivent rester actives pendant le replay.

En cas de panne Redis, les lectures API continuent de fonctionner depuis
PostgreSQL. Ne pas rebasculer simultanement scheduler et livraisons: appliquer
la sequence de rollback documentee ci-dessus.

Redis reste accessible uniquement par le reseau prive Railway; le TCP Proxy
public doit etre desactive sauf besoin d'administration explicite. PostgreSQL
reste la source de verite des notifications et livraisons.

Le backend execute `prisma migrate deploy` au demarrage via `pnpm run deploy:start`,
puis lance l'API NestJS en production. Les migrations doivent donc etre commitees
avant tout deploiement.

### Déploiement du dashboard administrateur

Le déploiement doit appliquer les migrations avant de démarrer l'API. La
migration `20260730110000_add_usage_event` est additive, mais le backend écrit
un `UsageEvent` dans la même transaction que chaque consommation de quota : un
backend à jour ne doit donc jamais démarrer sur une base non migrée.

Avant d'activer les commandes Stripe en production :

1. vérifier `STRIPE_ENABLED=true` et toutes les variables Stripe requises ;
2. confirmer que les produits et prix appartiennent au même compte Stripe que
   `STRIPE_SECRET_KEY` ;
3. créer puis désactiver un code promotionnel de test depuis le dashboard ;
4. vérifier que Checkout affiche le champ de code promotionnel ;
5. programmer puis retirer l'annulation d'un abonnement de test ;
6. vérifier les entrées correspondantes dans le journal d'audit.

Les statuts Premium ne doivent jamais être corrigés directement dans
PostgreSQL. Toute divergence doit être résolue depuis Stripe puis synchronisée
par webhook. L'ancien endpoint `PATCH /admin/users/:id/subscription-plan` a été
supprimé et doit répondre `404`.

En rollback applicatif, les tables `AdminAuditLog` et `UsageEvent` peuvent être
conservées : leurs migrations sont additives. Ne pas supprimer les événements
d'usage collectés. Un rollback ne doit pas réintroduire la mutation directe des
plans utilisateur.

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
- `RESEND_API_KEY`, cle d'envoi limitee au domaine transactionnel Resend
- `EMAIL_ENABLED=true`
- `EMAIL_FROM=InEat <bonjour@ineat.store>`
- `EMAIL_REPLY_TO=support@ineat.store`
- `RESEND_WEBHOOK_SECRET`, secret `whsec_...` fourni lors de la creation du
  webhook Resend
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CLOUDINARY_AVATAR_PRESET`
- `INVOICE_PROCESSING_MODE=bullmq`
- `INVOICE_ANALYSIS_PROVIDER=openai`

Worker:

- `NODE_ENV=production`
- `DATABASE_URL`, `REDIS_URL` et le meme `REDIS_KEY_PREFIX` que le backend
- `INVOICE_ANALYSIS_PROVIDER=openai`
- `OPENAI_API_KEY_INVOICE`, cle du projet autorise a analyser les factures
- `OPENAI_INVOICE_MODEL=gpt-5.5`
- les variables Cloudinary ne sont pas necessaires au telechargement des PDF
  publics, mais la livraison des fichiers PDF doit etre autorisee dans les
  reglages de securite Cloudinary

Frontend:

- `VITE_API_URL`, pointe vers l'origine backend publique, par exemple
  `https://api.ineat.store`.

## Email Transactionnel Resend

Configuration retenue:

- domaine d'envoi: `ineat.store`;
- region Resend: Irlande (`eu-west-1`);
- expediteur: `InEat <bonjour@ineat.store>`;
- reponses: `support@ineat.store`, boite geree par le service mail LWS;
- tracking des ouvertures et des clics desactive pour les emails
  d'authentification;
- TLS opportuniste pour ne pas bloquer les destinataires ne supportant pas le
  mode force.

DNS attendus:

- DKIM Resend sur `resend._domainkey.ineat.store`;
- SPF et MX de return-path Resend sur `send.ineat.store`;
- DMARC sur `_dmarc.ineat.store`;
- MX de reception du domaine racine conserve vers le service mail LWS. Ne pas
  le remplacer par Resend ou Cloudflare Email Routing.

Le plan gratuit Resend autorise 3 000 emails par mois et 100 emails par jour au
moment de la mise en place. Passer au plan Pro avant d'atteindre regulierement
80 % de l'une de ces limites.

Les emails sont expedies depuis l'Irlande, mais les metadonnees du compte et les
logs Resend sont stockes aux Etats-Unis. Le DPA Resend, ses sous-traitants et les
clauses contractuelles de transfert doivent etre conserves dans le registre des
sous-traitants InEat.

### Emails produit et abonnement

Les digests produit et les emails d'abonnement utilisent le meme transport
Resend que les emails d'authentification. Les familles actives sont :

- digest produit hebdomadaire, actif par defaut le dimanche a 18 h dans le
  fuseau utilisateur ;
- digest quotidien actionnable, desactive par defaut ;
- debut, rappel et fin d'essai Premium ;
- activation, modification, resiliation et echec de paiement Premium ;
- seuils de quota a 80 % et 100 %.

Stripe conserve la responsabilite des recus et factures. Verifier que ses
emails clients sont configures dans le Dashboard Stripe et qu'aucun template
Resend ne duplique ces documents.

Le scheduler des emails d'essai s'execute toutes les heures. La variable
optionnelle `BILLING_EMAIL_INTERVAL_MS` permet de modifier cette frequence,
avec un minimum d'une minute.

### Seuils budgetaires

Deux representations complementaires sont intentionnelles :

- `GET /budget/:budgetId/alerts` calcule sans etat l'avertissement courant
  affiche sur la page Budget. Il doit rester visible apres rechargement tant
  que le pourcentage demeure au-dessus de 75, 90 ou 100 % ;
- le service de notifications persiste et deduplique les occurrences avec les
  references `budget:threshold_75`, `budget:threshold_90` et
  `budget:over_budget`. Il resout l'ancienne occurrence quand le seuil actif
  change ou quand le budget repasse sous 75 %.

Le dernier seuil envoye ne doit donc pas etre ajoute au modele `Budget` : la
table `Notification` est la source de verite pour la livraison, tandis que la
route budget expose uniquement l'etat d'affichage courant.

### Rotation de la cle Resend

1. Creer dans Resend une nouvelle cle limitee a l'envoi depuis `ineat.store`.
2. Remplacer `RESEND_API_KEY` sur le service backend Railway sans supprimer
   l'ancienne cle.
3. Redeployer le backend et envoyer un email de smoke test.
4. Verifier le statut `Delivered` dans Resend et la reception effective.
5. Revoquer seulement ensuite l'ancienne cle dans Resend.

Ne jamais copier une cle Resend dans le depot, les logs, un ticket ou une
capture d'ecran. Les environnements locaux et les tests automatises utilisent
un provider factice tant qu'aucune cle n'est explicitement configuree.

### Webhook Resend

Configurer un webhook vers `https://api.ineat.store/email/webhook` pour les
evenements suivants:

- `email.delivered`;
- `email.delivery_delayed`;
- `email.bounced`;
- `email.complained`;
- `email.failed`;
- `email.suppressed`.

Le backend verifie obligatoirement les trois en-tetes Svix sur le corps brut,
puis conserve l'identifiant d'evenement dans `ResendWebhookEvent`. Une livraison
rejouee est acquittee sans etre traitee une seconde fois. Les rebonds, plaintes,
echecs et suppressions produisent un evenement d'observabilite sans journaliser
l'adresse du destinataire.

Lors d'une rotation, creer d'abord le nouveau webhook et installer son secret
sur Railway. Ne supprimer l'ancien webhook qu'apres un evenement de test signe
et acquitte en production.

## Verification Apres Deploiement

1. Verifier que le backend repond `200` sur `/health`.
2. Verifier que le frontend repond `200` sur `/health`.
3. Ouvrir le frontend public et confirmer que les appels ciblent directement
   `${VITE_API_URL}`.
4. Controler les logs backend pour confirmer que `prisma migrate deploy` s'est
   termine avant le demarrage NestJS.
5. Tester un parcours authentifie simple puis un upload d'avatar si les secrets
   Cloudinary sont disponibles.
6. Envoyer un email transactionnel de smoke test, verifier son statut dans
   Resend et confirmer sa reception sans mention `via` inattendue.
7. Creer un compte avec une adresse inutilisee et verifier qu'aucune session
   applicative n'est disponible avant validation de l'adresse.
8. Ouvrir le lien recu: confirmer la redirection vers `/verify-email`, la
   creation de session, puis la reception unique du bienvenue.
9. Rejouer le lien et utiliser le bouton de renvoi: verifier les messages neutres,
   l'absence de second bienvenue et la limite de trois renvois par minute.
10. Dans Resend, confirmer les evenements de livraison et leur acquittement par
    `POST /email/webhook`. Une requete sans signature doit recevoir `400`.

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
5. Surveiller les logs pour les erreurs d'origine/CSRF Better Auth. Les origines
   autorisees doivent couvrir `https://ineat.store`, `FRONTEND_URL` et
   `CORS_ORIGIN`.

Les flux web utilisent exclusivement les sessions Better Auth. Les anciens JWT,
cookies `auth_token`, strategies Passport et endpoints Nest `login/register`
ont ete retires.

## Rollback

1. Pour couper uniquement l'email, definir `EMAIL_ENABLED=false` sur le backend
   puis redeployer. La verification obligatoire et les callbacks d'envoi sont
   alors suspendus ensemble, afin de ne pas bloquer les nouvelles connexions.
2. Redeployer le dernier commit stable depuis Railway ou repointer la branche sur
   le commit stable.
3. Si une migration destructive est en cause, restaurer un backup PostgreSQL avant
   de redeployer le code compatible.
4. Verifier `/health` backend et frontend.
5. Controler les logs backend apres rollback.

Ne pas modifier manuellement le schema de production hors migration Prisma
commitee, sauf procedure de recuperation documentee.
