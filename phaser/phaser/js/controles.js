// Touches de la borne d'arcade (d'après le mapping donné pour la SAE).
// Pour le joueur, les 6 boutons s'appellent :   A B C   (rangée du haut)
//                                               D E F   (rangée du bas)
//   J1 : joystick = flèches,  A B C = I O P,  D E F = K L M
//   J2 : joystick = Z Q S D,  A B C = R T Y,  D E F = F G H
// ESPACE (J1) et ENTRÉE (J2) marchent aussi comme A : pratique pour tester sur PC.
// Chaque action est un tableau de touches.
export const BOUTONS = ["a", "b", "c", "d", "e", "f"];
export const LETTRES = ["A", "B", "C", "D", "E", "F"];

export function creerTouches(scene) {
  var k = scene.input.keyboard;
  return [
    {
      haut: [k.addKey("UP")],
      bas: [k.addKey("DOWN")],
      gauche: [k.addKey("LEFT")],
      droite: [k.addKey("RIGHT")],
      a: [k.addKey("I"), k.addKey("SPACE")],
      b: [k.addKey("O")],
      c: [k.addKey("P")],
      d: [k.addKey("K")],
      e: [k.addKey("L")],
      f: [k.addKey("M")]
    },
    {
      haut: [k.addKey("Z")],
      bas: [k.addKey("S")],
      gauche: [k.addKey("Q")],
      droite: [k.addKey("D")],
      a: [k.addKey("R"), k.addKey("ENTER")],
      b: [k.addKey("T")],
      c: [k.addKey("Y")],
      d: [k.addKey("F")],
      e: [k.addKey("G")],
      f: [k.addKey("H")]
    }
  ];
}

// une des touches du tableau vient d'etre appuyée ?
// (on les teste toutes pour bien "consommer" le JustDown de chacune)
export function vientDAppuyer(touches) {
  var resultat = false;
  touches.forEach((t) => {
    if (Phaser.Input.Keyboard.JustDown(t)) resultat = true;
  });
  return resultat;
}

// une des touches du tableau est enfoncée en ce moment ?
export function estEnfoncee(touches) {
  return touches.some((t) => t.isDown);
}

// pratique pour les menus : un des 2 joueurs a appuyé sur cette action
export function unJoueurAppuie(touches, action) {
  var j1 = vientDAppuyer(touches[0][action]);
  var j2 = vientDAppuyer(touches[1][action]);
  return j1 || j2;
}

// on "vide" les appuis en attente des 2 joueurs (sinon un appui fait pendant
// une animation serait pris en compte juste après)
export function oublierAppuis(touches) {
  touches.forEach((joueur) => {
    Object.keys(joueur).forEach((action) => vientDAppuyer(joueur[action]));
  });
}
