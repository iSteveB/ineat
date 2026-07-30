# Console d'exploitation administrateur

La page **Opérations** affiche toutes les files BullMQ, leur état global, leur
backlog, leur latence la plus ancienne et leurs échecs récents. Le relevé est
rafraîchi automatiquement toutes les quinze secondes et peut être actualisé à
la demande.

Pour les cinquante derniers jobs échoués de chaque file, l'API ne transmet que
des métadonnées d'exploitation : identifiant, nom, nombre de tentatives, date et
raison d'échec tronquée à 300 caractères. Le payload métier du job n'est jamais
exposé au navigateur afin d'éviter la fuite de données personnelles, de jetons
ou de contenu de factures.

Un administrateur peut relancer uniquement un job dont l'état BullMQ est encore
`failed`. La commande demande une confirmation et une justification. Elle est
enregistrée dans `AdminAuditLog`. Pour une livraison d'e-mail persistée, le
compteur de tentatives est remis dans un état rejouable avant le retry BullMQ.

Les seuils `healthy`, `degraded` et `critical` restent configurables par les
variables `QUEUE_*` documentées dans la configuration backend.
