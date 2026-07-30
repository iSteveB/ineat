# Rapport de déploiement du dashboard administrateur — 31 juillet 2026

## Version

- branche : `develop` ;
- commit applicatif : `ebe8ee4` ;
- environnement Railway : `production` (EU West).

## Déploiements Railway

| Service | Déploiement | Résultat |
| --- | --- | --- |
| Backend | `67bac9dc-0662-467c-a65d-1ae353a0e63f` | SUCCESS |
| Worker | `aadee356-116b-45c1-9b47-367ec1375bd4` | SUCCESS |
| Frontend | `05749d8e-9caf-4436-a874-d2d28c73d42b` | SUCCESS |

PostgreSQL et Redis sont Online dans le même environnement.

## Preuves vérifiées

- les 35 migrations Prisma ont été détectées ;
- `20260730080000_add_admin_audit_log` et
  `20260730110000_add_usage_event` ont été appliquées avec succès avant le
  démarrage NestJS ;
- les routes dashboard, utilisateurs, promotions, abonnements, opérations,
  incidents et journal d'audit sont enregistrées par NestJS ;
- les six workers BullMQ sont prêts et les schedulers sont activés ;
- le health check Railway du frontend reçoit un statut HTTP 200 ;
- aucun HTTP 5xx n'a été observé immédiatement après les déploiements ;
- les trois services sont restés Online pendant une surveillance de plus de 30
  minutes, sans HTTP 5xx backend/frontend ni erreur worker ;
- validation locale avant déploiement : 48 suites / 283 tests backend et
  42 fichiers / 219 tests frontend, avec les deux builds réussis.

La recette authentifiée du dashboard a été confirmée par le propriétaire du
produit le 31 juillet 2026 : navigation, chargement des rubriques et données
administrateur fonctionnels en production.

## Limite de la recette automatisée

L'environnement d'automatisation ne résolvait pas les domaines publics
`ineat.store` et `api.ineat.store` au moment de la recette. Les contrôles
authentifiés ont donc été confirmés par le propriétaire depuis un navigateur
disposant d'un accès DNS normal. Les mutations sensibles suivantes restent des
smoke tests optionnels à n'exécuter qu'avec des données dédiées :

1. création puis désactivation d'un code Stripe de test ;
2. programmation puis retrait de l'annulation d'un abonnement de test ;
3. contrôle des entrées correspondantes dans le journal d'audit.

Ces actions Stripe ne doivent être exécutées qu'avec des objets de test ou des
comptes explicitement dédiés à la recette.
