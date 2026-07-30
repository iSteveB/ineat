# Journal d'audit administrateur

Le journal est disponible en lecture seule depuis la page **Journal d'audit**.
Il peut être filtré côté serveur par administrateur, action exacte, type de
ressource, identifiant de ressource et période, puis trié chronologiquement. La
pagination accepte 10 à 100 entrées par page.

Chaque ligne expose l'identité de l'administrateur, la commande, la ressource,
la justification, la date et, lorsqu'elles existent, les valeurs avant/après.
L'adresse IP et l'identifiant de session sont visibles uniquement dans le
panneau de détail réservé aux administrateurs.

Les entrées `AdminAuditLog` ne disposent d'aucune commande de modification ou
de suppression dans l'API d'administration. Les actions Stripe et BullMQ sont
auditées après confirmation explicite de l'administrateur.
