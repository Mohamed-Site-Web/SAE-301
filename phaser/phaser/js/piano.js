import { creerTouches, vientDAppuyer, unJoueurAppuie, oublierAppuis } from "./controles.js";
import { jouerSon, jouerPiano, lancerMusique, volumeMusique } from "./sons.js";
import { participants } from "./persos.js";
import { infosJeu } from "./jeux.js";
import { choisirMorceau } from "./repertoire.js";
import { afficherRecordEnJeu } from "./records.js";
import {
  style,
  styleTexte,
  panneauPresentation,
  fermerPanneau,
  creerMedaillon,
  creerVies,
  casserVie,
  texteFlottant,
  annonce,
  partieTerminee,
  OR
} from "./interface.js";

const JEU = infosJeu("piano_time"); // titre, fond, tableau des records...

// ---------------------------------------------------------------------------
// Réglages du mini-jeu
// ---------------------------------------------------------------------------
const X_PIANOS_SOLO = [640]; // en solo, un seul piano au milieu
const X_PIANOS_DUO = [330, 950]; // en duo, un piano de chaque coté
const LARGEUR_COULOIR = 100; // 3 couloirs par piano : boutons A, B, C
const Y_HAUT = 150; // les notes apparaissent en haut de la piste
const Y_ZONE = 520; // centre de la zone dorée (la "zone de sélection")
const HAUTEUR_ZONE = 64;
const Y_CLAVIER = 580; // haut des touches du piano géant
const Y_PIEDS = 694; // les persos sont debout sur les touches
const ECHELLE_PERSO = 0.5; // les images des persos sont affichées 2 fois plus petites
const PX_PAR_TEMPS = 150; // écart vertical entre 2 temps de la partition
const TEMPO_DEPART = 84; // en battements par minute (BPM)
const GAIN_TEMPO = 2; // +2 BPM à chaque note réussie : ça accélère !
const FENETRE_BIEN = 46; // écart max (en px) entre la note et le centre de la zone
const FENETRE_PARFAIT = 15;
const FENETRE_TROP_TOT = 110; // un peu trop tôt : on perd juste le combo
const VIES = 3;
const COULEURS_COULOIRS = [0xff5a5a, 0xffa23a, 0xffe14d]; // A rouge, B orange, C jaune
const BOUTONS_COULOIRS = [
  ["a", "d"], // couloir de gauche : A (ou D juste en dessous)
  ["b", "e"],
  ["c", "f"]
];

// noms des tempos en italien, comme sur une partition
const TEMPOS = [
  { bpm: 0, nom: "Andante" },
  { bpm: 100, nom: "Moderato" },
  { bpm: 120, nom: "Allegro" },
  { bpm: 145, nom: "Vivace" },
  { bpm: 170, nom: "Presto" },
  { bpm: 200, nom: "Prestissimo" },
  { bpm: 240, nom: "Furioso" }
];

// profondeur d'affichage des éléments (plus grand = devant)
const PROF = { piste: 1, zone: 2, tuile: 4, clavier: 5, lumiere: 5.5, perso: 6, voile: 8, hud: 30 };

// Déroulement (this.etat) :
// presentation (panneau + bouton lancer) -> decompte (1, 2, 3, 4) -> jeu -> fin
export default class piano extends Phaser.Scene {
  constructor() {
    super({ key: "piano" });
  }

  create() {
    this.touches = creerTouches(this);
    this.etat = "presentation";
    this.solo = this.registry.get("mode") == "solo";

    // en duo, la partition est la meme pour les 2 joueurs (c'est plus juste),
    // mais chacun la joue à son propre tempo
    this.morceau = choisirMorceau();
    this.partition = [];
    this.fabrique = { phrase: 0, note: 0, temps: 2, couloir: 1, hauteur: null, demiTemps: false };
    this.allongerPartition(64);

    this.add.image(0, 0, JEU.fond).setOrigin(0);
    if (this.solo) this.creerCotesSolo();
    else this.creerCentre();
    this.joueurs = participants(this.registry).map((perso, i) => this.creerJoueur(perso, i));

    lancerMusique(this);
    this.cameras.main.fadeIn(300);
    this.presenter();
  }

