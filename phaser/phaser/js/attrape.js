import { creerTouches, estEnfoncee, unJoueurAppuie } from "./controles.js";
import { jouerSon, jouerCelesta, lancerMusique, volumeMusique } from "./sons.js";
import { participants } from "./persos.js";
import { infosJeu } from "./jeux.js";
import { choisirMorceau } from "./repertoire.js";
import { afficherRecordEnJeu } from "./records.js";
import {
  style,
  panneauPresentation,
  fermerPanneau,
  creerMedaillon,
  texteFlottant,
  annonce,
  OR
} from "./interface.js";

const JEU = infosJeu("note_catcher"); // titre, fond, tableau des records...

// ---------------------------------------------------------------------------
// Réglages du mini-jeu
// ---------------------------------------------------------------------------
const DUREE_PARTIE = 60; // en secondes
// la partie se joue en 3 "mouvements" (comme un morceau), de plus en plus rapides
const MOUVEMENTS = [
  { debut: 0, nom: "Adagio", gravite: 240, intervalle: 0.8, portees: 2, fausses: 0.1, bougent: false },
  { debut: 20, nom: "Allegro", gravite: 320, intervalle: 0.6, portees: 3, fausses: 0.14, bougent: false },
  { debut: 40, nom: "Presto", gravite: 400, intervalle: 0.45, portees: 4, fausses: 0.18, bougent: true }
];
// les sortes de notes qui tombent
const TYPES = {
  croche: { texture: "tx_croche", points: 10, rayon: 16 },
  double: { texture: "tx_double", points: 20, rayon: 18 },
  or: { texture: "tx_or", points: 50, rayon: 18 },
  fausse: { texture: "tx_fausse", points: -30, rayon: 16 }
};
const ECHELLE_NOTES = 1.2; // les notes sont affichées un peu plus grandes que leur texture
const ECHELLE_PERSOS = 0.62;
const Y_SOL = 690; // les pieds des persos (le trottoir du décor)
const X_MIN = 50;
const X_MAX = 1230;
const X_DEPART_SOLO = [640];
const X_DEPART_DUO = [440, 840];
const VITESSE = 430; // px par seconde
const VITESSE_SPRINT = 720; // en maintenant A
const DEMI_LIVRE = 48; // demi-largeur du livre (la zone qui attrape)
const VITESSE_MAX_CHUTE = 560;
const REBOND = 0.55; // une portée renvoie 55 % de la vitesse de la note
const EPAISSEUR_PORTEE = 12; // demi-épaisseur de la portée pour les collisions
const ETOURDI = 0.9; // secondes "sonné" après une fausse note
const DELAI_COMBO = 4; // le combo retombe si on n'attrape rien pendant 4 s
const NOTES_PAR_BONUS = 8; // multiplicateur x2 à 8 notes de suite, x3 à 16

const PROF = { ombre: 2, portee: 3, note: 5, perso: 6, livre: 7, effet: 8, hud: 30 };

// Déroulement (this.etat) : presentation -> decompte -> jeu (60 s) -> fin
export default class attrape extends Phaser.Scene {
  constructor() {
    super({ key: "attrape" });
  }

  create() {
    this.touches = creerTouches(this);
    this.etat = "presentation";
    this.solo = this.registry.get("mode") == "solo";
    this.morceau = choisirMorceau();
    // chaque note attrapée joue la note suivante de cette mélodie
    this.melodie = this.morceau.phrases.flat();
    this.indexMelodie = 0;
    this.notes = []; // les notes en train de tomber
    this.portees = []; // les plateformes qui dévient les notes
    this.temps = 0; // temps écoulé depuis le début de la partie (s)
    this.prochaineNote = 0.6;
    this.mouvement = -1;
    this.derniereSeconde = -1;

    this.add.image(0, 0, JEU.fond).setOrigin(0);
    this.creerCentre();
    // en solo : le record à battre dans le coin en haut à droite
    if (this.solo) {
      this.add.rectangle(1150, 70, 210, 116, 0x1b1030, 0.8).setStrokeStyle(2, 0xe0a818).setDepth(PROF.hud);
      this.record = afficherRecordEnJeu(this, 1150, 34, JEU.cleRecords);
    }
    this.joueurs = participants(this.registry).map((perso, i) => this.creerJoueur(perso, i));

    lancerMusique(this);
    this.cameras.main.fadeIn(300);
    this.panneau = panneauPresentation(this, JEU.titre, [
      "Des notes tombent du ciel : attrape-les dans ton livre ouvert !",
      "Joystick gauche / droite pour te déplacer, A maintenu pour courir.",
      "Croche = 10 pts, double croche = 20 pts, note d'or = 50 pts.",
      "Évite les fausses notes (noires et rouges) : -30 pts et tu es sonné !",
      "Les portées volantes font dévier les notes. 60 secondes de jeu !",
      "Au programme : " + this.morceau.titre + " (" + this.morceau.auteur + ")"
    ]);
  }

