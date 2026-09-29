import { creerTouches, vientDAppuyer, unJoueurAppuie } from "./controles.js";
import { jouerSon, jouerTampon, sifflet, lancerMusique, volumeMusique } from "./sons.js";
import { participants } from "./persos.js";

// ---------------------------------------------------------------------------
// Réglages du mini-jeu
// ---------------------------------------------------------------------------
const PX_PAR_CM = 8; // 8 pixels à l'écran = 1 cm sur la partition
const Y_DEPART = 215; // hauteur des pattes quand le perso est sur sa feuille
const Y_LIGNE = 610; // la ligne dorée à viser (1re ligne de la portée)
const ECART_LIGNES = 14; // écart entre les lignes de la portée
const CM_RATE = 60; // score si on dépasse la ligne
const X_COULOIRS = [440, 840]; // en duo, un couloir par joueur
const X_COULOIR_SOLO = 640; // en solo, un seul couloir au milieu
const ECHELLE = 3; // les persos font 32 px, on les grossit x3

// les 3 essais : de plus en plus dur
const MANCHES = [
  { titre: "Première lecture", consigne: "Tamponne-toi au plus près de la ligne dorée !", gravite: 520, rideau: false },
  { titre: "Presto !", consigne: "Attention, ça tombe beaucoup plus vite...", gravite: 820, rideau: false },
  { titre: "Derrière le rideau", consigne: "Le rideau cache la fin de la music_fall : anticipe !", gravite: 640, rideau: true }
];

// profondeur d'affichage des éléments (plus grand = devant)
// la note est devant le perso : c'est elle qui se tamponne sur la partition
const PROF = { empreinte: 2, feuille: 3, perso: 4, note: 5, fleche: 8, rideau: 10, texte: 20 };

// Déroulement d'une manche (this.etat) :
// intro (titre) -> pret (métronome) -> music_fall -> mesure (on mesure les cm)
// -> fin_manche (gagnant de la manche) -> manche suivante ou résultats
export default class music_fall extends Phaser.Scene {
  constructor() {
    super({ key: "music_fall" });
  }

  // les données sont passées par scene.start / scene.restart
  init(donnees) {
    this.manche = donnees.manche || 0;
    this.scores = donnees.scores || [[], []];
  }

  create() {
    this.touches = creerTouches(this);
    this.infoManche = MANCHES[this.manche];
    this.etat = "intro";
    this.passageFait = false;
    this.solo = this.registry.get("mode") == "solo";

    this.creerDecor();
    this.joueurs = participants(this.registry).map((perso, i) => this.creerJoueur(perso, i));
    if (this.infoManche.rideau) this.creerRideau();
    this.creerHUD();

    lancerMusique(this);
    this.cameras.main.fadeIn(300);
    this.presenterManche();
  }

  // ---------------------------------------------------------------------------
  // DECOR
  // ---------------------------------------------------------------------------
  creerDecor() {
    this.add.image(0, 0, "tx_bureau").setOrigin(0);
    this.add.image(190, 30, "tx_page").setOrigin(0);

    // la portée en bas de la partition : 5 lignes, la 1re est la ligne à viser
    var g = this.add.graphics();
    g.lineStyle(3, 0x3b3550);
    for (var i = 1; i < 5; i++) {
      g.lineBetween(250, Y_LIGNE + i * ECART_LIGNES, 1040, Y_LIGNE + i * ECART_LIGNES);
    }
    g.lineBetween(250, Y_LIGNE, 250, Y_LIGNE + 4 * ECART_LIGNES); // barres de mesure
    g.lineBetween(1040, Y_LIGNE, 1040, Y_LIGNE + 4 * ECART_LIGNES);
    g.lineStyle(5, 0xe0a818);
    g.lineBetween(250, Y_LIGNE, 1040, Y_LIGNE);
    this.add
      .text(275, Y_LIGNE + 28, "4\n4", {
        fontFamily: "Georgia, serif",
        fontSize: "26px",
        fontStyle: "bold",
        color: "#3b3550",
        align: "center",
        lineSpacing: -10
      })
      .setOrigin(0.5);

    // halo qui clignote doucement sur la ligne dorée
    var halo = this.add.rectangle(645, Y_LIGNE, 790, 10, 0xffd23f, 0.35);
    this.tweens.add({ targets: halo, alpha: 0.05, duration: 600, yoyo: true, repeat: -1 });

    // en duo : séparation en pointillés entre les 2 couloirs
    if (!this.solo) {
      var sep = this.add.graphics();
      sep.lineStyle(2, 0xc9bfae);
      for (var y = 120; y < Y_LIGNE - 10; y += 18) sep.lineBetween(640, y, 640, y + 9);
    }

    this.creerRegle();
  }