  // ---------------------------------------------------------------------------
  // LA PARTITION
  // ---------------------------------------------------------------------------
  // On ajoute des notes à la fin de la partition (au fur et à mesure, le jeu
  // n'a pas de fin : il s'arrete quand les joueurs sont éliminés).
  // Chaque note = { temps (en battements), couloir (0, 1 ou 2), hauteur (MIDI) }
  allongerPartition(nombre) {
    var f = this.fabrique;
    for (var k = 0; k < nombre; k++) {
      var phrase = this.morceau.phrases[f.phrase];
      var hauteur = phrase[f.note];
      var couloir = this.choisirCouloir(f.couloir, f.hauteur == null ? 0 : hauteur - f.hauteur);
      // après un demi-temps, la note suivante est forcément dans un autre couloir
      if (f.demiTemps && couloir == f.couloir) couloir = (couloir + Phaser.Math.Between(1, 2)) % 3;
      this.partition.push({ temps: f.temps, couloir: couloir, hauteur: hauteur });
      f.couloir = couloir;
      f.hauteur = hauteur;

      // la note suivante arrive 1 temps plus tard... ou un demi-temps de temps en temps
      f.demiTemps = this.partition.length > 12 && Math.random() < 0.15;
      f.temps += f.demiTemps ? 0.5 : 1;
      f.note++;
      if (f.note >= phrase.length) {
        f.note = 0;
        f.phrase = (f.phrase + 1) % this.morceau.phrases.length;
        f.temps += 1; // on respire entre 2 phrases
      }
    }
  }

  // le couloir suit le dessin de la mélodie : une note plus aiguë va à droite,
  // une plus grave à gauche (comme sur un vrai clavier)
  choisirCouloir(dernier, ecart) {
    var c;
    if (ecart > 0) c = dernier + (ecart >= 5 ? 2 : 1);
    else if (ecart < 0) c = dernier - (ecart <= -5 ? 2 : 1);
    else c = Math.random() < 0.5 ? dernier : Phaser.Math.Between(0, 2);
    // si on sort du piano, on repart de l'autre coté
    if (c > 2) c = Phaser.Math.Between(0, 1);
    if (c < 0) c = Phaser.Math.Between(1, 2);
    return c;
  }

  // ---------------------------------------------------------------------------
  // DECOR
  // ---------------------------------------------------------------------------
  // en solo : le titre et le morceau à gauche du piano, le record à battre à droite
  creerCotesSolo() {
    this.add.rectangle(235, 250, 330, 220, 0x1b1030, 0.8).setStrokeStyle(2, 0xe0a818);
    this.add.text(235, 180, JEU.titre, style(40, OR, 8)).setOrigin(0.5);
    this.add.text(235, 240, "♪ " + this.morceau.titre, styleTexte(20)).setOrigin(0.5);
    this.add
      .text(235, 268, this.morceau.auteur, { fontFamily: "Georgia, serif", fontSize: "18px", fontStyle: "italic", color: "#ffe9a8" })
      .setOrigin(0.5);
    this.add.image(235, 580, "img_logo").setScale(0.75);
    this.add.rectangle(1045, 215, 260, 150, 0x1b1030, 0.8).setStrokeStyle(2, 0xe0a818);
    this.record = afficherRecordEnJeu(this, 1045, 170, JEU.cleRecords);
  }

  // en duo : le titre et le morceau au milieu, entre les 2 pianos
  creerCentre() {
    this.add.text(640, 46, JEU.titre, style(40, OR, 8)).setOrigin(0.5).setDepth(PROF.hud);
    this.add
      .text(640, 96, "♪ " + this.morceau.titre, styleTexte(20))
      .setOrigin(0.5)
      .setDepth(PROF.hud);
    this.add
      .text(640, 122, this.morceau.auteur, { fontFamily: "Georgia, serif", fontSize: "18px", fontStyle: "italic", color: "#ffe9a8" })
      .setOrigin(0.5)
      .setDepth(PROF.hud);
    this.add.image(640, 640, "img_logo").setScale(0.62).setDepth(PROF.hud);
  }

