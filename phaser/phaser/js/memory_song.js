import { creerTouches, vientDAppuyer, unJoueurAppuie, oublierAppuis, BOUTONS, LETTRES } from "./controles.js";
import { jouerSon, jouerSaxo, lancerMusique, volumeMusique } from "./sons.js";
import { participants } from "./persos.js";
import { infosJeu } from "./jeux.js";
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
  respirer,
  partieTerminee,
  OR
} from "./interface.js";

const JEU = infosJeu("memory_song"); // titre, fond, tableau des records...

// ---------------------------------------------------------------------------
// Réglages du mini-jeu
// ---------------------------------------------------------------------------
const X_SAXO = 320; // coin en haut à gauche du saxophone (image de 640 x 394)
const Y_SAXO = 118;
// centre de chaque touche dans l'image du saxophone (mesuré sur les images
// touche1 à touche6) : A B C en haut, D E F en bas, rangées comme les
// boutons de la borne d'arcade
const TOUCHES = [
  { x: 189, y: 176 },
  { x: 272, y: 185 },
  { x: 356, y: 185 },
  { x: 189, y: 258 },
  { x: 272, y: 266 },
  { x: 356, y: 266 }
];
// la note de chaque touche : Sol La Do en haut (aigu), Do Ré Mi en bas (grave).
// C'est une gamme "pentatonique" : n'importe quelle suite de notes sonne bien.
const NOTES = [67, 69, 72, 60, 62, 64];
const COULEURS = [0xff5a5a, 0xffa23a, 0xffe14d, 0x5ee06a, 0x4db8ff, 0xc77dff];
const TEINTE_ETEINTE = 0xa08868; // touche au repos : dorée mais plus sombre

const LONGUEUR_DEPART = 3; // la 1re mélodie a 3 notes, puis une de plus à chaque manche
const CHANCES = 3;
const DELAI_REPONSE = 4000; // ms max pour jouer la note suivante, sinon "trop lent"
const POINTS_NOTE = 10;
const BONUS_MELODIE = 50;

const X_PERSOS = [150, 1130];
const Y_PIEDS = 592;
const Y_PROGRES = 632; // les ronds qui montrent où on en est dans la mélodie
const Y_CHRONO = 662;

const PROF = { saxo: 2, halo: 3, touche: 4, lettre: 5, projecteur: 6, perso: 7, hud: 30 };

// Déroulement (this.etat) :
// presentation -> demo (le saxo joue) -> saisie (les joueurs rejouent)
// -> bilan -> demo de la manche suivante... -> fin
export default class memory_song extends Phaser.Scene {
  constructor() {
    super({ key: "memory_song" });
  }

  create() {
    this.touches = creerTouches(this);
    this.etat = "presentation";
    this.solo = this.registry.get("mode") == "solo";
    this.manche = 0;
    // la mélodie : une liste de touches (0 = A ... 5 = F). La 1re manche en
    // ajoute une, donc on part avec LONGUEUR_DEPART - 1 notes.
    this.sequence = [];
    for (var k = 0; k < LONGUEUR_DEPART - 1; k++) this.sequence.push(this.noteAuHasard());

    this.add.image(0, 0, JEU.fond).setOrigin(0);
    this.creerSaxo();
    this.creerTextes();
    // en solo : le record à battre dans le coin en haut à droite
    if (this.solo) {
      this.add.rectangle(1150, 70, 210, 116, 0x1b1030, 0.8).setStrokeStyle(2, 0xe0a818).setDepth(PROF.hud);
      this.record = afficherRecordEnJeu(this, 1150, 34, JEU.cleRecords);
    }
    this.joueurs = participants(this.registry).map((perso, i) => this.creerJoueur(perso, i));

    lancerMusique(this);
    this.cameras.main.fadeIn(300);
    this.panneau = panneauPresentation(this, JEU.titre, [
      "Le saxophone joue une mélodie : regarde et écoute bien ses touches.",
      "Rejoue-la ensuite avec tes boutons : A B C en haut, D E F en bas,",
      "rangés exactement comme les touches du saxophone.",
      "À chaque manche, la mélodie a une note de plus !",
      "Une fausse note (ou trop lent) = une chance en moins. 3 chances."
    ]);
  }

  // pas 3 fois de suite la meme touche (ce serait trop facile... ou trop bizarre)
  noteAuHasard() {
    var s = this.sequence;
    var n;
    do {
      n = Phaser.Math.Between(0, 5);
    } while (s.length >= 2 && n == s[s.length - 1] && n == s[s.length - 2]);
    return n;
  }

