// Petits outils d'interface partagés par toutes les scènes : styles de texte,
// panneau de présentation avant le jeu, médaillon avec la tete du perso,
// textes qui s'envolent, réactions des persos à la fin...

export const POLICE = "Arial Black";
const ENCRE = "#1b1030";
export const OR = "#ffd23f";

// gros texte avec un contour sombre
export function style(taille, couleur, contour) {
  return {
    fontFamily: POLICE,
    fontSize: taille + "px",
    color: couleur || "#ffffff",
    stroke: ENCRE,
    strokeThickness: contour === undefined ? Math.max(4, Math.round(taille / 6)) : contour,
    align: "center"
  };
}

// texte courant (règles, descriptions)
export function styleTexte(taille, couleur) {
  return {
    fontFamily: "Arial",
    fontSize: taille + "px",
    fontStyle: "bold",
    color: couleur || "#ffffff",
    align: "center",
    lineSpacing: 6
  };
}

// image de fond + voile sombre par-dessus pour que le texte ressorte
export function fondAssombri(scene, cle, opacite) {
  scene.add.image(0, 0, cle).setOrigin(0);
  scene.add.rectangle(0, 0, 1280, 720, 0x0b0618, opacite).setOrigin(0);
}

// rappel des commandes en bas de l'écran
export function aideBas(scene, texte) {
  return scene.add
    .text(640, 690, texte, {
      fontFamily: POLICE,
      fontSize: "20px",
      color: "#ffffff",
      backgroundColor: ENCRE,
      padding: { x: 16, y: 6 }
    })
    .setOrigin(0.5)
    .setDepth(60);
}

// ---------------------------------------------------------------------------
// Panneau "descriptif + bouton lancer le jeu" affiché avant chaque partie
// ---------------------------------------------------------------------------
export function panneauPresentation(scene, titre, lignes) {
  var hauteur = 190 + lignes.length * 33;
  var fond = scene.add.rectangle(0, 0, 940, hauteur, 0x1b1030, 0.95).setStrokeStyle(4, 0xe0a818);
  var texteTitre = scene.add.text(0, -hauteur / 2 + 45, titre, style(40, OR)).setOrigin(0.5);
  var texte = scene.add
    .text(0, -hauteur / 2 + 85, lignes.join("\n"), { ...styleTexte(23), lineSpacing: 9 })
    .setOrigin(0.5, 0);
  // le bouton "lancer le jeu" se valide avec A (pas de souris sur la borne)
  var bouton = scene.add.rectangle(0, hauteur / 2 - 45, 420, 56, 0xffc83d).setStrokeStyle(4, 0xffffff);
  var texteBouton = scene.add
    .text(0, bouton.y, "▶  LANCER LE JEU  (A)", { fontFamily: POLICE, fontSize: "24px", color: "#2b1f5c" })
    .setOrigin(0.5);

  var panneau = scene.add.container(640, 360, [fond, texteTitre, texte, bouton, texteBouton]).setDepth(80);
return panneau;
}

export function fermerPanneau(scene, panneau, suite) {
  panneau.destroy();
  suite();
}

// ---------------------------------------------------------------------------
// HUD : la tete du perso dans un médaillon, avec le score juste à coté
// ---------------------------------------------------------------------------
export function creerMedaillon(scene, x, y, perso, etiquette) {
  var ombre = scene.add.circle(3, 4, 38, 0x000000, 0.35);
  var cercle = scene.add.circle(0, 0, 38, perso.teinte).setStrokeStyle(4, 0xffffff);
  var tete = scene.add.image(0, 0, perso.tete);
  var tag = scene.add
    .text(0, 42, etiquette, {
      fontFamily: POLICE,
      fontSize: "13px",
      color: "#ffffff",
      backgroundColor: ENCRE,
      padding: { x: 6, y: 2 }
    })
    .setOrigin(0.5);
  return scene.add.container(x, y, [ombre, cercle, tete, tag]).setDepth(30);
}

// les vies (ou les chances) : de petites notes dorées
export function creerVies(scene, x, y, nombre) {
  var vies = [];
  for (var i = 0; i < nombre; i++) {
    vies.push(scene.add.image(x + i * 26, y, "tx_vie").setDepth(30));
  }
  return vies;
}

// une vie se casse : la note devient grise et tremble
export function casserVie(scene, image) {
  if (!image) return;
  image.setTint(0x5a5070);
  scene.tweens.add({ targets: image, angle: 25, scale: 1.4, duration: 120, yoyo: true });
  var croix = scene.add.text(image.x, image.y, "✖", style(20, "#ff4d5e", 3)).setOrigin(0.5).setDepth(31);
  scene.tweens.add({ targets: croix, scale: 1.3, duration: 150, yoyo: true });
}

// petit texte qui monte et disparait (+100, PARFAIT...)
export function texteFlottant(scene, x, y, texte, couleur, taille) {
  var t = scene.add
    .text(x, y, texte, style(taille || 26, couleur))
    .setOrigin(0.5)
    .setDepth(45);
  scene.tweens.add({
    targets: t,
    y: y - 55,
    alpha: 0,
    duration: 850,
    ease: "Quad.easeOut",
    onComplete: () => t.destroy()
  });
  return t;
}

// grosse annonce au milieu de l'écran (Prêts ?, ALLEGRO !...)
export function annonce(scene, texte, couleur, duree, y) {
  var t = scene.add
    .text(640, y || 330, texte, style(64, couleur || OR, 10))
    .setOrigin(0.5)
    .setDepth(70)
    .setScale(0);
  scene.tweens.add({ targets: t, scale: 1, duration: 250, ease: "Back.easeOut" });
  scene.tweens.add({
    targets: t,
    alpha: 0,
    delay: duree || 900,
    duration: 250,
    onComplete: () => t.destroy()
  });
  return t;
}




// ---------------------------------------------------------------------------
// Fin de partie (le plus GRAND score gagne dans ces mini-jeux)
// ---------------------------------------------------------------------------
// Règle commune :
//  - en solo, la partie s'arrete quand le joueur est éliminé ;
//  - en duo, elle s'arrete quand les 2 sont éliminés, ou dès qu'il n'en reste
//    qu'un et qu'il a déjà plus de points que l'autre (le gagnant est connu).
export function partieTerminee(joueurs) {
  var enJeu = joueurs.filter((j) => !j.elimine);
  if (enJeu.length == 0) return true;
  if (joueurs.length == 2 && enJeu.length == 1) {
    var autre = joueurs.find((j) => j.elimine);
    return enJeu[0].score > autre.score;
  }
  return false;
}
