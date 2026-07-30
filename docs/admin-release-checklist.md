# Recette et mise en production du dashboard administrateur

## Contrôles automatisés

- lint backend et frontend sans erreur ;
- build NestJS et build Vite réussis ;
- suites Jest et Vitest intégralement vertes ;
- migrations Prisma générées et commitées ;
- aucune route du dashboard ne pointe encore vers un placeholder.

## Sécurité et droits

- un utilisateur `USER` reçoit un refus sur toutes les routes `/admin/*` ;
- un `ADMIN` peut consulter le dashboard indépendamment de son plan produit ;
- le dernier administrateur ne peut pas être rétrogradé ;
- aucun contrôle ne permet de modifier `FREE`, `TRIAL` ou `PREMIUM` ;
- toute mutation exige une justification d'au moins trois caractères ;
- les créations/désactivations Stripe, annulations et retries sont audités ;
- les payloads BullMQ et les clés Stripe ne sont jamais envoyés au frontend.

## Recette fonctionnelle

1. Vérifier les périodes 7, 30, 90 jours et une période personnalisée.
2. Rechercher, filtrer et paginer les utilisateurs, puis ouvrir un détail.
3. Changer un rôle après confirmation et retrouver l'entrée d'audit.
4. Créer un code promotionnel Stripe limité, le tester dans Checkout, puis le
   désactiver depuis le dashboard.
5. Programmer une annulation Premium en fin de période, confirmer la réception
   du webhook, puis retirer l'annulation.
6. Vérifier les cartes de santé des files et relancer un job de test échoué.
7. Filtrer le journal par action, ressource, administrateur et période, puis
   contrôler les valeurs avant/après.

## Responsive et accessibilité

- tester 375 px, 768 px et 1280 px ;
- naviguer au clavier dans le menu, les filtres, tableaux et dialogues ;
- confirmer la présence d'un libellé accessible sur chaque champ ;
- vérifier le focus et l'annonce des dialogues de confirmation ;
- vérifier que l'état n'est jamais communiqué uniquement par la couleur ;
- tester les états chargement, vide, erreur et succès.

## Surveillance après déploiement

- suivre `/health`, les erreurs 5xx `/admin/*` et les webhooks Stripe échoués ;
- vérifier que les nouvelles consommations produisent des `UsageEvent` ;
- surveiller la santé BullMQ pendant au moins trente minutes ;
- contrôler que chaque commande manuelle possède une entrée `AdminAuditLog` ;
- ne pas fabriquer de backfill IA/Drive à partir des anciens quotas.