  // ---------------------------------------------------------------------------
  // DECOR
  // ---------------------------------------------------------------------------
  creerSaxo() {
    this.add.image(X_SAXO, Y_SAXO, "img_saxo").setOrigin(0).setDepth(PROF.saxo);
    this.touchesSaxo = TOUCHES.map((pos, k) => {
      var x = X_SAXO + pos.x;
      var y = Y_SAXO + pos.y;
      var couleur = "#" + COULEURS[k].toString(16).padStart(6, "0");
      return {
        halo: this.add.image(x, y, "tx_halo").setTint(COULEURS[k]).setAlpha(0).setDepth(PROF.halo),
        image: this.add.image(x, y, "img_touche" + (k + 1)).setTint(TEINTE_ETEINTE).setDepth(PROF.touche),
        lettre: this.add
          .text(x, y, LETTRES[k], style(26, couleur, 6))
          .setOrigin(0.5)
          .setDepth(PROF.lettre)
      };
    });
    // le projecteur qui éclaire le saxo quand il joue
    this.projecteur = this.add
      .image(640, 0, "tx_projecteur")
      .setOrigin(0.5, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0)
      .setDepth(PROF.projecteur);
  }

  creerTextes() {
    // bandeau sombre derrière le titre (sinon on le lit mal sur le lustre)
    this.add.rectangle(640, 55, 420, 96, 0x1b1030, 0.8).setStrokeStyle(2, 0xe0a818).setDepth(PROF.hud);
    this.add.text(640, 34, JEU.titre, style(36, OR, 8)).setOrigin(0.5).setDepth(PROF.hud);
    this.texteManche = this.add.text(640, 76, "", styleTexte(22, "#ffe9a8")).setOrigin(0.5).setDepth(PROF.hud);
    this.texteStatut = this.add.text(640, 552, "", style(32)).setOrigin(0.5).setDepth(PROF.hud);
  }

  statut(texte, couleur) {
    this.texteStatut.setText(texte).setColor(couleur || "#ffffff").setScale(0.6);
    this.tweens.add({ targets: this.texteStatut, scale: 1, duration: 250, ease: "Back.easeOut" });
  }

  // allume une touche du saxo (couleur + halo) puis elle se rééteint
  allumer(k, duree, couleur) {
    var t = this.touchesSaxo[k];
    this.tweens.killTweensOf([t.image, t.halo, t.lettre]);
    t.image.clearTint().setScale(1.18);
    t.halo.setTint(couleur || COULEURS[k]).setAlpha(1).setScale(1.5);
    t.lettre.setScale(1.3);
    this.tweens.add({ targets: t.image, scale: 1, duration: 150, delay: duree, onStart: () => t.image.setTint(TEINTE_ETEINTE) });
    this.tweens.add({ targets: t.halo, alpha: 0, scale: 1.2, duration: 200, delay: duree });
    this.tweens.add({ targets: t.lettre, scale: 1, duration: 150, delay: duree });
  }

  // ---------------------------------------------------------------------------
  // JOUEURS
  // ---------------------------------------------------------------------------
  creerJoueur(perso, i) {
    var x = X_PERSOS[i];
    var j = {
      perso: perso,
      i: i,
      x: x,
      touches: this.touches[i],
      // en duo, J1 entend ses notes à gauche et J2 à droite
      pan: this.solo ? 0 : i == 0 ? -0.6 : 0.6,
      score: 0,
      chances: CHANCES,
      elimine: false,
      position: 0, // combien de notes de la mélodie il a déjà rejouées
      fini: true, // a fini la manche en cours (réussie ou ratée)
      reussi: false,
      limite: 0, // heure limite pour jouer la note suivante
      notesJustes: 0,
      plusLongue: 0
    };
    j.sprite = this.add
      .image(x, Y_PIEDS, perso.texture)
      .setOrigin(0.5, 1)
      .setScale(0.85)
      .setFlipX(i == 1)
      .setDepth(PROF.perso);
    respirer(this, j.sprite);

    // HUD en haut dans le coin : la tete, le score à coté et les chances
    var gauche = i == 0;
    var xTete = gauche ? 70 : 1210;
    creerMedaillon(this, xTete, 62, perso, perso.etiquette);
    j.texteScore = this.add
      .text(gauche ? 122 : 1158, 46, "0", style(34, perso.couleur))
      .setOrigin(gauche ? 0 : 1, 0.5)
      .setDepth(PROF.hud);
    j.imagesVies = creerVies(this, gauche ? 132 : 1096, 90, CHANCES).map((v) => v.setScale(0.8));

    j.progres = this.add.graphics().setDepth(PROF.hud);
    j.chrono = this.add.graphics().setDepth(PROF.hud);
    return j;
  }

  majScore(j) {
    j.texteScore.setText(j.score);
    this.tweens.add({ targets: j.texteScore, scale: 1.25, duration: 90, yoyo: true });
    if (this.solo) this.record.verifier(j.score);
  }

