# Console d'exploitation administrateur

La page **Opérations** affiche toutes les files BullMQ, leur état global, leur
backlog, leur latence la plus ancienne et leurs échecs récents. Le relevé est
rafraîchi automatiquement toutes les quinze secondes et peut être actualisé à
la demande.

L'explorateur permet aussi de consulter les jobs `waiting`, `active` et `failed`
de chaque file avec une pagination côté serveur. L'API ne transmet que des
métadonnées d'exploitation : identifiant, nom, état, nombre de tentatives et
dates techniques. Pour un échec, sa raison est nettoyée puis tronquée à 300
caractères. Le payload métier du job n'est jamais exposé au navigateur afin
d'éviter la fuite de données personnelles, de jetons ou de contenu de factures.

La section **Incidents applicatifs** fournit quatre vues paginées : analyses de
factures échouées, notifications échouées, webhooks Stripe échoués et événements
Resend de rejet ou de plainte. Chaque requête Prisma utilise une liste blanche
de champs. Elle exclut notamment les destinataires, contenus d'e-mails, données
de facture, payloads de webhook et identifiants utilisateur. Les erreurs sont
nettoyées avant leur retour au navigateur.

Un administrateur peut relancer uniquement un job dont l'état BullMQ est encore
`failed`. La commande demande une confirmation et une justification. Elle est
enregistrée dans `AdminAuditLog`. Pour une livraison d'e-mail persistée, le
compteur de tentatives est remis dans un état rejouable avant le retry BullMQ.

Les seuils `healthy`, `degraded` et `critical` restent configurables par les
variables `QUEUE_*` documentées dans la configuration backend.
