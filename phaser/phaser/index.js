// chargement des librairies
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
  width: 1280, // largeur en pixels
  height: 720, // hauteur en pixels
   type: Phaser.AUTO,
  scale: {
    mode: Phaser.Scale.FIT,
    parent: 'game-container',
    autoCenter: Phaser.Scale.CENTER_BOTH,
  
  },
  physics: {
    // définition des parametres physiques
    default: "arcade", // mode arcade : le plus simple : des rectangles pour gérer les collisions. Pas de pentes
    arcade: {
      // parametres du mode arcade
      gravity: {
        y: 300 // gravité verticale : acceleration ddes corps en pixels par seconde
      },
      debug: true // permet de voir les hitbox et les vecteurs d'acceleration quand mis à true
    }
  },
  scene: [selection, niveau1, niveau2, niveau3],
  baseURL: window.location.pathname.replace(/\/[^/]*$/, '')
};


// création et lancement du jeu
var game = new Phaser.Game(config);
game.scene.start("selection");
