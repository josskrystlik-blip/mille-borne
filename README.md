# ⚡ Mille Bornes Turbo

Un compteur de kilomètres ludique pour jouer au **Mille Bornes** avec les enfants.
Toutes les voitures font la course sur un circuit ovale, une voie par pilote : un tour complet
= la course entière, avec une borne tous les 100 km et la ligne d'arrivée au damier.
On *voit* qui est devant et de combien, au lieu de faire des additions.
Un grand cartouche « À toi, Léo ! » indique à qui c'est le tour et combien de km il lui reste,
avec une jauge jusqu'au drapeau. Sous les cartes, un tableau des positions (P1, P2…) donne les km de chacun.

## Comment jouer

1. **Combien de pilotes ?** Choisir de 2 à 6 joueurs, taper les prénoms et la couleur de chaque voiture.
2. **Distance** : 1000 km (règle classique) ou 700 km (course courte).
3. **Départ** Feu rouge, 3-2-1… partez !
4. **À chaque tour**, une voix annonce « C'est au tour de Léo ! Pioche une carte. »
   Le paquet de cartes s'anime : le pilote pioche, puis appuie sur **Jouer ▶**.
5. S'il pose une carte étape, on touche la même carte à l'écran. Comme dans le jeu,
   chaque carte montre sa borne kilométrique et son animal :
   25 escargot · 50 canard · 75 papillon · 100 lièvre · 200 hirondelle.
   La voiture avance sur le circuit jusqu'à la bonne borne et c'est au pilote suivant.
   S'il n'a pas de km à poser (attaque, parade…), on appuie sur **Pas de km ▶**.
   On peut aussi toucher la voiture d'un pilote ou sa ligne dans le tableau pour lui donner la main.
6. **💡 Comment finir ?** À partir de 200 km de l'arrivée, le compteur « Il reste » devient un
   bouton : en le touchant, l'enfant voit (et entend) les combinaisons de cartes qui permettent
   d'arriver pile, par exemple 100 + 75 + 25.
7. **↩ Annuler** retire le dernier ajout en cas d'erreur.
8. Comme dans le vrai jeu, il faut arriver **pile** à l'objectif : les cartes trop grandes sont grisées.

## Écran de course en widgets

L'écran est découpé en 4 widgets : **Tour de jeu**, **Circuit**, **Positions** et **Historique**.
- ▾ réduit un widget, ⤢ l'agrandit en plein écran (✕ pour revenir) ;
- on fait **glisser sa barre de titre** pour changer l'ordre (par exemple le circuit en haut).
La disposition est mémorisée.

## 🎤 Écouter la partie

Le bouton **Écouter la partie** utilise le micro et la reconnaissance vocale du navigateur
(Chrome, Edge ou Safari récents) pour noter les km sans toucher l'écran :
- « **Léo** pose 50 », « cent **pour Papa** », « Maman joue deux cents », « je mets un escargot »,
  « Léo 50 et Papa 100 » ;
- les valeurs peuvent être dites en chiffres, en lettres ou par l'animal de la carte ;
- sans prénom (« je », « moi »…), les km vont au pilote dont c'est le tour.

Le jeu ne reconnaît pas *qui* parle au son de la voix : c'est le prénom prononcé qui compte.
Les phrases qui parlent de ce qu'il « reste » ou des nombres comme « cent cinquante » sont ignorées,
et l'écoute est coupée pendant que le jeu parle. Après chaque annonce comprise, un bandeau
« 🎤 Papa +100 km — Corriger » s'affiche.

**Corriger après coup** : dans le widget **Historique**, chaque coup (🎤 entendu ou 👆 touché) peut
être attribué à un autre pilote, changé de valeur ou supprimé ; les km sont recalculés.

## Voix

Sur l'écran de départ, le panneau **Voix** liste les voix françaises de l'appareil ; celles
marquées ★ sont les plus naturelles (voix « Natural », « Premium », « Enhanced »…).
Sur iPad, d'autres voix de meilleure qualité se téléchargent dans *Réglages → Accessibilité →
Contenu énoncé → Voix*.

La partie est sauvegardée dans le navigateur : on peut recharger la page sans rien perdre.
Le bouton 🔊 coupe le son et la voix, ⏏ revient au menu.

## Lancer le jeu

Aucune installation : ouvrir `index.html` dans un navigateur (idéalement une tablette).

Pour l'avoir en ligne gratuitement avec **GitHub Pages** :
*Settings → Pages → Source : « Deploy from a branch » → la branche du jeu, dossier `/ (root)`*.
Le jeu sera disponible à l'adresse `https://<utilisateur>.github.io/mille-borne/`.
Sur tablette, « Ajouter à l'écran d'accueil » permet de le lancer comme une appli.

## Fichiers

- `index.html` – les trois écrans (préparation, course, arrivée)
- `style.css` – le thème « course dans le désert »
- `app.js` – la logique du jeu, les sons (synthétisés) et la sauvegarde
