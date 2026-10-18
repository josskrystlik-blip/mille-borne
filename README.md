# ⚡ Mille Bornes Turbo

Un compteur de kilomètres ludique pour jouer au **Mille Bornes** avec les enfants.
Chaque joueur a sa voiture de course qui avance sur une route du désert, de borne en borne,
jusqu'au drapeau à damier : on *voit* l'avancement au lieu de faire des additions.

## Comment jouer

1. **Combien de pilotes ?** Choisir de 2 à 6 joueurs, taper les prénoms et la couleur de chaque voiture.
2. **Distance** : 1000 km (règle classique) ou 700 km (course courte).
3. **C'est parti !** Feu rouge, 3-2-1… partez !
4. Quand un joueur pose une carte étape, on touche la même carte à l'écran :
   🐌 25 · 🦆 50 · 🦋 75 · 🐇 100 · 🐦 200 — les petits carrés montrent la taille du saut.
   La voiture avance, fait « vroum » et on passe automatiquement au joueur suivant.
5. **Joueur suivant ➡️** : si le joueur a posé une autre carte (attaque, parade…).
   On peut aussi toucher la piste d'un joueur pour le sélectionner directement.
6. **↩️ Annuler** retire le dernier ajout en cas d'erreur.
7. Comme dans le vrai jeu, il faut arriver **pile** à l'objectif : les cartes trop grandes sont grisées.

La partie est sauvegardée dans le navigateur : on peut recharger la page sans rien perdre.
Le bouton 🔊 coupe le son, 🏠 revient au menu.

## Lancer le jeu

Aucune installation : ouvrir `index.html` dans un navigateur (idéalement une tablette).

Pour l'avoir en ligne gratuitement avec **GitHub Pages** :
*Settings → Pages → Source : « Deploy from a branch » → branche `main`, dossier `/ (root)`*.
Le jeu sera disponible à l'adresse `https://<utilisateur>.github.io/mille-borne/`.
Sur tablette, « Ajouter à l'écran d'accueil » permet de le lancer comme une appli.

## Fichiers

- `index.html` – les trois écrans (préparation, course, arrivée)
- `style.css` – le thème « course dans le désert »
- `app.js` – la logique du jeu, les sons (synthétisés) et la sauvegarde