  xCouloir(j, c) {
    return j.x + (c - 1) * LARGEUR_COULOIR;
  }

  // la piste = une feuille de papier à musique avec 3 couloirs et la zone dorée
  dessinerPiste(j) {
    var gauche = j.x - 1.5 * LARGEUR_COULOIR;
    var largeur = 3 * LARGEUR_COULOIR;
    var g = this.add.graphics().setDepth(PROF.piste);
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(gauche - 4, Y_HAUT - 22, largeur + 28, Y_CLAVIER - Y_HAUT + 40, 14);
    g.fillStyle(0xfbf5e6, 0.94);
    g.fillRoundedRect(gauche - 10, Y_HAUT - 30, largeur + 20, Y_CLAVIER - Y_HAUT + 40, 14);
    g.lineStyle(2, 0xd8ccb4);
    for (var k = 1; k < 3; k++) {
      g.lineBetween(gauche + k * LARGEUR_COULOIR, Y_HAUT - 20, gauche + k * LARGEUR_COULOIR, Y_CLAVIER);
    }
    // la zone dorée : c'est là qu'il faut jouer les notes
    g.fillStyle(0xffd23f, 0.35);
    g.fillRect(gauche, Y_ZONE - HAUTEUR_ZONE / 2, largeur, HAUTEUR_ZONE);
    g.lineStyle(3, 0xe0a818);
    g.strokeRect(gauche, Y_ZONE - HAUTEUR_ZONE / 2, largeur, HAUTEUR_ZONE);
    var halo = this.add.rectangle(j.x, Y_ZONE, largeur, HAUTEUR_ZONE, 0xffd23f, 0.3).setDepth(PROF.zone);
    this.tweens.add({ targets: halo, alpha: 0.05, duration: 600, yoyo: true, repeat: -1 });

    // une lumière par couloir (elle s'allume quand on appuie) + la lettre du bouton
    j.lumieres = [0, 1, 2].map((c) =>
      this.add
        .rectangle(this.xCouloir(j, c), Y_ZONE, LARGEUR_COULOIR - 6, HAUTEUR_ZONE - 6, COULEURS_COULOIRS[c])
        .setAlpha(0)
        .setDepth(PROF.zone)
    );
    ["A", "B", "C"].forEach((lettre, c) => {
      this.add
        .text(this.xCouloir(j, c), Y_ZONE, lettre, style(30, "#ffffff", 6))
        .setOrigin(0.5)
        .setAlpha(0.6)
        .setDepth(PROF.zone);
    });
    j.texteTempo = this.add
      .text(j.x, Y_HAUT - 12, "", { ...styleTexte(16, "#6b5a80"), fontStyle: "bold italic" })
      .setOrigin(0.5)
      .setDepth(PROF.zone);
  }

  // le piano géant sur lequel le perso saute
  dessinerClavier(j) {
    var gauche = j.x - 1.5 * LARGEUR_COULOIR;
    var g = this.add.graphics().setDepth(PROF.clavier);
    g.fillStyle(0x1b1030);
    g.fillRoundedRect(gauche - 10, Y_CLAVIER - 6, 3 * LARGEUR_COULOIR + 20, 150, 10);
    for (var c = 0; c < 3; c++) {
      var x = gauche + c * LARGEUR_COULOIR + 3;
      g.fillStyle(0xfdfaf2);
      g.fillRoundedRect(x, Y_CLAVIER, LARGEUR_COULOIR - 6, 124, { tl: 0, tr: 0, bl: 10, br: 10 });
      g.fillStyle(0xd9d0c0);
      g.fillRect(x, Y_CLAVIER + 108, LARGEUR_COULOIR - 6, 16);
    }
    g.fillStyle(0x16101f);
    for (var k = 1; k < 3; k++) {
      g.fillRoundedRect(gauche + k * LARGEUR_COULOIR - 18, Y_CLAVIER, 36, 62, { tl: 0, tr: 0, bl: 6, br: 6 });
    }
    j.lumieresClavier = [0, 1, 2].map((c) =>
      this.add
        .rectangle(this.xCouloir(j, c), Y_CLAVIER + 62, LARGEUR_COULOIR - 6, 124, COULEURS_COULOIRS[c])
        .setAlpha(0)
        .setDepth(PROF.lumiere)
    );
  }

