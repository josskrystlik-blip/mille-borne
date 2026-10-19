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
   En mode « Km seulement », s'il n'a pas de km à poser, on appuie sur **Pas de km ▶**.
   On peut aussi toucher la voiture d'un pilote ou sa ligne dans le tableau pour lui donner la main.
6. **💡 Comment finir ?** À partir de 200 km de l'arrivée, le compteur « Il reste » devient un
   bouton : en le touchant, l'enfant voit (et entend) les combinaisons de cartes qui permettent
   d'arriver pile, par exemple 100 + 75 + 25.
7. **↩ Annuler** retire le dernier ajout en cas d'erreur.
8. Comme dans le vrai jeu, il faut arriver **pile** à l'objectif : les cartes trop grandes sont grisées.

## Look des cartes

Les cartes à l'écran reprennent le style des cartes du jeu (édition Dujardin actuelle), redessinées :
cartes blanches ; pour les km, la borne rouge et blanche dans le paysage vert avec l'animal et le
grand chiffre à l'envers ; titres rouges pour les attaques, bleus avec bande verte pour les parades,
grand « V » vert pour les bottes ; le dos de la pioche aux petites bornes bleues et rouges.

## Règles complètes : attaques, parades et bottes

Sur l'écran de départ, **Règles** permet de choisir :
- **Découverte** : pour les plus jeunes, les attaques, parades et bottes sont suivies mais
  **pas besoin de feu vert** (ni au départ, ni après une réparation), **pas de coup fourré**
  et **pas de limite** de cartes 200 ;
- **Règles complètes** : comme le vrai jeu, le jeu suit l'état de chaque voiture ;
- **Km seulement** : partie rapide, on ne compte que les kilomètres.

### 📖 Les règles en 1 minute

Le bouton **📖** (en haut, sur tous les écrans) et le lien de l'écran de départ ouvrent les règles
illustrées avec les cartes du jeu : le but, le tour de jeu, les kilomètres, le feu vert, les
attaques et leurs parades, les bottes et le coup fourré, la fin de partie, ce qui change en
mode Découverte, et **les questions qui font débattre** (parade sans attaque, attaquer un pilote
déjà arrêté, feu vert après réparation, deux cartes 200…). Chaque section a un bouton 🔊 qui la
lit à voix haute pour les enfants.