  // ---------------------------------------------------------------------------
  // DECOR ET HUD
  // ---------------------------------------------------------------------------
  creerCentre() {
    // chrono rond en haut au milieu
    this.chrono = this.add.graphics().setDepth(PROF.hud);
    this.texteChrono = this.add.text(640, 56, "60", style(30)).setOrigin(0.5).setDepth(PROF.hud);
    this.texteMouvement = this.add.text(640, 112, "", style(24, OR, 5)).setOrigin(0.5).setDepth(PROF.hud);
    this.add
      .text(640, 138, "♪ " + this.morceau.titre + " - " + this.morceau.auteur, {
        fontFamily: "Georgia, serif",
        fontSize: "17px",
        fontStyle: "italic",
        color: "#ffe9a8",
        stroke: "#1b1030",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(PROF.hud);
    this.dessinerChrono();
  }

  dessinerChrono() {
    var reste = Math.max(0, DUREE_PARTIE - this.temps);
    var g = this.chrono;
    g.clear();
    g.fillStyle(0x1b1030, 0.85);
    g.fillCircle(640, 56, 42);
    // l'arc doré raccourcit avec le temps qui passe
    g.lineStyle(7, reste > 10 ? 0xffd23f : 0xff5a5a);
    g.beginPath();
    g.arc(640, 56, 36, -Math.PI / 2, -Math.PI / 2 + (2 * Math.PI * reste) / DUREE_PARTIE, false);
    g.strokePath();
    this.texteChrono.setText(Math.ceil(reste));
  }

  creerJoueur(perso, i) {
    var j = {
      perso: perso,
      i: i,
      touches: this.touches[i],
      x: this.solo ? X_DEPART_SOLO[i] : X_DEPART_DUO[i],
      vx: 0,
      pas: 0, // pour l'animation de marche
      etourdi: 0,
      etoiles: [],
      score: 0,
      combo: 0,
      meilleurCombo: 0,
      attrapees: 0,
      fausses: 0,
      dernierAttrape: 0
    };
    j.ombre = this.add.ellipse(j.x, Y_SOL, 80, 16, 0x000000, 0.4).setDepth(PROF.ombre);
    j.sprite = this.add
      .image(j.x, Y_SOL, perso.texture)
      .setOrigin(0.5, 1)
      .setScale(ECHELLE_PERSOS)
      .setFlipX(i == 1)
      .setDepth(PROF.perso);
    // le livre ouvert tenu au-dessus de la tete
    j.livre = this.add.image(j.x, 0, "tx_livre").setOrigin(0.5, 0.3).setDepth(PROF.livre);
    this.placerLivre(j);

    // HUD dans le coin : la tete du perso, le score juste à coté, le combo dessous
    var gauche = i == 0;
    creerMedaillon(this, gauche ? 70 : 1210, 60, perso, perso.etiquette);
    j.texteScore = this.add
      .text(gauche ? 122 : 1158, 44, "0", style(34, perso.couleur))
      .setOrigin(gauche ? 0 : 1, 0.5)
      .setDepth(PROF.hud);
    j.texteCombo = this.add
      .text(gauche ? 124 : 1156, 84, "", style(18, OR, 4))
      .setOrigin(gauche ? 0 : 1, 0.5)
      .setDepth(PROF.hud);
    return j;
  }

  placerLivre(j) {
    j.livre.x = j.sprite.x;
    j.livre.y = j.sprite.y - j.sprite.displayHeight - 6;
    // hauteur où une note est attrapée (le haut des pages)
    j.yLivre = j.livre.y - 4;
  }

  multiplicateur(j) {
    return Math.min(3, 1 + Math.floor(j.combo / NOTES_PAR_BONUS));
  }

  majHUD(j) {
    j.texteScore.setText(j.score);
    if (this.solo) this.record.verifier(j.score);
    var multi = this.multiplicateur(j);
    var texte = "";
    if (j.combo > 1) texte = j.combo + " combos";
    if (multi > 1) texte = "x" + multi + "  ·  " + texte;
    j.texteCombo.setText(texte);
  }

  // ---------------------------------------------------------------------------
  // DEROULEMENT
  // ---------------------------------------------------------------------------
  decompte() {
    this.etat = "decompte";
    volumeMusique(this, 0.1); // musique très douce : on doit entendre les notes attrapées
    this.changerMouvement(0);
    ["3", "2", "1"].forEach((texte, k) => {
      this.time.delayedCall(k * 700, () => {
        annonce(this, texte, OR, 400, 330);
        jouerSon(this, "tic");
      });
    });
    this.time.delayedCall(2100, () => {
      this.etat = "jeu";
      annonce(this, "Attrapez !", "#ffffff", 600, 330);
      jouerSon(this, "top");
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
    this.joueurs.forEach((j) => this.deplacer(j, dt));
    if (this.etat != "jeu") return;

    this.temps += dt;
    this.dessinerChrono();
    this.tictac();
    var m = MOUVEMENTS.filter((mvt) => this.temps >= mvt.debut).length - 1;
    if (m != this.mouvement) this.changerMouvement(m);

    // une nouvelle note tombe de temps en temps (intervalle un peu aléatoire)
    if (this.temps >= this.prochaineNote && this.temps < DUREE_PARTIE - 1) {
      this.lacherNote();
      this.prochaineNote = this.temps + MOUVEMENTS[this.mouvement].intervalle * Phaser.Math.FloatBetween(0.7, 1.3);
    }
    this.bougerPortees();
    this.notes.slice().forEach((n) => this.avancerNote(n, dt));

    // le combo retombe si on n'attrape rien pendant un moment
    this.joueurs.forEach((j) => {
      if (j.combo > 0 && this.temps - j.dernierAttrape > DELAI_COMBO) {
        j.combo = 0;
        this.majHUD(j);
      }
    });
    if (this.temps >= DUREE_PARTIE) this.fin();
  }

  // les 5 dernières secondes : un "tic" par seconde
  tictac() {
    var seconde = Math.ceil(DUREE_PARTIE - this.temps);
    if (seconde <= 5 && seconde > 0 && seconde != this.derniereSeconde) {
      jouerSon(this, "tic");
      this.tweens.add({ targets: this.texteChrono, scale: 1.4, duration: 120, yoyo: true });
    }
    this.derniereSeconde = seconde;
  }

  changerMouvement(m) {
    this.mouvement = m;
    var mvt = MOUVEMENTS[m];
    this.texteMouvement.setText(mvt.nom);
    this.placerPortees(mvt);
    if (m > 0) {
      annonce(this, mvt.nom.toUpperCase() + " !", OR, 1000, 330);
      jouerSon(this, "combo");
    }
  }

  fin() {
    this.etat = "fin";
    this.notes.forEach((n) => this.tweens.add({ targets: n.sprite, alpha: 0, duration: 300, onComplete: () => n.sprite.destroy() }));
    this.notes = [];
    this.joueurs.forEach((j) => {
      j.sprite.setAngle(0).setY(Y_SOL);
      j.etoiles.forEach((e) => e.destroy());
    });
    annonce(this, "FIN !", OR, 1500, 330);
    jouerSon(this, "bravo");
    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () =>
        this.scene.start("resultats", {
          scores: this.joueurs.map((j) => j.score),
          stats: [
            { titre: "Notes attrapées", valeurs: this.joueurs.map((j) => j.attrapees) },
            { titre: "Meilleur combo", valeurs: this.joueurs.map((j) => j.meilleurCombo) },
            { titre: "Fausses notes", valeurs: this.joueurs.map((j) => j.fausses) }
          ]
        })
      );
    });
  }

  // ---------------------------------------------------------------------------
  // LES PORTEES VOLANTES (plateformes qui dévient les notes)
  // ---------------------------------------------------------------------------
  // A chaque mouvement, on tire au hasard une nouvelle disposition :
  // chaque partie est différente.
  placerPortees(mvt) {
    this.portees.forEach((p) =>
      this.tweens.add({ targets: p.image, alpha: 0, duration: 400, onComplete: () => p.image.destroy() })
    );
    this.portees = [];
    var essais = 0;
    while (this.portees.length < mvt.portees && essais < 200) {
      essais++;
      var signe = Math.random() < 0.5 ? -1 : 1;
      var p = {
        cx: Phaser.Math.Between(230, 1050),
        cy: Phaser.Math.Between(250, 470),
        longueur: Phaser.Math.Between(150, 200),
        angle: Phaser.Math.DegToRad(Phaser.Math.Between(15, 32)) * signe,
        // au Presto, elles glissent de gauche à droite
        amplitude: mvt.bougent ? Phaser.Math.Between(60, 110) : 0,
        phase: Phaser.Math.FloatBetween(0, 2 * Math.PI)
      };
      // pas trop près d'une autre portée
      if (this.portees.some((q) => Math.abs(q.cx - p.cx) < 250 && Math.abs(q.cy - p.cy) < 140)) continue;
      p.xBase = p.cx;
      p.image = this.add
        .image(p.cx, p.cy, "tx_portee")
        .setDisplaySize(p.longueur, 28)
        .setRotation(p.angle)
        .setDepth(PROF.portee)
        .setAlpha(0);
      this.tweens.add({ targets: p.image, alpha: 1, duration: 400 });
      this.calculerBouts(p);
      this.portees.push(p);
    }
  }

  // les 2 extrémités du segment (la portée est inclinée de "angle")
  calculerBouts(p) {
    var dx = (Math.cos(p.angle) * p.longueur) / 2;
    var dy = (Math.sin(p.angle) * p.longueur) / 2;
    p.x1 = p.cx - dx;
    p.y1 = p.cy - dy;
    p.x2 = p.cx + dx;
    p.y2 = p.cy + dy;
  }

  bougerPortees() {
    this.portees.forEach((p) => {
      if (p.amplitude == 0) return;
      p.cx = p.xBase + p.amplitude * Math.sin(this.temps * 1.4 + p.phase);
      p.image.x = p.cx;
      this.calculerBouts(p);
    });
  }

  // Rebond d'une note (un cercle) sur une portée (un segment) :
  // 1) on cherche le point Q de la portée le plus proche de la note
  // 2) si la note touche la portée, la "normale" n = (note - Q) / distance
  //    indique dans quelle direction la repousser
  // 3) on inverse la partie de la vitesse qui va vers la portée (v.n),
  //    en la réduisant : v = v - (1 + REBOND) * (v.n) * n
  // Sur une portée inclinée, la note repart donc en biais : elle est déviée.
  rebondir(n, p) {
    var dx = p.x2 - p.x1;
    var dy = p.y2 - p.y1;
    var t = ((n.x - p.x1) * dx + (n.y - p.y1) * dy) / (dx * dx + dy * dy);
    t = Phaser.Math.Clamp(t, 0, 1);
    var qx = p.x1 + t * dx;
    var qy = p.y1 + t * dy;
    var ex = n.x - qx;
    var ey = n.y - qy;
    var distance = Math.sqrt(ex * ex + ey * ey);
    var contact = n.rayon + EPAISSEUR_PORTEE;
    if (distance >= contact || distance == 0) return;
    var nx = ex / distance;
    var ny = ey / distance;
    var vn = n.vx * nx + n.vy * ny; // vitesse "vers" la portée
    if (vn >= 0) return; // la note s'éloigne déjà
    n.vx -= (1 + REBOND) * vn * nx;
    n.vy -= (1 + REBOND) * vn * ny;
    // on sort la note de la portée pour qu'elle ne reste pas coincée dedans
    n.x = qx + nx * contact;
    n.y = qy + ny * contact;
    if (vn < -120) {
      // un vrai choc (pas juste une glissade) : petite étincelle
      jouerSon(this, "attrape", (n.x - 640) / 800);
      this.etincelles(n.x, n.y, 0xffe9a8, 3);
    }
  }

  // ---------------------------------------------------------------------------
  // LES NOTES QUI TOMBENT
  // ---------------------------------------------------------------------------
  lacherNote() {
    var mvt = MOUVEMENTS[this.mouvement];
    var tirage = Math.random();
    var type = "croche";
    if (tirage < mvt.fausses) type = "fausse";
    else if (tirage < mvt.fausses + 0.05) type = "or";
    else if (tirage < mvt.fausses + 0.3) type = "double";
    var infos = TYPES[type];
    var x = Phaser.Math.Between(70, 1210);
    var n = {
      type: type,
      x: x,
      y: -30,
      yPrec: -30,
      // la note d'or part en biais (plus dure à attraper), les autres presque droit
      vx: type == "or" ? Phaser.Math.Between(90, 140) * (x < 640 ? 1 : -1) : Phaser.Math.Between(-40, 40),
      vy: type == "double" ? 80 : 0,
      rayon: infos.rayon * ECHELLE_NOTES,
      sprite: this.add.image(x, -30, infos.texture).setScale(ECHELLE_NOTES).setDepth(PROF.note)
    };
    if (type == "or") this.tweens.add({ targets: n.sprite, scale: ECHELLE_NOTES * 1.15, duration: 300, yoyo: true, repeat: -1 });
    this.notes.push(n);
  }

  // La chute est calculée à la main : la vitesse augmente avec la gravité
  // (v = v + g.dt) et la position avec la vitesse (y = y + v.dt)
  avancerNote(n, dt) {
    var gravite = MOUVEMENTS[this.mouvement].gravite;
    n.yPrec = n.y;
    n.vy = Math.min(n.vy + gravite * dt, VITESSE_MAX_CHUTE);
    n.x += n.vx * dt;
    n.y += n.vy * dt;
    // les bords de l'écran renvoient la note
    if (n.x < 20) {
      n.x = 20;
      n.vx = Math.abs(n.vx) * 0.6;
    }
    if (n.x > 1260) {
      n.x = 1260;
      n.vx = -Math.abs(n.vx) * 0.6;
    }
    this.portees.forEach((p) => this.rebondir(n, p));
    n.sprite.setPosition(n.x, n.y);
    n.sprite.setRotation(Phaser.Math.Clamp(n.vx / 600, -0.5, 0.5)); // elle penche quand elle part en biais

    var j = this.quiAttrape(n);
    if (j) this.attraper(j, n);
    else if (n.y > Y_SOL - 10) this.tomberParTerre(n);
  }

  // la note vient de traverser la ligne du livre d'un joueur ?
  quiAttrape(n) {
    if (n.vy <= 0) return null;
    var choisi = null;
    this.joueurs.forEach((j) => {
      if (j.etourdi > 0) return; // sonné : il a lâché son livre
      var traverse = n.yPrec < j.yLivre && n.y >= j.yLivre;
      var dessus = Math.abs(n.x - j.x) <= DEMI_LIVRE + n.rayon / 2;
      if (traverse && dessus && (choisi == null || Math.abs(n.x - j.x) < Math.abs(n.x - choisi.x))) choisi = j;
    });
    return choisi;
  }

  retirerNote(n) {
    this.notes = this.notes.filter((autre) => autre != n);
  }

  attraper(j, n) {
    this.retirerNote(n);
    var infos = TYPES[n.type];
    var pan = (j.x - 640) / 800;
    // la note plonge dans le livre
    this.tweens.add({
      targets: n.sprite,
      x: j.x,
      y: j.yLivre + 6,
      scale: 0.2,
      duration: 120,
      onComplete: () => n.sprite.destroy()
    });
    this.tweens.add({ targets: j.livre, scaleY: 0.7, duration: 60, yoyo: true });

    if (n.type == "fausse") {
      j.score = Math.max(0, j.score + infos.points);
      j.combo = 0;
      j.fausses++;
      j.etourdi = ETOURDI;
      jouerSon(this, "couac", pan);
      texteFlottant(this, j.x, j.yLivre - 30, "Couac ! " + infos.points, "#ff4d5e", 26);
      this.cameras.main.shake(150, 0.005);
      this.creerEtoiles(j);
    } else {
      j.combo++;
      j.meilleurCombo = Math.max(j.meilleurCombo, j.combo);
      j.attrapees++;
      j.dernierAttrape = this.temps;
      var multi = this.multiplicateur(j);
      var points = infos.points * multi;
      j.score += points;
      // chaque note attrapée joue la note suivante de la mélodie
      jouerCelesta(this, this.melodie[this.indexMelodie % this.melodie.length], { pan: pan });
      this.indexMelodie++;
      if (n.type == "or") jouerSon(this, "bonus", pan);
      texteFlottant(this, n.x, j.yLivre - 30, "+" + points, n.type == "or" ? OR : "#ffffff", n.type == "or" ? 30 : 22);
      if (j.combo % NOTES_PAR_BONUS == 0 && j.combo <= 2 * NOTES_PAR_BONUS) {
        texteFlottant(this, j.x, j.yLivre - 75, "COMBO x" + multi + " !", OR, 30);
        jouerSon(this, "combo", pan);
      }
      this.etincelles(n.x, j.yLivre, j.perso.teinte, 6);
    }
    this.majHUD(j);
  }

  tomberParTerre(n) {
    this.retirerNote(n);
    this.etincelles(n.x, Y_SOL - 8, n.type == "fausse" ? 0xff4d5e : 0xfff3c4, 4);
    this.tweens.add({
      targets: n.sprite,
      alpha: 0,
      scaleY: 0.3,
      y: Y_SOL,
      duration: 200,
      onComplete: () => n.sprite.destroy()
    });
  }

  etincelles(x, y, couleur, nombre) {
    for (var k = 0; k < nombre; k++) {
      var e = this.add.image(x, y, "tx_etincelle").setTint(couleur).setScale(0.6).setDepth(PROF.effet);
      this.tweens.add({
        targets: e,
        x: x + Phaser.Math.Between(-40, 40),
        y: y - Phaser.Math.Between(10, 50),
        alpha: 0,
        scale: 0.1,
        duration: 400,
        onComplete: () => e.destroy()
      });
    }
  }

  // 3 petites étoiles qui tournent autour de la tete quand on est sonné
  creerEtoiles(j) {
    j.etoiles.forEach((e) => e.destroy());
    j.etoiles = [0, 1, 2].map(() => this.add.image(j.x, j.yLivre, "tx_etoile").setScale(0.5).setDepth(PROF.effet));
  }

  // ---------------------------------------------------------------------------
  // DEPLACEMENT DES PERSOS
  // ---------------------------------------------------------------------------
  deplacer(j, dt) {
    var direction = 0;
    if (estEnfoncee(j.touches.gauche)) direction -= 1;
    if (estEnfoncee(j.touches.droite)) direction += 1;
    var sprint = estEnfoncee(j.touches.a);
    if (this.etat != "jeu" && this.etat != "decompte") direction = 0;
    if (j.etourdi > 0) {
      j.etourdi -= dt;
      direction = 0;
    }

    var vitesseMax = sprint ? VITESSE_SPRINT : VITESSE;
    // accélération douce vers la vitesse voulue (sinon ça fait trop "robot")
    j.vx += (direction * vitesseMax - j.vx) * Math.min(1, dt * 12);
    j.x = Phaser.Math.Clamp(j.x + j.vx * dt, X_MIN, X_MAX);
    if (direction != 0) j.sprite.setFlipX(direction < 0);

    // animation de marche : le perso se dandine et sautille
    if (Math.abs(j.vx) > 40) {
      j.pas += dt * (sprint ? 18 : 12);
      j.sprite.setAngle(Math.sin(j.pas) * 7);
      j.sprite.y = Y_SOL - Math.abs(Math.sin(j.pas)) * 6;
    } else {
      j.sprite.setAngle(0);
      j.sprite.y = Y_SOL;
    }
    j.sprite.x = j.x;
    j.ombre.x = j.x;
    this.placerLivre(j);
    // sonné : le livre penche et les étoiles tournent
    j.livre.setAngle(j.etourdi > 0 ? 28 : j.sprite.angle * 0.6);
    if (j.etourdi > 0) {
      j.etoiles.forEach((e, k) => {
        var a = this.time.now / 150 + (k * 2 * Math.PI) / 3;
        e.setPosition(j.x + Math.cos(a) * 34, j.yLivre + 20 + Math.sin(a) * 8);
      });
    } else if (j.etoiles.length > 0) {
      j.etoiles.forEach((e) => e.destroy());
      j.etoiles = [];
    }
  }
}