  // règle graduée en cm sur le bord droit (0 = la ligne dorée)
  creerRegle() {
    var g = this.add.graphics();
    var x = 1080;
    g.fillStyle(0xf3e3b5);
    g.fillRect(x - 22, Y_DEPART - 10, 26, Y_LIGNE - Y_DEPART + 14);
    g.lineStyle(1, 0x6b4127);
    for (var cm = 0; cm * PX_PAR_CM <= Y_LIGNE - Y_DEPART; cm++) {
      var y = Y_LIGNE - cm * PX_PAR_CM;
      var longueur = cm % 10 == 0 ? 16 : cm % 5 == 0 ? 10 : 5;
      g.lineBetween(x, y, x - longueur, y);
      if (cm % 10 == 0) {
        this.add
          .text(x - 26, y, String(cm), { fontFamily: "Arial", fontSize: "13px", fontStyle: "bold", color: "#6b4127" })
          .setOrigin(1, 0.5);
      }
    }
    this.add
      .text(x - 8, Y_DEPART - 26, "cm", { fontFamily: "Arial", fontSize: "13px", fontStyle: "bold", color: "#6b4127" })
      .setOrigin(0.5);
  }

  creerRideau() {
    // rideau d'opéra qui cache la fin de la music_fall (il laisse voir les 10 derniers cm)
    this.rideau = this.add.image(640, 230, "tx_rideau").setOrigin(0.5, 0).setDepth(PROF.rideau);
    this.tweens.add({ targets: this.rideau, scaleX: 1.01, duration: 1200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }

  // ---------------------------------------------------------------------------
  // JOUEURS
  // ---------------------------------------------------------------------------
  creerJoueur(perso, i) {
    var x = this.solo ? X_COULOIR_SOLO : X_COULOIRS[i];
    var decalageNote = i == 0 ? 40 : -40; // la note est à coté du perso

    var feuille = this.add.image(x, Y_DEPART - 4, "tx_feuille").setOrigin(0.5, 0).setDepth(PROF.feuille);
    // la note du perso, de sa couleur. Le bas de l'image (la tete de la note)
    // est au niveau des pattes : c'est ce point qu'on mesure
    var note = this.add
      .image(x + decalageNote, Y_DEPART, "tx_note")
      .setOrigin(0.5, 1)
      .setScale(0.9)
      .setTint(perso.teinte)
      .setDepth(PROF.note);
    var sprite = this.add
      .sprite(x, Y_DEPART, perso.texture)
      .setScale(ECHELLE)
      .setOrigin(0.5, perso.piedRepos)
      .setDepth(PROF.perso);
    sprite.anims.play(perso.anim);
    // le perso de droite regarde vers le milieu
    if (i == 1) sprite.setFlipX(true);

    return {
      perso: perso,
      i: i,
      x: x,
      sprite: sprite,
      note: note,
      feuille: feuille,
      decalageNote: decalageNote,
      touches: this.touches[i],
      etat: "attente", // attente -> music_fall -> tamponne ou rate
      vitesse: 0,
      cm: null
    };
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------
  creerHUD() {
    var style = {
      fontFamily: '"Arial Black", Arial',
      fontSize: "22px",
      color: "#ffffff",
      stroke: "#2b1f5c",
      strokeThickness: 6
    };
    this.add
      .text(640, 24, "MUSIC FALL   ·   Essai " + (this.manche + 1) + " / " + MANCHES.length + "   ·   " + this.infoManche.titre, style)
      .setOrigin(0.5)
      .setDepth(PROF.texte);

    // score de chaque joueur : la tete de son perso + le total en cm à coté
    this.textesTotal = this.joueurs.map((j) => {
      var tete = this.add
        .image(j.x - 60, 82, j.perso.texture, 0)
        .setCrop(0, 0, 35, 20) // on ne garde que le haut de l'image = la tete
        .setScale(2.4)
        .setDepth(PROF.texte);
      if (j.i == 1) tete.setFlipX(true);
      this.add
        .text(j.x - 60, 94, j.perso.etiquette, { ...style, fontSize: "14px", strokeThickness: 4 })
        .setOrigin(0.5, 0)
        .setDepth(PROF.texte);
      return this.add
        .text(j.x - 20, 70, "", { ...style, fontSize: "34px", color: j.perso.couleur })
        .setOrigin(0, 0.5)
        .setDepth(PROF.texte);
    });
    this.majHUD();

    // gros texte au milieu (Prêt ?, Top !, résultat de la manche...)
    this.texteCentre = this.add
      .text(640, 400, "", { ...style, fontSize: "56px", color: "#ffd23f", strokeThickness: 10, align: "center" })
      .setOrigin(0.5)
      .setDepth(PROF.texte);
  }

  total(i) {
    return this.scores[i].reduce((somme, cm) => somme + cm, 0);
  }

  majHUD() {
    this.joueurs.forEach((j, i) => {
      this.textesTotal[i].setText(this.total(i) + " cm");
    });
  }

  // ---------------------------------------------------------------------------
  // DEROULEMENT D'UNE MANCHE
  // ---------------------------------------------------------------------------
  presenterManche() {
    var lignes;
    var hauteur;
    if (this.manche == 0) {
      // avant le jeu : petit descriptif + bouton pour lancer
      lignes = [
        "MUSIC FALL",
        "",
        "Ton perso saute de sa feuille avec sa note.",
        "Appuie sur A pour tamponner ta note sur la partition,",
        "le plus près possible de la ligne dorée (0 cm = parfait).",
        "Dépasser la ligne = raté (" + CM_RATE + " cm).",
        "3 essais : le plus petit total gagne !"
      ];
      hauteur = 380;
    } else {
      lignes = ["ESSAI " + (this.manche + 1) + " : " + this.infoManche.titre.toUpperCase(), this.infoManche.consigne];
      hauteur = 170;
    }
    var fond = this.add.rectangle(0, 0, 860, hauteur, 0x2b1f5c, 0.94).setStrokeStyle(4, 0xe0a818);
    var texte = this.add
      .text(0, this.manche == 0 ? -40 : 0, lignes.join("\n"), {
        fontFamily: "Arial",
        fontSize: "25px",
        fontStyle: "bold",
        color: "#ffffff",
        align: "center",
        lineSpacing: 8
      })
      .setOrigin(0.5);
    var elements = [fond, texte];

    if (this.manche == 0) {
      // le bouton "lancer le jeu" (on le valide avec A, pas de souris sur la borne)
      var bouton = this.add.rectangle(0, 140, 400, 60, 0xffc83d).setStrokeStyle(4, 0xffffff);
      var texteBouton = this.add
        .text(0, 140, "▶  LANCER LE JEU  (A)", {
          fontFamily: '"Arial Black", Arial',
          fontSize: "24px",
          color: "#2b1f5c"
        })
        .setOrigin(0.5);
      this.tweens.add({ targets: [bouton, texteBouton], scale: 1.06, duration: 450, yoyo: true, repeat: -1 });
      elements.push(bouton, texteBouton);
    }

    this.panneau = this.add.container(640, 390, elements).setDepth(PROF.texte).setScale(0);
    this.tweens.add({ targets: this.panneau, scale: 1, duration: 400, ease: "Back.easeOut" });

    if (this.manche == 0) {
      // on attend que quelqu'un appuie sur A (voir update)
      this.etat = "presentation";
    } else {
      // timer simple : le panneau reste un moment puis on passe au "Prêt ?"
      this.time.delayedCall(2400, () => this.fermerPanneau());
    }
  }

  fermerPanneau() {
    this.etat = "intro";
    jouerSon(this, "valider");
    this.tweens.add({
      targets: this.panneau,
      scale: 0,
      duration: 250,
      onComplete: () => {
        this.panneau.destroy();
        this.pret();
      }
    });
  }

  pret() {
    this.etat = "pret";
    this.texteCentre.setText("Prêt ?");
    // timer récurrent : 3 coups de métronome (tempo 120 = un coup toutes les 500 ms)
    this.time.addEvent({ delay: 500, repeat: 2, callback: () => jouerSon(this, "tic") });
    // puis un petit temps de suspense aléatoire, pour qu'on ne puisse pas
    // apprendre le rythme par coeur
    var suspense = Phaser.Math.Between(600, 1800);
    this.time.delayedCall(1500 + suspense, () => this.top());
  }

  top() {
    this.etat = "music_fall";
    this.texteCentre.setText("TOP !");
    this.time.delayedCall(500, () => this.texteCentre.setText(""));
    jouerSon(this, "top");
    volumeMusique(this, 0.08);

    // on "vide" les appuis faits avant le top, sinon un appui pendant le
    // "Prêt ?" tamponnait le perso dès la 1re image de la music_fall
    this.touches.forEach((t) => vientDAppuyer(t.a));

    // gravité un peu différente à chaque manche (+/- 15 %)
    this.gravite = this.infoManche.gravite * Phaser.Math.FloatBetween(0.85, 1.15);
    // temps pour arriver à la ligne : h = g.t²/2  donc  t = racine(2h / g)
    var duree = Math.sqrt((2 * (Y_LIGNE - Y_DEPART)) / this.gravite);
    this.sonmusic_fall = sifflet(this, duree);

    this.joueurs.forEach((j) => {
      j.etat = "music_fall";
      j.vitesse = 0;
      j.sprite.anims.stop();
      j.sprite.setFrame(j.perso.imagemusic_fall);
      j.sprite.setOrigin(0.5, j.perso.piedmusic_fall);
      // la feuille s'envole en tournant
      this.tweens.add({
        targets: j.feuille,
        y: j.feuille.y + 650,
        x: j.feuille.x + Phaser.Math.Between(-80, 80),
        angle: Phaser.Math.Between(-70, 70),
        alpha: 0,
        duration: 1500,
        ease: "Quad.easeIn"
      });
    });
  }

  update(time, delta) {
    if (this.etat == "presentation") {
      if (unJoueurAppuie(this.touches, "a")) this.fermerPanneau();
      return;
    }
    if (this.etat == "fin_manche") {
      if (unJoueurAppuie(this.touches, "a")) this.mancheSuivante();
      return;
    }
    if (this.etat != "music_fall") return;

    // delta = temps écoulé depuis l'image précédente (en ms)
    var dt = Math.min(delta, 50) / 1000;

    this.joueurs.forEach((j) => {
      if (j.etat != "music_fall") return;

      // La music_fall calculée à la main : la vitesse augmente avec la gravité
      // (v = v + g.dt) et la position avec la vitesse (y = y + v.dt).
      // Pas besoin du moteur physique pour ça, et c'est plus précis pour
      // mesurer au pixel près.
      j.vitesse += this.gravite * dt;
      j.sprite.y += j.vitesse * dt;
      j.note.y = j.sprite.y;

      // distance entre la tete de la note (bas de l'image) et la ligne dorée
      var restantPx = Y_LIGNE - j.note.y;
      var appui = vientDAppuyer(j.touches.a);

      if (appui) this.tamponner(j);
      else if (restantPx < 0) this.rater(j);
    });

    var tousFinis = this.joueurs.every((j) => j.etat == "tamponne" || j.etat == "rate");
    if (tousFinis) this.finDemusic_fall();
  }

  tamponner(j) {
    var restantPx = Y_LIGNE - j.note.y;
    if (restantPx < 0) {
      this.rater(j);
      return;
    }
    j.etat = "tamponne";
    j.cm = Math.round(restantPx / PX_PAR_CM);

    // l'empreinte d'encre : c'est la NOTE qui se tamponne sur la partition,
    // de la couleur du perso (chacun a son tampon)
    var n = j.note;
    j.empreinte = this.add
      .image(n.x, n.y, "tx_note")
      .setOrigin(0.5, 1)
      .setScale(0.9)
      .setTint(j.perso.teinte)
      .setAlpha(0)
      .setDepth(PROF.empreinte);
    this.tweens.add({ targets: j.empreinte, alpha: 0.9, duration: 100 });

    // la note s'écrase sur le papier (comme un tampon) et le perso rebondit dessus
    this.tweens.add({ targets: n, scaleX: 1.1, scaleY: 0.72, duration: 90, yoyo: true });
    this.tweens.add({ targets: j.sprite, y: j.sprite.y - 18, duration: 120, yoyo: true, ease: "Quad.easeOut" });
    this.cameras.main.shake(90, 0.004);
    this.eclaboussures(n.x - 10, n.y - 12, j.perso.teinte);
    jouerTampon(this, j.cm);
  }

  eclaboussures(x, y, couleur) {
    for (var k = 0; k < 10; k++) {
      var angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      var distance = Phaser.Math.Between(25, 70);
      var goutte = this.add
        .image(x, y, "tx_etincelle")
        .setTint(couleur)
        .setDepth(PROF.fleche)
        .setScale(Phaser.Math.FloatBetween(0.4, 1.2));
      this.tweens.add({
        targets: goutte,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        duration: 450,
        onComplete: () => goutte.destroy()
      });
    }
  }

  rater(j) {
    j.etat = "rate";
    j.cm = CM_RATE;
    jouerSon(this, "couac");
    // il passe à travers la portée et tombe du bureau
    this.tweens.add({ targets: j.sprite, y: 820, angle: j.i == 0 ? -120 : 120, duration: 700, ease: "Quad.easeIn" });
    this.tweens.add({ targets: j.note, y: 900, duration: 700, ease: "Quad.easeIn" });
    var texte = this.add
      .text(j.x, Y_LIGNE - 70, "Trop tard !", {
        fontFamily: '"Arial Black", Arial',
        fontSize: "34px",
        color: "#e0463c",
        stroke: "#ffffff",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(PROF.texte)
      .setScale(0);
    this.tweens.add({ targets: texte, scale: 1, duration: 300, ease: "Back.easeOut" });
  }

  finDemusic_fall() {
    this.etat = "mesure";
    this.sonmusic_fall.stop();
    volumeMusique(this, 0.3);
    var attente = 400;
    // manche 3 : le rideau se lève pour révéler les tampons
    if (this.rideau) {
      this.tweens.add({ targets: this.rideau, y: -320, duration: 900, ease: "Quad.easeIn" });
      attente = 1000;
    }
    this.time.delayedCall(attente, () => this.decoller());
  }

  // le perso et sa note se décollent du papier : il ne reste que le tampon
  // de la note, de la couleur du perso
  decoller() {
    this.joueurs.forEach((j) => {
      if (j.etat != "tamponne") return;
      this.tweens.add({ targets: [j.sprite, j.note], y: "-=70", alpha: 0.4, duration: 350, ease: "Quad.easeOut" });
    });
    this.time.delayedCall(450, () => this.afficherMesures());
  }

  afficherMesures() {
    this.joueurs.forEach((j) => {
      if (j.etat != "tamponne") {
        this.add
          .text(j.x, 470, "RATÉ !\n+" + CM_RATE + " cm", {
            fontFamily: '"Arial Black", Arial',
            fontSize: "32px",
            color: "#e0463c",
            align: "center"
          })
          .setOrigin(0.5)
          .setDepth(PROF.texte);
        return;
      }
      var yPattes = j.empreinte.y; // bas de la tete de la note tamponnée
      var xFleche = j.x + (j.i == 0 ? -85 : 85);
      var g = this.add.graphics().setDepth(PROF.fleche);
      g.lineStyle(3, 0xd0342c);
      // trait qui part de la tete de la note tamponnée
      g.lineBetween(j.empreinte.x - 10, yPattes, xFleche, yPattes);
      // double flèche entre la note et la ligne dorée
      if (Y_LIGNE - yPattes > 12) {
        g.lineBetween(xFleche, yPattes, xFleche, Y_LIGNE);
        g.fillStyle(0xd0342c);
        g.fillTriangle(xFleche - 7, yPattes + 12, xFleche + 7, yPattes + 12, xFleche, yPattes);
        g.fillTriangle(xFleche - 7, Y_LIGNE - 12, xFleche + 7, Y_LIGNE - 12, xFleche, Y_LIGNE);
      }

      var texte = this.add
        .text(xFleche + (j.i == 0 ? -12 : 12), (yPattes + Y_LIGNE) / 2, "0 cm", {
          fontFamily: '"Arial Black", Arial',
          fontSize: "34px",
          color: "#d0342c",
          stroke: "#ffffff",
          strokeThickness: 6
        })
        .setOrigin(j.i == 0 ? 1 : 0, 0.5)
        .setDepth(PROF.texte);

      // compteur qui monte jusqu'au score, comme dans Mario Party
      var compteur = { valeur: 0 };
      var dernier = 0;
      this.tweens.add({
        targets: compteur,
        valeur: j.cm,
        duration: Math.min(1200, 200 + j.cm * 40),
        onUpdate: () => {
          var v = Math.floor(compteur.valeur);
          if (v != dernier) {
            dernier = v;
            texte.setText(v + " cm");
            jouerSon(this, "compteur");
          }
        },
        onComplete: () => {
          texte.setText(j.cm + " cm");
          if (j.cm == 0) this.parfait(j);
        }
      });
    });
    this.time.delayedCall(1500, () => this.resultatManche());
  }

  // 0 cm : pluie d'étoiles
  parfait(j) {
    jouerSon(this, "bravo");
    var texte = this.add
      .text(j.x, Y_LIGNE - 150, "PARFAIT !", {
        fontFamily: '"Arial Black", Arial',
        fontSize: "44px",
        color: "#ffd23f",
        stroke: "#2b1f5c",
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(PROF.texte);
    this.tweens.add({ targets: texte, scale: 1.2, duration: 300, yoyo: true, repeat: 3 });
    for (var k = 0; k < 14; k++) {
      var etoile = this.add.image(j.x, Y_LIGNE - 40, "tx_etoile").setDepth(PROF.texte);
      this.tweens.add({
        targets: etoile,
        x: j.x + Phaser.Math.Between(-180, 180),
        y: Y_LIGNE - Phaser.Math.Between(60, 260),
        angle: 360,
        alpha: 0,
        duration: 1100,
        onComplete: () => etoile.destroy()
      });
    }
  }

  resultatManche() {
    this.joueurs.forEach((j) => this.scores[j.i].push(j.cm));
    this.majHUD();

    var meilleur = Math.min(...this.joueurs.map((j) => j.cm));
    var gagnants = this.joueurs.filter((j) => j.cm == meilleur);
    var message;
    if (this.solo) {
      // en solo : pas d'adversaire, on donne juste le total en cours
      message = "Essai " + (this.manche + 1) + " : " + this.joueurs[0].cm + " cm\nTotal : " + this.total(0) + " cm";
    } else if (gagnants.length == 1) {
      var g = gagnants[0];
      message = g.perso.nom + " remporte l'essai !";
      var couronne = this.add.image(g.x, 140, "tx_couronne").setDepth(PROF.texte).setScale(1.5);
      this.tweens.add({ targets: couronne, y: 130, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    } else {
      message = "Égalité !";
    }
    this.texteCentre.setFontSize(40).setY(300).setText(message);

    var derniere = this.manche == MANCHES.length - 1;
    var suite = this.add
      .text(640, 690, derniere ? "A : voir les résultats" : "A : essai suivant", {
        fontFamily: '"Arial Black", Arial',
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#2b1f5c",
        padding: { x: 16, y: 6 }
      })
      .setOrigin(0.5)
      .setDepth(PROF.texte);
    this.tweens.add({ targets: suite, alpha: 0.4, duration: 500, yoyo: true, repeat: -1 });

    // on vide les appuis faits pendant la music_fall (en solo personne ne lit les
    // touches de J2, donc un vieil appui pouvait faire passer la manche direct)
    this.touches.forEach((t) => vientDAppuyer(t.a));
    this.etat = "fin_manche";
    // si personne n'appuie, on passe tout seul au bout de 6 s
    this.time.delayedCall(6000, () => this.mancheSuivante());
  }

  mancheSuivante() {
    if (this.passageFait) return;
    this.passageFait = true;
    jouerSon(this, "valider");
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => {
      if (this.manche + 1 < MANCHES.length) {
        this.scene.restart({ manche: this.manche + 1, scores: this.scores });
      } else {
        // écran des résultats commun : le total de chacun + le détail des essais
        this.scene.start("resultats", {
          scores: this.joueurs.map((j) => this.total(j.i)),
          stats: MANCHES.map((m, k) => ({ titre: "Essai " + (k + 1), valeurs: this.joueurs.map((j) => this.scores[j.i][k] + " cm") }))
        });
      }
    });
  }
}