Avec les règles complètes, après **Jouer ▶** on choisit sa carte dans 4 onglets :
**🛣️ Km**, **⚔️ Attaquer** (feu rouge, limitation, panne d'essence, crevaison, accident),
**🔧 Réparer** (feu vert, fin de limitation, essence, roue de secours, réparations) et **⭐ Bottes**
(véhicule prioritaire, citerne, increvable, as du volant).

- Le jeu sait si une voiture **roule** : au départ et après une réparation il faut un **feu vert** ;
  sous **limitation**, seulement 25 et 50 ; **deux cartes 200** au maximum ; arrivée pile.
- L'état se voit sur le circuit au-dessus de la voiture (🚦 🔴 ⛽ 🛞 💥 et panneau 50), dans le
  tableau des positions (avec les bottes) et dans le cartouche : « Il te faut : Feu vert ».
- Au début du tour, l'onglet utile s'ouvre tout seul et la carte dont on a besoin clignote.
- Une carte qu'on ne peut pas jouer est grisée : en la touchant, le jeu explique pourquoi.
- **Attaque** : le jeu demande qui on attaque et grise les pilotes qui ne peuvent pas la recevoir
  (arrêtés, déjà limités ou protégés par leur botte).
- **Coup fourré** : après chaque attaque, le jeu demande si la victime a la botte correspondante.
  Si oui, l'attaque est annulée et c'est elle qui rejoue.
- **Botte** : elle protège pour toute la partie et on rejoue.
- **Je jette ▶** : quand on ne peut rien poser, on jette une carte et c'est au suivant.

### 🃏 Cartes posées

Le widget **Cartes posées** montre la table de chaque pilote, comme dans le vrai jeu (sans les
cartes km, que le circuit montre déjà) :
- **Bataille** : la carte du dessus en grand (feu vert, attaque reçue avec qui l'a posée, ou
  réparation) et les cartes précédentes en petit ;
- **Vitesse** : limitation de vitesse ou fin de limitation ;
- **Bottes** : celles obtenues par coup fourré sont posées de travers avec « Coup fourré ! ».
Un badge résume l'état : « Roule », « Roule, limité à 50 » ou « Arrêté : il lui faut … ».
Toucher la zone d'un pilote lui donne la main.

### ❓ Puis-je jouer cette carte ?

Le bouton ouvre toutes les cartes du jeu : l'enfant touche celle qu'il a dans la main et le jeu
répond (à l'écran et à voix haute) **oui ou non, avec la raison**, par exemple « Pas maintenant :
tu es arrêté au feu rouge, il te faut d'abord un Feu vert ». Si c'est oui, **Jouer cette carte**
la pose directement.

## 🧮 Points et résumé de fin de manche

À l'arrivée, le jeu compte les points de la manche selon le barème classique du Mille Bornes :

| Ce qui rapporte | Points |
|---|---|
| Chaque km parcouru | 1 par km |
| Chaque botte | 100 (les 4 bottes : +300) |
| Chaque coup fourré | +300 |
| Manche terminée (arrivé pile) | 400 |
| Sans carte 200 | +300 |
| Capot (les autres n'ont posé aucun km) | +500 |
| Retardement (arrivé avec la pioche vide) | +300 |

- Le détail ligne par ligne s'affiche pour chaque pilote, avec le **total de la partie / 5000**.
  On enchaîne les manches avec **Revanche** (les points s'additionnent) ; **Nouvelle partie**
  remet à zéro. Le premier à **5000 points** est le grand champion.
- Le jeu ne voit pas la pioche : une case permet d'ajouter le **retardement** (+300).
- **🏁 Fin de manche (pioche vide)** dans le widget « Tour de jeu » termine une manche où
  personne n'arrive : on compte les points sans prime « manche terminée ».
- **Le film de la course** : nombre de coups, cartes km, attaques posées / reçues, bottes,
  et des badges (« Le plus taquin », « Le plus protégé », « Le plus rapide »).
- En mode **Km seulement**, seuls les km et la manche terminée comptent.
- L'« allonge » (passer de 700 à 1000 km en cours de manche) n'est pas gérée.

## 🎙️ Commentateur, effets et ambiance

- **Commentateur de course** (réglable sur l'écran de départ, panneau Voix) : il commente à voix
  haute et dans un bandeau sur le circuit les dépassements (« Léo double Papa ! »), la prise de
  tête, la dernière ligne droite, les attaques (« Aïe ! Papa a crevé ! »), les réparations, les
  bottes, les coups fourrés, le départ et l'arrivée.
- **Effets sur le circuit** : fumée qui sort de la voiture accidentée, voiture crevée qui
  penche et rebondit, moteur en panne qui toussote, feu rouge devant la voiture arrêtée,
  bouclier vert quand on pose une botte, feu d'artifice sur la ligne d'arrivée.
- **Ambiance sonore** (synthétisée, aucun fichier) : moteur qui monte en régime selon la carte,
  klaxon pour une attaque, choc, sifflement du pneu, toussotement, « ding » de réparation,
  fanfare de botte, foule qui applaudit. Le bouton **🎵** lance une petite musique de course ;
  **🔊** coupe tout.

## 📷 Montrer une carte à la caméra

Le bouton **📷 Montrer une carte** (widget « Tour de jeu ») reconnaît une carte montrée à la
caméra de la tablette, puis demande « C'est bien Feu rouge ? » avant de la jouer (mêmes règles
que si on l'avait touchée ; elle apparaît avec 📷 dans l'historique).

- **Apprendre mes cartes** (une seule fois, environ 5 minutes) : pour chaque sorte de carte, on la
  montre à la caméra et on touche sa vignette 3 ou 4 fois en la bougeant un peu. Apprendre aussi
  « Rien » en montrant la table vide. Bonne lumière, carte entière, fond uni.
- La reconnaissance tourne **sur la tablette** (TensorFlow.js + MobileNet) : aucune image n'est
  envoyée. Les bibliothèques (≈ 20 Mo) se téléchargent la première fois, il faut donc Internet
  ce jour-là ; les exemples appris restent sur la tablette.
- La caméra demande une adresse **https** (GitHub Pages convient). La fiabilité dépend de la
  lumière : à essayer, et on peut toujours toucher la carte à l'écran.

## Écran de course en widgets

L'écran est découpé en 5 widgets : **Tour de jeu**, **Circuit**, **Cartes posées**, **Positions** et **Historique**.
- ▾ réduit un widget, ⤢ l'agrandit en plein écran (✕ pour revenir) ;
- on fait **glisser sa barre de titre** pour changer l'ordre (par exemple le circuit en haut).
La disposition est mémorisée.

## 🎤 Écouter la partie

Le bouton **Écouter la partie** utilise le micro et la reconnaissance vocale du navigateur
(Chrome, Edge ou Safari récents) pour noter les coups sans toucher l'écran :
- « **Léo** pose 50 », « cent **pour Papa** », « Maman joue deux cents », « je mets un escargot »,
  « Léo 50 et Papa 100 » ;
- les valeurs peuvent être dites en chiffres, en lettres ou par l'animal de la carte ;
- sans prénom (« je », « moi »…), les km vont au pilote dont c'est le tour.

Avec les **règles complètes**, l'écoute comprend aussi les autres cartes :
- **parades** : « Léo pose un feu vert », « je mets la roue de secours », « Papa fait les réparations »,
  « fin de limitation pour Maman » ;
- **bottes** : « Maman pose l'as du volant », « citerne », « increvable », « véhicule prioritaire » ;
- **attaques** : « Maman met un feu rouge à Léo », « crevaison pour Papa », « Léo attaque Maman avec
  un accident », « limitation à 50 pour Papa ». Qui attaque : le prénom dit avant la carte, sinon le
  pilote dont c'est le tour. Qui est attaqué : le prénom dit après la carte ; s'il manque, la fenêtre
  « Qui attaques-tu ? » s'ouvre et on répond à voix haute (« Papa ») ;
- **coup fourré** : à la question du jeu, répondre « Coup fourré ! » (ou « oui ») ou « non ».

Une carte impossible (pilote déjà arrêté, protégé par sa botte, pas besoin de cette parade…) est
refusée et la voix explique pourquoi. Astuce : laisser la voix du jeu finir sa phrase avant de parler,
car le micro est coupé pendant qu'elle parle.

Le jeu ne reconnaît pas *qui* parle au son de la voix : c'est le prénom prononcé qui compte.
Les phrases qui parlent de ce qu'il « reste » ou des nombres comme « cent cinquante » sont ignorées,
et l'écoute est coupée pendant que le jeu parle. Après chaque annonce comprise, un bandeau
« 🎤 Papa +100 km — Corriger » s'affiche.

**Corriger après coup** : dans le widget **Historique**, chaque coup (🎤 entendu ou 👆 touché) peut
être supprimé, et pour les km attribué à un autre pilote ou changé de valeur ; tout est recalculé.

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
