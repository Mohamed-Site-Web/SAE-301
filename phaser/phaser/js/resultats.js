import { creerTouches, unJoueurAppuie, oublierAppuis } from "./controles.js";
import { jouerSon, lancerMusique } from "./sons.js";
import { participants } from "./persos.js";
import { infosJeu } from "./jeux.js";
import { TableauRecords, placeDansRecords } from "./records.js";
import {
  style,
  styleTexte,
  fondAssombri,
  aideBas,
  creerMedaillon,
  celebrer,
  reagirDefaite,
  respirer,
  OR
} from "./interface.js";

// Écran des résultats, commun aux 4 mini-jeux.
// On reçoit { scores: [score J1, score J2], stats: [{ titre, valeurs }] }
//  - en solo : le score, les stats et le tableau des meilleurs scores
//    (on tape ses initiales si on y entre) ;
//  - en duo : le gagnant et les scores des 2 joueurs.
export default class resultats extends Phaser.Scene {
  constructor() {
    super({ key: "resultats" });
  }

  init(donnees) {
    this.scores = donnees.scores;
    this.stats = donnees.stats;
  }

  create() {
    this.touches = creerTouches(this);
    this.jeu = infosJeu(this.registry.get("jeu"));
    this.choixFait = false;
    this.enSaisie = false;
    var joueurs = participants(this.registry);

    fondAssombri(this, this.jeu.fond, 0.6);
    this.add.text(640, 112, this.jeu.titre, styleTexte(22, "#ffe9a8")).setOrigin(0.5);
    this.aide = aideBas(this, "A : rejouer      B : menu");
    if (joueurs.length == 1) this.creerSolo(joueurs[0]);
    else this.creerDuo(joueurs);

    jouerSon(this, "fanfare");
    lancerMusique(this);
    this.cameras.main.fadeIn(300);
  }

  // le perso en grand (les Foxy de Music Fall sont animés)
  afficherPerso(j, x) {
    var sprite = this.add.sprite(x, 650, j.texture).setOrigin(0.5, 1).setScale(j.echelle).setFlipX(x > 640);
    if (j.anim) sprite.play(j.anim);
    return sprite;
  }

  score(i) {
    return this.scores[i] + " " + this.jeu.unite;
  }

  // ---------------------------------------------------------------------------
  // SOLO : score + tableau des meilleurs scores
  // ---------------------------------------------------------------------------
  creerSolo(j) {
    var place = placeDansRecords(this.jeu.cleRecords, this.scores[0], this.jeu.croissant);
    var message = place == 0 ? "NOUVEAU RECORD !" : place > 0 ? "Tu entres dans le top 5 !" : "Fin de la partie";
    this.add.text(640, 60, message, style(52, OR, 10)).setOrigin(0.5);

    // le perso : il fête ça s'il entre dans le tableau
    var sprite = this.afficherPerso(j, 170);
    if (place >= 0) celebrer(this, sprite);
    else respirer(this, sprite);

    // le score et les stats de la partie
    var hauteur = 230 + this.stats.length * 38;
    this.add.rectangle(500, 150 + hauteur / 2, 380, hauteur, 0x1b1030, 0.9).setStrokeStyle(3, 0xe0a818);
    creerMedaillon(this, 500, 205, j, j.etiquette);
    this.add.text(500, 270, j.nom, style(22, j.couleur, 5)).setOrigin(0.5);
    this.add.text(500, 318, this.score(0), style(40, OR)).setOrigin(0.5);
    this.stats.forEach((stat, k) => {
      var y = 372 + k * 38;
      this.add.text(330, y, stat.titre, styleTexte(18, "#b8a8d8")).setOrigin(0, 0.5);
      this.add.text(670, y, String(stat.valeurs[0]), styleTexte(22)).setOrigin(1, 0.5);
    });

    // le tableau des 5 meilleurs scores
    this.add.rectangle(960, 350, 420, 420, 0x1b1030, 0.9).setStrokeStyle(3, 0xe0a818);
    this.tableau = new TableauRecords(this, this.jeu, this.scores[0], j.cle, 960, 160);
    this.enSaisie = this.tableau.enSaisie;
    if (this.enSaisie) this.aide.setText("Entre tes initiales pour le tableau des records !");
  }

  // ---------------------------------------------------------------------------
  // DUO : qui a gagné ? (le plus grand score... ou le plus petit à Music Fall)
  // ---------------------------------------------------------------------------
  creerDuo(joueurs) {
    var gagnant = -1;
    var ecart = this.scores[0] - this.scores[1];
    if (this.jeu.croissant) ecart = -ecart;
    if (ecart > 0) gagnant = 0;
    if (ecart < 0) gagnant = 1;
    var message = gagnant == -1 ? "Égalité parfaite !" : joueurs[gagnant].nom + " gagne !";
    this.add.text(640, 62, message, style(56, OR, 10)).setOrigin(0.5);

    var hauteur = 250 + this.stats.length * 38;
    this.add.rectangle(640, 150 + hauteur / 2, 600, hauteur, 0x1b1030, 0.9).setStrokeStyle(3, 0xe0a818);
    var colonnes = [640 - 165, 640 + 165];
    joueurs.forEach((j, i) => {
      creerMedaillon(this, colonnes[i], 205, j, j.etiquette);
      this.add.text(colonnes[i], 270, j.nom, style(22, j.couleur, 5)).setOrigin(0.5);
      this.add.text(colonnes[i], 318, this.score(i), style(38, i == gagnant ? OR : "#ffffff")).setOrigin(0.5);
    });
    this.add.text(640, 318, "-", style(38)).setOrigin(0.5);
    this.stats.forEach((stat, k) => {
      var y = 375 + k * 38;
      this.add.text(640, y, stat.titre, styleTexte(17, "#b8a8d8")).setOrigin(0.5);
      stat.valeurs.forEach((v, i) => this.add.text(colonnes[i], y, String(v), styleTexte(22)).setOrigin(0.5));
    });

    // les persos : le gagnant saute de joie, le perdant réagit à sa façon
    joueurs.forEach((j, i) => {
      var sprite = this.afficherPerso(j, i == 0 ? 170 : 1110);
      if (i == gagnant || gagnant == -1) celebrer(this, sprite);
      else reagirDefaite(this, sprite, j);
    });
  }

  update() {
    if (this.choixFait) return;
    // en solo, on tape d'abord ses initiales
    if (this.enSaisie) {
      this.enSaisie = this.tableau.mettreAJour(this.touches);
      if (!this.enSaisie) {
        oublierAppuis(this.touches);
        this.aide.setText("A : rejouer      B : menu");
      }
      return;
    }
    if (unJoueurAppuie(this.touches, "a")) {
      this.choixFait = true;
      jouerSon(this, "valider");
      this.scene.start(this.jeu.scene);
    } else if (unJoueurAppuie(this.touches, "b")) {
      this.choixFait = true;
      jouerSon(this, "retour");
      this.scene.start("menu");
    }
  }
}
