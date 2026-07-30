# Métriques du dashboard administrateur

## Périodes

Les périodes prédéfinies couvrent les 7, 30 ou 90 jours précédant l'instant de
la requête. Une période personnalisée est interprétée en UTC, bornes inclusives
pour les dates saisies, et limitée à 366 jours. Les requêtes SQL agrègent les
données par jour et ne chargent pas les lignes métier dans le processus NestJS.

## Utilisateurs

- **Utilisateurs actifs** : utilisateurs possédant au moins une session mise à
  jour pendant la période.
- **Nouvelles inscriptions** : comptes dont `createdAt` appartient à la période.
- **Croissance** : variation des inscriptions par rapport à la période précédente
  de même durée. Si la période précédente vaut zéro, la valeur est 0 % lorsqu'il
  n'y a aucune inscription et 100 % sinon.

## Abonnements

- **Trial actif** : plan `TRIAL`, statut `ACTIVE` et date de fin future.
- **Premium actif** : plan `PREMIUM` actif, ou annulé mais encore valable jusqu'à
  la fin de période.
- **Démarrage de trial** : `trialStartedAt` appartient à la période.
- **Conversion Trial → Premium** : compte Premium avec `trialUsedAt` renseigné
  et `currentPeriodStartedAt` dans la période.
- **Taux de conversion** : conversions divisées par les démarrages de trial de
  la période. Il s'agit d'un indicateur de cohorte simplifié, pas d'une cohorte
  longitudinale.
- **Annulation** : `subscriptionCancelledAt` appartient à la période.

## Usage et opérations

- **Facture traitée** : facture `COMPLETED` ou `VALIDATED` mise à jour pendant la
  période.
- **Échecs** : factures, notifications et webhooks Stripe dont le statut est
  `FAILED` pendant la période.
- **Jobs échoués** : photographie du nombre de jobs BullMQ actuellement échoués ;
  ce compteur n'est pas historique.
- **IA et Drive** : nombre d'événements `UsageEvent` enregistrés pendant la
  période. Le journal est append-only et son écriture est atomique avec
  l'incrément du quota correspondant.

L'historique IA et Drive commence au déploiement de la migration
`add_usage_event`. Aucun backfill n'est fabriqué à partir des compteurs de quota,
car ceux-ci agrègent des périodes différentes et ne permettent pas de retrouver
la date exacte de chaque usage.

Cette définition est la source de vérité des cartes et graphiques administrateur.