  // une rangée de ronds : plein = note déjà rejouée
  dessinerProgres(j) {
    var g = j.progres;
    g.clear();
    if (j.elimine) return;
    var n = this.sequence.length;
    var ecart = Math.min(26, 230 / n);
    var x0 = j.x - (ecart * (n - 1)) / 2;
    for (var k = 0; k < n; k++) {
      var x = x0 + k * ecart;
      if (k < j.position) {
        g.fillStyle(j.reussi ? 0xffd23f : j.perso.teinte);
        g.fillCircle(x, Y_PROGRES, 8);
      }
      g.lineStyle(2, 0xffffff, 0.9);
      g.strokeCircle(x, Y_PROGRES, 8);
    }
  }

  // bulle au-dessus de la tete avec le bouton joué (rouge si c'est faux)
  bulle(j, k, estJuste) {
    var y = Y_PIEDS - j.sprite.displayHeight - 36;
    var bulle = this.add.image(j.x, y, "tx_bulle").setDepth(PROF.hud).setScale(0.5);
    var couleur = estJuste ? "#" + COULEURS[k].toString(16).padStart(6, "0") : "#ff4d5e";
    var lettre = this.add
      .text(j.x, y - 4, LETTRES[k], style(28, couleur, 5))
      .setOrigin(0.5)
      .setDepth(PROF.hud)
      .setScale(0.5);
    this.tweens.add({ targets: [bulle, lettre], scale: 1, duration: 120, ease: "Back.easeOut" });
    this.tweens.add({
      targets: [bulle, lettre],
      alpha: 0,
      y: "-=20",
      delay: 250,
      duration: 250,
      onComplete: () => {
        bulle.destroy();
        lettre.destroy();
      }
    });
  }

  // ---------------------------------------------------------------------------
  // DEROULEMENT D'UNE MANCHE
  // ---------------------------------------------------------------------------
  commencer() {
    volumeMusique(this, 0); // on coupe la musique pour bien entendre le saxo
    annonce(this, "Prêts ?", OR, 900, 330);
    this.time.delayedCall(1300, () => this.nouvelleManche());
  }

  nouvelleManche() {
    this.manche++;
    this.sequence.push(this.noteAuHasard()); // 1 note de plus à chaque fois
    this.texteManche.setText("Mélodie n°" + this.manche + "  ·  " + this.sequence.length + " notes");
    this.joueurs.forEach((j) => {
      j.position = 0;
      j.fini = j.elimine;
      j.reussi = false;
      this.dessinerProgres(j);
    });
    this.time.delayedCall(600, () => this.demonstration());
  }

  // le saxophone joue la mélodie : chaque touche s'allume avec sa note.
  // Plus la mélodie est longue, plus il joue vite.
  demonstration() {
    this.etat = "demo";
    this.statut("Écoute bien...");
    this.tweens.add({ targets: this.projecteur, alpha: 1, duration: 300 });
    var duree = Math.max(0.22, 0.5 - 0.025 * (this.sequence.length - LONGUEUR_DEPART)); // en secondes
    var pas = (duree + 0.14) * 1000; // en ms
    this.sequence.forEach((k, rang) => {
      this.time.delayedCall(300 + rang * pas, () => {
        this.allumer(k, duree * 1000);
        jouerSaxo(this, NOTES[k], { duree: duree });
      });
    });
    this.time.delayedCall(300 + this.sequence.length * pas + 250, () => this.aVous());
  }

  aVous() {
    this.etat = "saisie";
    this.statut("À vous de jouer !", OR);
    this.tweens.add({ targets: this.projecteur, alpha: 0, duration: 300 });
    oublierAppuis(this.touches); // les appuis faits pendant la démo ne comptent pas
    this.joueurs.forEach((j) => {
      if (j.elimine) return;
      // un peu plus de temps pour la 1re note
      j.limite = this.time.now + DELAI_REPONSE + 1000;
    });
  }

