# Validation mobile de la PWA

Utiliser un build de production servi en HTTPS. Le service worker n'est pas
enregistré par le serveur de développement Vite.

## Android — Chrome

1. Désinstaller INEAT si elle est déjà présente et effacer les données du site.
2. Ouvrir le site dans Chrome et se connecter.
3. Vérifier que le bottom sheet apparaît environ 1,5 seconde après l'arrivée sur
   `/app`.
4. Toucher **Ajouter** et accepter le prompt natif.
5. Ouvrir INEAT depuis l'écran d'accueil et vérifier l'absence du bottom sheet.
6. Refaire le parcours après avoir choisi **Plus tard** et vérifier que le message
   ne réapparaît pas pendant sept jours.

## iPhone/iPad — Safari

1. Supprimer INEAT de l'écran d'accueil si elle est déjà présente et effacer les
   données du site.
2. Ouvrir le site dans Safari et se connecter.
3. Vérifier que le bottom sheet apparaît environ 1,5 seconde après l'arrivée sur
   `/app`.
4. Toucher **Ajouter** et vérifier les instructions `Partager` puis
   `Sur l'écran d'accueil`.
5. Ajouter et ouvrir INEAT depuis l'écran d'accueil, puis vérifier l'affichage
   standalone et l'absence du bottom sheet.
6. Vérifier que la croix et **Plus tard** reportent tous deux le message de sept
   jours dans Safari.

## Régression

- Aucun bottom sheet sur ordinateur.
- Aucun bottom sheet après un simple rechargement d'une session connectée.
- Les appels `/api` et `/auth` ne sont jamais servis depuis le cache du service
  worker.
