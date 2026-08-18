# Recette métier — facture vers recette

Date du test : 16 août 2026
Environnement : `developpement` (`dev.ineat.store`)

## Résultat

Le parcours déployé est validé de bout en bout :

1. import d'une facture PDF synthétique ;
2. analyse asynchrone par `ineat-worker-dev` avec `gpt-5.5` ;
3. extraction de 4 lignes pour un total exact de 9,80 € ;
4. création de 4 produits d'inventaire et de 4 dépenses ;
5. génération et sauvegarde de la recette « Spaghetti aux courgettes sautées et fromage fondu » ;
6. action « Marquer comme fait » avec retrait sélectif de 3 produits ;
7. inventaire passé de 18 à 15 produits ;
8. budget inchangé après consommation : 9,80 € dépensés, 440,20 € restants sur 450 €.

## Incidents révélés et corrections

- Le worker de développement ne disposait pas initialement d'une clé OpenAI valide.
- Le mode BullMQ a révélé que le worker devait retélécharger le PDF depuis Cloudinary, contrairement au traitement synchrone qui utilisait directement le buffer reçu par le backend.
- La livraison des PDF était désactivée dans les réglages de sécurité Cloudinary et renvoyait HTTP 401.
- Les nouveaux PDF Cloudinary sont désormais enregistrés avec une extension `.pdf`.
- Le worker télécharge le document, vérifie sa signature `%PDF-`, puis l'envoie à OpenAI en `file_data`.

## Vérifications automatisées liées au correctif

- 48 tests ciblés invoice : réussis ;
- build backend : réussi ;
- déploiements backend et worker de développement : réussis.