  // ---------------------------------------------------------------------------
  // JOUEURS
  // ---------------------------------------------------------------------------
  creerJoueur(perso, i) {
    var j = {
      perso: perso,
      i: i,
      x: this.solo ? X_PIANOS_SOLO[i] : X_PIANOS_DUO[i],
      touches: this.touches[i],
      // en duo, J1 entend ses notes à gauche et J2 à droite
      pan: this.solo ? 0 : i == 0 ? -0.6 : 0.6,
      tempo: TEMPO_DEPART,
      temps: -4, // position dans la partition, en battements
      prochaine: 0, // prochaine note de la partition à faire apparaitre
      tuiles: [], // les notes affichées sur sa piste
      score: 0,
      combo: 0,
      meilleurCombo: 0,
      notesJouees: 0,
      vies: VIES,
      elimine: false,
      nomTempo: ""
    };
    this.dessinerPiste(j);
    this.dessinerClavier(j);
    // le perso est debout sur la touche du milieu
    j.sprite = this.add
      .image(this.xCouloir(j, 1), Y_PIEDS, perso.texture)
      .setOrigin(0.5, 1)
      .setScale(ECHELLE_PERSO)
      .setDepth(PROF.perso)
      .setFlipX(i == 1);
    this.creerHUD(j);
    return j;
  }

  // score : le chiffre à coté de la tete du perso choisi
  creerHUD(j) {
    var xTete = j.x - 110;
    creerMedaillon(this, xTete, 56, j.perso, j.perso.etiquette);
    j.texteScore = this.add
      .text(xTete + 50, 40, "0", style(34, j.perso.couleur))
      .setOrigin(0, 0.5)
      .setDepth(PROF.hud);
    j.imagesVies = creerVies(this, xTete + 64, 86, VIES).map((v) => v.setScale(0.8));
    j.texteMulti = this.add
      .text(j.x + 150, 42, "", style(30, OR))
      .setOrigin(1, 0.5)
      .setDepth(PROF.hud);
    j.texteCombo = this.add
      .text(j.x + 150, 80, "", styleTexte(17, "#ffffff"))
      .setOrigin(1, 0.5)
      .setDepth(PROF.hud);
    this.majHUD(j);
    this.majTempo(j);
  }

  multiplicateur(j) {
    return Math.min(4, 1 + Math.floor(j.combo / 10));
  }

  majHUD(j) {
    j.texteScore.setText(j.score);
    if (this.solo) this.record.verifier(j.score);
    var multi = this.multiplicateur(j);
    j.texteMulti.setText(multi > 1 ? "x" + multi : "");
    j.texteCombo.setText(j.combo > 1 ? j.combo + " combos" : "");
  }

  majTempo(j) {
    var nom = TEMPOS.filter((t) => j.tempo >= t.bpm).pop().nom;
    j.texteTempo.setText("♩ = " + Math.round(j.tempo) + "  " + nom);
    // on annonce le nouveau tempo quand il change
    if (j.nomTempo != "" && nom != j.nomTempo) texteFlottant(this, j.x, 300, nom + " !", "#ffffff", 34);
    j.nomTempo = nom;
  }

