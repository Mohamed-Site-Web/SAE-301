// Music Party : 4 mini-jeux musicaux pour la borne d'arcade, en solo ou à deux.
// Point de départ du jeu (comme dans le template) : on importe les scènes
// et on lance le jeu.

// chargement des scènes (une scène = un fichier du dossier js)
import chargement from "./js/chargement.js"; // charge les images et la musique
import accueil from "./js/accueil.js"; // écran titre
import selection from "./js/selection.js"; // choix du mini-jeu
import menu from "./js/menu.js"; // solo ou duo
import choix from "./js/choix.js"; // choix des persos
import chute from "./js/chute.js"; // mini-jeu Music Fall
import piano from "./js/piano.js"; // mini-jeu Piano Time
import memoire from "./js/memoire.js"; // mini-jeu Memory Song
import attrape from "./js/attrape.js"; // mini-jeu Note Catcher
import resultats from "./js/resultats.js"; // scores, gagnant et records

// configuration générale du jeu
var config = {
  type: Phaser.AUTO,
  width: 1280, // largeur en pixels (écran de la borne)
  height: 720, // hauteur en pixels
  backgroundColor: "#140a24",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  // pas de moteur physique : les chutes et les rebonds des notes sont
  // calculés à la main (voir chute.js et attrape.js)
  scene: [chargement, accueil, selection, menu, choix, chute, piano, memoire, attrape, resultats],
  baseURL: window.location.pathname.replace(/\/[^/]*$/, "")
};

// création et lancement du jeu (la 1re scène de la liste démarre toute seule)
var game = new Phaser.Game(config);
