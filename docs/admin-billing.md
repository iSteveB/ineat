# Administration Stripe

## Principe de sécurité

Le dashboard administrateur ne modifie jamais directement les champs
`subscriptionPlan` ou `subscriptionStatus`. Stripe reste la source de vérité des
abonnements payants et les webhooks mettent ensuite InEat à jour. Les trials ne
sont ni créés, ni prolongés, ni réattribués par un administrateur.

## Promotions

La page **Abonnements** permet de consulter, créer et désactiver des codes
promotionnels Stripe. La création produit un coupon Stripe, puis le code qui le
référence. En cas d'échec du second appel, le coupon nouvellement créé est
supprimé pour ne pas laisser de configuration orpheline.

Les paramètres exposés sont volontairement limités : pourcentage ou montant
fixe en euros, durée, expiration, plafond d'utilisations, première transaction
et restriction facultative à un client Stripe. Une remise créée n'est pas
éditée : elle doit être désactivée puis remplacée. Stripe conserve la donnée de
référence ; aucune copie métier locale n'est maintenue.

Stripe Checkout accepte les codes grâce à `allow_promotion_codes: true`.

## Abonnements

Deux commandes seulement sont proposées :

- programmer une annulation à la fin de la période déjà payée ;
- retirer cette annulation tant que l'abonnement n'est pas terminé.

L'annulation immédiate, la reprise d'un abonnement en pause et la recréation
d'un abonnement terminé ne sont pas exposées. Chaque commande exige une
confirmation et une justification, puis crée une entrée dans `AdminAuditLog`.