  // ---------------------------------------------------------------------------
  // DEROULEMENT
  // ---------------------------------------------------------------------------
  presenter() {
    this.panneau = panneauPresentation(this, JEU.titre, [
      "Les notes descendent vers la zone dorée de ton piano.",
      "Appuie sur A, B ou C quand une note est dans la zone",
      "(les boutons du dessous, D, E et F, marchent aussi).",
      "Chaque note réussie accélère le tempo et fait grimper le combo !",
      this.solo ? "3 notes ratées ou fausses notes : fin de la partie." : "3 notes ratées ou fausses notes : éliminé.",
      "Au programme : " + this.morceau.titre + " (" + this.morceau.auteur + ")"
    ]);
  }

  // le chef d'orchestre compte les 4 temps avant de commencer
  decompte() {
    this.etat = "decompte";
    volumeMusique(this, 0); // la musique, c'est les joueurs qui la font !
    var dureeTemps = 60000 / TEMPO_DEPART;
    for (var k = 0; k < 4; k++) {
      let numero = k;
      this.time.delayedCall(numero * dureeTemps, () => {
        annonce(this, String(numero + 1), OR, dureeTemps * 0.5, 300);
        jouerSon(this, numero == 3 ? "top" : "tic");
      });
    }
    this.time.delayedCall(4 * dureeTemps, () => {
      this.etat = "jeu";
      oublierAppuis(this.touches);
      annonce(this, "Jouez !", "#ffffff", 500, 300);
    });
  }

  update(time, delta) {
    if (this.etat == "presentation") {
      if (unJoueurAppuie(this.touches, "a")) {
        this.etat = "lancement";
        jouerSon(this, "valider");
        fermerPanneau(this, this.panneau, () => this.decompte());
      }
      return;
    }
    if (this.etat != "decompte" && this.etat != "jeu") return;

    // delta = temps écoulé depuis l'image précédente (en ms)
    var dt = Math.min(delta, 50) / 1000;
    this.joueurs.forEach((j) => this.avancer(j, dt));
  }

  avancer(j, dt) {
    if (j.elimine) return;
    // on avance dans la partition au tempo du joueur
    // (tempo en battements par minute, donc / 60 pour avoir des battements par seconde)
    j.temps += (dt * j.tempo) / 60;

    // les notes qui entrent dans la piste apparaissent en haut
    var tempsVisibles = (Y_ZONE - Y_HAUT) / PX_PAR_TEMPS;
    while (this.partition[j.prochaine].temps - j.temps <= tempsVisibles) {
      this.creerTuile(j, this.partition[j.prochaine]);
      j.prochaine++;
      if (j.prochaine > this.partition.length - 16) this.allongerPartition(32);
    }

    // la hauteur d'une tuile dépend de l'écart entre son temps et le temps actuel
    j.tuiles.slice().forEach((t) => {
      if (j.elimine) return; // éliminé par la tuile précédente
      t.y = Y_ZONE - (t.note.temps - j.temps) * PX_PAR_TEMPS;
      t.setAlpha(Phaser.Math.Clamp((t.y - Y_HAUT) / 40, 0, 1)); // apparition en douceur
      if (t.y - Y_ZONE > FENETRE_BIEN) this.rater(j, t); // elle a dépassé la zone
    });

    if (this.etat != "jeu" || j.elimine) return;
    this.lireTouches(j);
  }

  creerTuile(j, note) {
    var tuile = this.add.image(this.xCouloir(j, note.couloir), Y_HAUT, "tx_tuile").setDepth(PROF.tuile).setAlpha(0);
    tuile.note = note;
    j.tuiles.push(tuile);
  }

  retirerTuile(j, tuile) {
    j.tuiles = j.tuiles.filter((t) => t != tuile);
  }

  lireTouches(j) {
    BOUTONS_COULOIRS.forEach((boutons, c) => {
      // on lit les 2 boutons (pour bien consommer les 2 appuis)
      var haut = vientDAppuyer(j.touches[boutons[0]]);
      var bas = vientDAppuyer(j.touches[boutons[1]]);
      if (haut || bas) this.appuyer(j, c);
    });
  }