  update() {
    if (this.etat == "presentation") {
      if (unJoueurAppuie(this.touches, "a")) {
        this.etat = "lancement";
        jouerSon(this, "valider");
        fermerPanneau(this, this.panneau, () => this.commencer());
      }
      return;
    }

    // on lit les 6 boutons de chaque joueur à chaque image
    // (meme hors de la saisie, pour ne pas garder de vieux appuis)
    this.joueurs.forEach((j) => {
      BOUTONS.forEach((bouton, k) => {
        if (vientDAppuyer(j.touches[bouton]) && this.etat == "saisie") this.jouerTouche(j, k);
      });
    });

    if (this.etat != "saisie") return;
    // le chrono de chaque joueur : trop lent = erreur
    this.joueurs.forEach((j) => {
      j.chrono.clear();
      if (j.elimine || j.fini) return;
      var reste = Phaser.Math.Clamp((j.limite - this.time.now) / DELAI_REPONSE, 0, 1);
      j.chrono.fillStyle(0x000000, 0.5);
      j.chrono.fillRoundedRect(j.x - 102, Y_CHRONO - 7, 204, 14, 6);
      j.chrono.fillStyle(reste > 0.3 ? 0x5ee06a : 0xff5a5a);
      j.chrono.fillRoundedRect(j.x - 100, Y_CHRONO - 5, 200 * reste, 10, 5);
      if (this.time.now > j.limite) this.erreur(j, "Trop lent !");
    });
  }

  // le joueur j appuie sur la touche k
  jouerTouche(j, k) {
    if (j.fini || j.elimine) return;
    var attendue = this.sequence[j.position];
    if (k != attendue) {
      this.bulle(j, k, false);
      if (this.solo) this.allumer(k, 250, 0xff2020);
      this.erreur(j, "Fausse note !");
      return;
    }
    this.bulle(j, k, true);
    jouerSaxo(this, NOTES[k], { duree: 0.3, pan: j.pan });
    // en solo, les touches du saxo s'allument quand le joueur joue
    // (en duo on ne les allume pas, sinon l'autre pourrait copier)
    if (this.solo) this.allumer(k, 250);

    j.position++;
    j.notesJustes++;
    j.score += POINTS_NOTE;
    j.limite = this.time.now + DELAI_REPONSE;
    this.majScore(j);
    this.dessinerProgres(j);
    if (j.position >= this.sequence.length) this.reussite(j);
  }

  reussite(j) {
    j.fini = true;
    j.reussi = true;
    j.score += BONUS_MELODIE;
    j.plusLongue = Math.max(j.plusLongue, this.sequence.length);
    j.chrono.clear();
    this.majScore(j);
    this.dessinerProgres(j);
    jouerSon(this, "bravo", j.pan);
    texteFlottant(this, j.x, Y_PIEDS - j.sprite.displayHeight - 60, "Bravo ! +" + BONUS_MELODIE, OR, 28);
    this.tweens.add({ targets: j.sprite, y: Y_PIEDS - 30, duration: 150, yoyo: true, repeat: 1, ease: "Quad.easeOut" });
    this.verifierFinManche();
  }

  erreur(j, texte) {
    if (j.fini) return;
    j.fini = true;
    j.reussi = false;
    j.chances--;
    j.chrono.clear();
    casserVie(this, j.imagesVies[j.chances]);
    jouerSon(this, "couac", j.pan);
    texteFlottant(this, j.x, Y_PIEDS - j.sprite.displayHeight - 60, texte, "#ff4d5e", 28);
    this.tweens.add({ targets: j.sprite, x: j.x + 8, duration: 50, yoyo: true, repeat: 3 });
    if (j.chances <= 0) this.eliminer(j);
    this.verifierFinManche();
  }

  eliminer(j) {
    j.elimine = true;
    j.progres.clear();
    this.tweens.killTweensOf(j.sprite);
    j.sprite.setScale(0.85).setX(j.x);
    var tampon = this.add
      .text(j.x, Y_PROGRES, this.solo ? "TERMINÉ" : "ÉLIMINÉ", style(34, "#ff4d5e", 7))
      .setOrigin(0.5)
      .setAngle(-8)
      .setDepth(PROF.hud)
      .setScale(3)
      .setAlpha(0);
    this.tweens.add({ targets: tampon, scale: 1, alpha: 1, duration: 300, ease: "Back.easeOut" });
    jouerSon(this, "elimine", j.pan);
  }

  // quand tout le monde a fini la manche : manche suivante (ou fin)
  verifierFinManche() {
    if (this.etat != "saisie") return;
    if (this.joueurs.some((j) => !j.fini)) return;
    this.etat = "bilan";
    this.time.delayedCall(1400, () => {
      if (partieTerminee(this.joueurs)) this.fin();
      else this.nouvelleManche();
    });
  }

  fin() {
    this.etat = "fin";
    this.statut("");
    annonce(this, "FIN DU CONCERT !", OR, 1700, 330);
    jouerSon(this, "bravo");
    this.time.delayedCall(2300, () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () =>
        this.scene.start("resultats", {
          scores: this.joueurs.map((j) => j.score),
          stats: [
            { titre: "Plus longue mélodie", valeurs: this.joueurs.map((j) => j.plusLongue + " notes") },
            { titre: "Notes justes", valeurs: this.joueurs.map((j) => j.notesJustes) }
          ]
        })
      );
    });
  }
}
