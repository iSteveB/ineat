# Journal d'audit administrateur

Le journal est disponible en lecture seule depuis la page **Journal d'audit**.
Il peut être filtré côté serveur par administrateur, action exacte, type de
ressource, identifiant de ressource et période, puis trié chronologiquement. La
pagination accepte 10 à 100 entrées par page.

Chaque ligne expose l'identité de l'administrateur, la commande, la ressource,
la justification, la date et, lorsqu'elles existent, les valeurs avant/après.
L'adresse IP et l'identifiant de session sont visibles uniquement dans le
panneau de détail réservé aux administrateurs.
Lorsqu'une entrée cible une ressource `USER`, ce panneau propose un accès direct
à la fiche administrateur de l'utilisateur concerné.

Les entrées `AdminAuditLog` ne disposent d'aucune commande de modification ou
de suppression dans l'API d'administration. Les actions Stripe et BullMQ sont
auditées après confirmation explicite de l'administrateur.

## Politique de conservation

Les entrées sont conservées pendant **365 jours glissants** par défaut. Un job
BullMQ système s'exécute quotidiennement à 03:30 UTC et supprime définitivement
les entrées plus anciennes. La durée peut être adaptée avec
`ADMIN_AUDIT_RETENTION_DAYS` (entre 30 et 3 650 jours), à condition que le choix
soit documenté et justifié par la finalité du traitement. Il n'existe aucune
commande de purge manuelle dans le dashboard.

Cette politique suit la recommandation générale de la CNIL de conserver les
journaux entre six mois et un an. Une conservation supérieure doit répondre à
un besoin spécifique documenté (obligation légale, contentieux, contrôle interne
ou analyse post-incident). Les utilisateurs habilités doivent être informés de
la journalisation et de sa durée de conservation.

Références :

- [CNIL — Sécurité : tracer les opérations](https://www.cnil.fr/fr/securite-tracer-les-operations)
- [RGPD, article 5 — limitation de la conservation](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX%3A32016R0679)