  // le joueur appuie sur le bouton du couloir c
  appuyer(j, c) {
    this.sauterSur(j, c);
    this.eclairer(j, c);

    // la tuile de ce couloir la plus proche de la zone
    var cible = null;
    j.tuiles.forEach((t) => {
      if (t.note.couloir != c) return;
      if (cible == null || Math.abs(t.y - Y_ZONE) < Math.abs(cible.y - Y_ZONE)) cible = t;
    });
    var ecart = cible ? Math.abs(cible.y - Y_ZONE) : Infinity;

    if (ecart <= FENETRE_BIEN) this.reussir(j, cible, ecart <= FENETRE_PARFAIT);
    else if (cible && cible.y < Y_ZONE && ecart <= FENETRE_TROP_TOT) this.tropTot(j, c);
    else this.fausseNote(j, c);
  }

  // "personnage apparait quand on appuie sur une touche" : il saute sur la
  // touche du piano qu'on vient de jouer, on voit tout de suite où on a appuyé
  sauterSur(j, c) {
    this.tweens.killTweensOf(j.sprite);
    j.sprite.setScale(ECHELLE_PERSO).setAngle(0).setY(Y_PIEDS);
    this.tweens.add({ targets: j.sprite, x: this.xCouloir(j, c), duration: 90, ease: "Quad.easeOut" });
    this.tweens.add({ targets: j.sprite, y: Y_PIEDS - 24, duration: 80, yoyo: true, ease: "Quad.easeOut" });
    // il s'écrase un peu en retombant sur la touche
    this.tweens.add({
      targets: j.sprite,
      scaleY: ECHELLE_PERSO * 0.88,
      scaleX: ECHELLE_PERSO * 1.1,
      duration: 70,
      delay: 160,
      yoyo: true
    });
  }

  eclairer(j, c) {
    [j.lumieres[c], j.lumieresClavier[c]].forEach((lumiere) => {
      lumiere.setAlpha(0.8);
      this.tweens.add({ targets: lumiere, alpha: 0, duration: 250 });
    });
  }

  reussir(j, tuile, parfait) {
    this.retirerTuile(j, tuile);
    // chaque note fait un son : la note de la mélodie
    jouerPiano(this, tuile.note.hauteur, { pan: j.pan });

    j.combo++;
    j.meilleurCombo = Math.max(j.meilleurCombo, j.combo);
    j.notesJouees++;
    var multi = this.multiplicateur(j);
    j.score += (parfait ? 100 : 50) * multi;
    // 1 réussite = accélération
    j.tempo += GAIN_TEMPO;

    // la tuile devient blanche, grossit et disparait
    tuile.setTintFill(0xffffff);
    this.tweens.add({
      targets: tuile,
      scale: 1.3,
      alpha: 0,
      y: tuile.y - 20,
      duration: 220,
      onComplete: () => tuile.destroy()
    });
    this.gerbe(tuile.x, Y_ZONE, j.perso.teinte);
    texteFlottant(this, tuile.x, Y_ZONE - 48, parfait ? "PARFAIT" : "BIEN", parfait ? OR : "#ffffff", 22);
    if (j.combo % 10 == 0 && j.combo <= 30) {
      texteFlottant(this, j.x, 330, "COMBO x" + multi + " !", OR, 36);
      jouerSon(this, "combo", j.pan);
    }
    this.majHUD(j);
    this.majTempo(j);
    this.verifierFin(); // en duo, le gagnant est peut-etre déjà connu
  }

  // petites notes de la couleur du perso qui s'envolent
  gerbe(x, y, couleur) {
    for (var k = 0; k < 6; k++) {
      var n = this.add
        .image(x + Phaser.Math.Between(-30, 30), y, "tx_mini_note")
        .setTint(couleur)
        .setDepth(PROF.voile);
      this.tweens.add({
        targets: n,
        x: n.x + Phaser.Math.Between(-40, 40),
        y: y - Phaser.Math.Between(60, 130),
        angle: Phaser.Math.Between(-60, 60),
        alpha: 0,
        duration: 600,
        onComplete: () => n.destroy()
      });
    }
  }

  tropTot(j, c) {
    j.combo = 0;
    this.majHUD(j);
    jouerSon(this, "trop_tot", j.pan);
    texteFlottant(this, this.xCouloir(j, c), Y_ZONE - 48, "Trop tôt !", "#ffa23a", 20);
  }

  fausseNote(j, c) {
    texteFlottant(this, this.xCouloir(j, c), Y_ZONE - 48, "Fausse note !", "#ff4d5e", 20);
    this.perdreVie(j);
  }

  // la tuile a dépassé la zone sans etre jouée
  rater(j, tuile) {
    this.retirerTuile(j, tuile);
    tuile.setTintFill(0xd0342c);
    this.tweens.add({ targets: tuile, y: tuile.y + 90, alpha: 0, duration: 400, onComplete: () => tuile.destroy() });
    texteFlottant(this, tuile.x, Y_ZONE - 48, "Raté !", "#ff4d5e", 22);
    this.perdreVie(j);
  }

  perdreVie(j) {
    if (j.elimine) return;
    j.combo = 0;
    j.vies--;
    casserVie(this, j.imagesVies[j.vies]);
    jouerSon(this, "couac", j.pan);
    this.cameras.main.shake(120, 0.004);
    // le perso trébuche
    this.tweens.add({ targets: j.sprite, angle: j.i == 0 ? -14 : 14, duration: 90, yoyo: true, repeat: 1 });
    this.majHUD(j);
    if (j.vies <= 0) this.eliminer(j);
  }

  eliminer(j) {
    j.elimine = true;
    j.tuiles.forEach((t) => this.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() }));
    j.tuiles = [];
    // un voile sombre sur son piano + un gros tampon "ÉLIMINÉ" (ou "TERMINÉ" en solo)
    this.add
      .rectangle(j.x, (Y_HAUT - 30 + 720) / 2, 3 * LARGEUR_COULOIR + 24, 720 - Y_HAUT + 30, 0x0b0618, 0.55)
      .setDepth(PROF.voile);
    var tampon = this.add
      .text(j.x, 330, this.solo ? "TERMINÉ" : "ÉLIMINÉ", style(46, "#ff4d5e", 8))
      .setOrigin(0.5)
      .setAngle(-12)
      .setDepth(PROF.hud)
      .setScale(3)
      .setAlpha(0);
    this.tweens.add({ targets: tampon, scale: 1, alpha: 1, duration: 300, ease: "Back.easeOut" });
    this.tweens.add({ targets: j.sprite, alpha: 0.5, angle: j.i == 0 ? -90 : 90, duration: 500 });
    jouerSon(this, "elimine", j.pan);
    this.verifierFin();
  }

  verifierFin() {
    if (this.etat == "jeu" && partieTerminee(this.joueurs)) this.fin();
  }

  fin() {
    this.etat = "fin";
    this.joueurs.forEach((j) => {
      j.tuiles.forEach((t) => this.tweens.add({ targets: t, alpha: 0, duration: 300, onComplete: () => t.destroy() }));
      j.tuiles = [];
    });
    annonce(this, "FIN DU RÉCITAL !", OR, 1700, 300);
    jouerSon(this, "bravo");
    this.time.delayedCall(2300, () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () =>
        this.scene.start("resultats", {
          scores: this.joueurs.map((j) => j.score),
          stats: [
            { titre: "Meilleur combo", valeurs: this.joueurs.map((j) => j.meilleurCombo) },
            { titre: "Notes jouées", valeurs: this.joueurs.map((j) => j.notesJouees) },
            { titre: "Tempo atteint", valeurs: this.joueurs.map((j) => Math.round(j.tempo) + " BPM") }
          ]
        })
      );
    });
  }
}
