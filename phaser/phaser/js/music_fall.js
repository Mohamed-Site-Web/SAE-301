// importe les fonctions des touches (créer les touches, détecter un appui de J1 ou J2)
import { creerTouches, vientDAppuyer, unJoueurAppuie } from "./controles.js";
// importe les fonctions des sons (bruitages, tampon, sifflet de chute, musique et son volume)
import { jouerSon, jouerTampon, sifflet, lancerMusique, volumeMusique } from "./sons.js";
// importe la liste des joueurs de la partie (J1 seul en solo, J1 et J2 en duo)
import { participants } from "./persos.js";

// ===========================================================================
// MUSIC FALL
// Le perso tombe avec sa note. On appuie sur A pour tamponner la note
// le plus près possible de la ligne dorée. 3 essais : le plus petit total gagne.
// ===========================================================================

// ----- Réglages -----
const PX_PAR_CM = 8;                 // 8 pixels à l'écran = 1 cm
const Y_DEPART = 215;                // hauteur des pattes au départ
const Y_LIGNE = 610;                 // hauteur de la ligne dorée à viser
const ECART_LIGNES = 14;             // écart entre les lignes de la portée
const CM_RATE = 60;                  // score si on dépasse la ligne
const X_DUO = [440, 840];            // position du perso de J1 et de J2 en duo
const X_SOLO = 640;                  // position du perso en solo
const ECHELLE_PERSO = 3;             // le perso fait 32 px, on le grossit x3
const POLICE = '"Arial Black", Arial';

// les 3 essais, de plus en plus durs
const ESSAIS = [
  { titre: "Première lecture", consigne: "Tamponne-toi au plus près de la ligne dorée !", gravite: 520, rideau: false },
  { titre: "Presto !", consigne: "Attention, ça tombe beaucoup plus vite...", gravite: 820, rideau: false },
  { titre: "Derrière le rideau", consigne: "Le rideau cache la fin de la chute : anticipe !", gravite: 640, rideau: true }
];

// ordre d'affichage (plus le chiffre est grand, plus c'est devant)
const PROFONDEUR = { tampon: 2, perso: 4, note: 5, fleche: 8, rideau: 10, texte: 20 };

// Les étapes d'un essai (this.etape) :
// presentation (1er essai) -> intro -> pret -> chute -> mesure -> fin_essai

export default class music_fall extends Phaser.Scene {
  constructor() {                     // constructeur de la classe
    super({
      key: "music_fall"               //  le nom de la classe en tant qu'identifiant
    });
  }

  preload() {
    this.load.image("img_fond_music_fall", "./assets/images/fond_music_fall.png");
  }

  create(donnees) {                     // donnees = ce qu'on envoie avec scene.start / scene.restart (n° d'essai et scores)
    this.numEssai = donnees.numEssai || 0;
    this.scores = donnees.scores || [[], []];
    this.essai = ESSAIS[this.numEssai];
    this.etape = "intro";
    this.dejaPasse = false;              // pour ne pas passer 2 fois à l'essai suivant
    this.solo = this.registry.get("mode") == "solo";
    this.clavier = creerTouches(this);

    this.creerDecor();
    this.joueurs = participants(this.registry).map((perso, i) => this.creerJoueur(perso, i));
    if (this.essai.rideau) {
      this.rideau = this.add.image(640, 230, "tx_rideau").setOrigin(0.5, 0).setDepth(PROFONDEUR.rideau);
    }
    this.creerScores();

    lancerMusique(this);
    this.cameras.main.fadeIn(300);
    this.afficherPanneau();
  }

  update(time, delta) {
    // panneau du 1er essai : on attend A
    if (this.etape == "presentation") {
      if (unJoueurAppuie(this.clavier, "a")) this.fermerPanneau();
      return;
    }
    // fin d'un essai : A pour passer au suivant
    if (this.etape == "fin_essai") {
      if (unJoueurAppuie(this.clavier, "a")) this.essaiSuivant();
      return;
    }
    if (this.etape != "chute") return;

    // temps écoulé depuis l'image précédente, en secondes
    var dt = Math.min(delta, 50) / 1000;

    this.joueurs.forEach((joueur) => {
      if (joueur.etat != "chute") return;

      // la chute : la vitesse augmente avec la gravité, la position avec la vitesse
      joueur.vitesse += this.gravite * dt;
      joueur.sprite.y += joueur.vitesse * dt;
      joueur.note.y = joueur.sprite.y;

      if (vientDAppuyer(joueur.touches.a)) this.tamponner(joueur);
      else if (joueur.note.y > Y_LIGNE) this.rater(joueur);
    });

    var tousFinis = this.joueurs.every((joueur) => joueur.etat != "chute");
    if (tousFinis) this.finDeChute();
  }

  // ===========================================================================
  // DECOR
  // ===========================================================================
  creerDecor() {
    this.add.image(0, 0, "img_fond_music_fall").setOrigin(0).setDisplaySize(1280, 720);
    this.add.image(190, 30, "tx_page").setOrigin(0);

    // la portée : 4 lignes grises + la ligne dorée à viser
    var dessin = this.add.graphics();
    dessin.lineStyle(3, 0x3b3550);
    for (var i = 1; i < 5; i++) {
      dessin.lineBetween(250, Y_LIGNE + i * ECART_LIGNES, 1040, Y_LIGNE + i * ECART_LIGNES);
    }
    dessin.lineBetween(250, Y_LIGNE, 250, Y_LIGNE + 4 * ECART_LIGNES); // barres de mesure
    dessin.lineBetween(1040, Y_LIGNE, 1040, Y_LIGNE + 4 * ECART_LIGNES);
    dessin.lineStyle(5, 0xe0a818);
    dessin.lineBetween(250, Y_LIGNE, 1040, Y_LIGNE);
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

    // en duo : pointillés entre les 2 joueurs
    if (!this.solo) {
      var pointilles = this.add.graphics();
      pointilles.lineStyle(2, 0xc9bfae);
      for (var y = 120; y < Y_LIGNE - 10; y += 18) pointilles.lineBetween(640, y, 640, y + 9);
    }
    this.creerRegle();
  }

// ----- LA RÈGLE -----
  // règle graduée en cm à droite (0 = la ligne dorée)
  creerRegle() {
    var dessin = this.add.graphics();                         // pour dessiner des formes (rectangles, traits)
    var x = 1080;
    var styleChiffres = { fontFamily: "Arial", fontSize: "13px", fontStyle: "bold", color: "#6b4127" };

    // LE FOND DE LA RÈGLE 

    dessin.fillStyle(0xf3e3b5);                               // on choisit la couleur de remplissage : jaune clair
 
    dessin.fillRect(x - 22, Y_DEPART - 10, 26, Y_LIGNE - Y_DEPART + 14);        
    // il commence un peu au-dessus du départ du perso (Y_DEPART - 10), il commence un peu au-dessus du départ du perso 


    // LES TRAITS DE GRADUATION 
    dessin.lineStyle(1, 0x6b4127);

    // une boucle : on fait un trait pour chaque centimètre
    // cm commence à 0 (la ligne dorée) et monte de 1 en 1,
    // tant qu'on n'a pas dépassé la hauteur de départ du perso
    for (var cm = 0; cm * PX_PAR_CM <= Y_LIGNE - Y_DEPART; cm++) {

      // la hauteur à l'écran de ce centimètre :
      // on part de la ligne dorée et on remonte de 8 pixels par cm
      // (sur l'écran, y plus petit = plus haut)
      var y = Y_LIGNE - cm * PX_PAR_CM;

      var longueur = 5;
      if (cm % 5 == 0) longueur = 10;               // moyen (10 px) si cm est un multiple de 5  (5, 15, 25...),
      if (cm % 10 == 0) longueur = 16;              // grand (16 px) si cm est un multiple de 10 (0, 10, 20...)
      // (% = le reste de la division : cm % 5 == 0 veut dire "divisible par 5")

      dessin.lineBetween(x, y, x - longueur, y);    // on trace le trait horizontal, du bord droit vers la gauche

      // tous les 10 cm, on écrit le chiffre à gauche du trait
      // (String(cm) transforme le nombre en texte,
      //  setOrigin(1, 0.5) = le texte est collé à droite et centré en hauteur)
      if (cm % 10 == 0) this.add.text(x - 26, y, String(cm), styleChiffres).setOrigin(1, 0.5);
    }

    // LE MOT "cm" EN HAUT DE LA RÈGLE 
    this.add.text(x - 8, Y_DEPART - 26, "cm", styleChiffres).setOrigin(0.5);
  }

  // ===========================================================================
  // JOUEURS
  // ===========================================================================
  creerJoueur(perso, i) {
    var x = this.solo ? X_SOLO : X_DUO[i];
    var ecartNote = i == 0 ? 40 : -40; // la note est à coté du perso

    // la note, de la couleur du perso. Son bas est au niveau des pattes :
    // c'est ce point qu'on mesure
    var note = this.add
      .image(x + ecartNote, Y_DEPART, "tx_note")
      .setOrigin(0.5, 1)
      .setScale(0.9)
      .setTint(perso.teinte)
      .setDepth(PROFONDEUR.note);

    var player = this.add
      .sprite(x, Y_DEPART, perso.texture)
      .setScale(ECHELLE_PERSO)
      .setOrigin(0.5, perso.piedRepos)
      .setDepth(PROFONDEUR.perso);
    player.anims.play(perso.anim);
    if (i == 1) player.setFlipX(true); // J2 regarde vers le milieu

    return {
      perso: perso,
      i: i,
      x: x,
      sprite: player,
      note: note,
      touches: this.clavier[i],
      etat: "attente", // attente -> chute -> tamponne ou rate
      vitesse: 0,
      cm: null
    };
  }

  // ===========================================================================
  // SCORES EN HAUT DE L'ECRAN
  // ===========================================================================
  creerScores() {
    var style = { fontFamily: POLICE, fontSize: "22px", color: "#ffffff", stroke: "#2b1f5c", strokeThickness: 6 };

    var titre = "MUSIC FALL   ·   Essai " + (this.numEssai + 1) + " / " + ESSAIS.length + "   ·   " + this.essai.titre;
    this.add.text(640, 24, titre, style).setOrigin(0.5).setDepth(PROFONDEUR.texte);

    // pour chaque joueur : la tete de son perso, J1/J2, et son total en cm
    this.textesScore = this.joueurs.map((joueur) => {
      var tete = this.add
        .image(joueur.x - 60, 82, joueur.perso.texture, 0)
        .setCrop(0, 0, 35, 20) // on ne garde que le haut de l'image = la tete
        .setScale(2.4)
        .setDepth(PROFONDEUR.texte);
      if (joueur.i == 1) tete.setFlipX(true);

      this.add
        .text(joueur.x - 60, 94, joueur.perso.etiquette, { ...style, fontSize: "14px", strokeThickness: 4 })
        .setOrigin(0.5, 0)
        .setDepth(PROFONDEUR.texte);

      return this.add
        .text(joueur.x - 20, 70, "", { ...style, fontSize: "34px", color: joueur.perso.couleur })
        .setOrigin(0, 0.5)
        .setDepth(PROFONDEUR.texte);
    });
    this.majScores();

    // gros texte au milieu (Prêt ?, TOP !, gagnant de l'essai...)
    this.texteCentre = this.add
      .text(640, 400, "", { ...style, fontSize: "56px", color: "#ffd23f", strokeThickness: 10, align: "center" })
      .setOrigin(0.5)
      .setDepth(PROFONDEUR.texte);
  }

  // total des cm d'un joueur sur les essais déjà joués
  total(i) {
    var somme = 0;
    this.scores[i].forEach((cm) => (somme += cm));
    return somme;
  }

  majScores() {
    this.joueurs.forEach((joueur, i) => this.textesScore[i].setText(this.total(i) + " cm"));
  }

  // ===========================================================================
  // DEBUT D'UN ESSAI : panneau -> Prêt ? -> TOP !
  // ===========================================================================
  afficherPanneau() {
    var premierEssai = this.numEssai == 0;
    var lignes;
    var hauteur;
    if (premierEssai) {
      lignes = [
        "MUSIC FALL",
        "",
        "Ton perso saute dans le vide avec sa note.",
        "Appuie sur A pour tamponner ta note sur la partition,",
        "le plus près possible de la ligne dorée (0 cm = parfait).",
        "Dépasser la ligne = raté (" + CM_RATE + " cm).",
        "3 essais : le plus petit total gagne !"
      ];
      hauteur = 380;
    } else {
      lignes = ["ESSAI " + (this.numEssai + 1) + " : " + this.essai.titre.toUpperCase(), this.essai.consigne];
      hauteur = 170;
    }

    var fond = this.add.rectangle(0, 0, 860, hauteur, 0x2b1f5c, 0.94).setStrokeStyle(4, 0xe0a818);
    var texte = this.add
      .text(0, premierEssai ? -40 : 0, lignes.join("\n"), {
        fontFamily: "Arial",
        fontSize: "25px",
        fontStyle: "bold",
        color: "#ffffff",
        align: "center",
        lineSpacing: 8
      })
      .setOrigin(0.5);
    var elements = [fond, texte];

    // 1er essai : bouton "lancer le jeu" (validé avec A, pas de souris sur la borne)
    if (premierEssai) {
      var bouton = this.add.rectangle(0, 140, 400, 60, 0xffc83d).setStrokeStyle(4, 0xffffff);
      var texteBouton = this.add
        .text(0, 140, "▶  LANCER LE JEU  (A)", { fontFamily: POLICE, fontSize: "24px", color: "#2b1f5c" })
        .setOrigin(0.5);
      elements.push(bouton, texteBouton);
    }

this.panneau = this.add.container(640, 390, elements).setDepth(PROFONDEUR.texte);

    if (premierEssai) {
      this.etape = "presentation"; // on attend A (voir update)
    } else {
      this.time.delayedCall(2400, () => this.fermerPanneau()); // le panneau se ferme tout seul
    }
  }

fermerPanneau() {
  this.etape = "intro";
  this.panneau.destroy();
  this.pret();
}

  pret() {
    this.etape = "pret";
    this.texteCentre.setText("Prêt ?");
    // 3 coups de métronome, un toutes les 500 ms
    this.time.addEvent({ delay: 500, repeat: 2, callback: () => jouerSon(this, "tic") });
    // puis une attente au hasard, pour qu'on ne puisse pas apprendre le rythme
    var attente = Phaser.Math.Between(600, 1800);
    this.time.delayedCall(1500 + attente, () => this.top());
  }

  top() {
    this.etape = "chute";
    this.texteCentre.setText("TOP !");
    this.time.delayedCall(500, () => this.texteCentre.setText(""));
    jouerSon(this, "top");
    volumeMusique(this, 0.08);

    // on oublie les appuis faits avant le TOP (sinon on tamponnerait tout de suite)
    this.clavier.forEach((touches) => vientDAppuyer(touches.a));

    // gravité un peu différente à chaque fois (+/- 15 %)
    this.gravite = this.essai.gravite * Phaser.Math.FloatBetween(0.85, 1.15);
    // durée de la chute jusqu'à la ligne : t = racine(2 x hauteur / gravité)
    var duree = Math.sqrt((2 * (Y_LIGNE - Y_DEPART)) / this.gravite);
    this.sonChute = sifflet(this, duree);

    this.joueurs.forEach((joueur) => {
      joueur.etat = "chute";
      joueur.vitesse = 0;
      joueur.sprite.anims.stop();
      joueur.sprite.setFrame(joueur.perso.imagemusic_fall); // image "je tombe"
      joueur.sprite.setOrigin(0.5, joueur.perso.piedmusic_fall);
    });
  }

  // ===========================================================================
  // PENDANT LA CHUTE : tampon ou raté
  // ===========================================================================
  tamponner(joueur) {
    var distance = Y_LIGNE - joueur.note.y; // en pixels
    if (distance < 0) {
      this.rater(joueur);
      return;
    }
    joueur.etat = "tamponne";
    joueur.cm = Math.round(distance / PX_PAR_CM);

    // le tampon : une copie de la note qui reste sur la partition
    var note = joueur.note;
    joueur.tampon = this.add
      .image(note.x, note.y, "tx_note")
      .setOrigin(0.5, 1)
      .setScale(0.9)
      .setTint(joueur.perso.teinte)
      .setAlpha(0)
      .setDepth(PROFONDEUR.tampon);
    this.tweens.add({ targets: joueur.tampon, alpha: 0.9, duration: 100 });

    // la note s'écrase et le perso rebondit
    this.tweens.add({ targets: note, scaleX: 1.1, scaleY: 0.72, duration: 90, yoyo: true });
    this.tweens.add({ targets: joueur.sprite, y: joueur.sprite.y - 18, duration: 120, yoyo: true, ease: "Quad.easeOut" });
    jouerTampon(this, joueur.cm);
  }

  rater(joueur) {
    joueur.etat = "rate";
    joueur.cm = CM_RATE;
    jouerSon(this, "couac");
    // le perso et sa note tombent du bureau
    this.tweens.add({ targets: joueur.sprite, y: 820, angle: joueur.i == 0 ? -120 : 120, duration: 700, ease: "Quad.easeIn" });
    this.tweens.add({ targets: joueur.note, y: 900, duration: 700, ease: "Quad.easeIn" });

    var texte = this.add
      .text(joueur.x, Y_LIGNE - 70, "Trop tard !", {
        fontFamily: POLICE,
        fontSize: "34px",
        color: "#e0463c",
        stroke: "#ffffff",
        strokeThickness: 6
      })
      .setOrigin(0.5)
      .setDepth(PROFONDEUR.texte)
      .setScale(0);
    this.tweens.add({ targets: texte, scale: 1, duration: 300, ease: "Back.easeOut" });
  }

  // ===========================================================================
  // APRES LA CHUTE : mesures et résultat
  // ===========================================================================
  finDeChute() {
    this.etape = "mesure";
    this.sonChute.stop();
    volumeMusique(this, 0.3);
    var attente = 400;
    // essai 3 : le rideau se lève
    if (this.rideau) {
      this.tweens.add({ targets: this.rideau, y: -320, duration: 900, ease: "Quad.easeIn" });
      attente = 1000;
    }
    this.time.delayedCall(attente, () => this.decoller());
  }

  // le perso et sa note remontent : il ne reste que le tampon
  decoller() {
    this.joueurs.forEach((joueur) => {
      if (joueur.etat != "tamponne") return;
      this.tweens.add({ targets: [joueur.sprite, joueur.note], y: "-=70", alpha: 0.4, duration: 350, ease: "Quad.easeOut" });
    });
    this.time.delayedCall(450, () => this.afficherMesures());
  }

  afficherMesures() {
    this.joueurs.forEach((joueur) => {
      if (joueur.etat == "rate") {
        this.add
          .text(joueur.x, 470, "RATÉ !\n+" + CM_RATE + " cm", {
            fontFamily: POLICE,
            fontSize: "32px",
            color: "#e0463c",
            align: "center"
          })
          .setOrigin(0.5)
          .setDepth(PROFONDEUR.texte);
        return;
      }

      var yTampon = joueur.tampon.y; // bas de la note tamponnée
      var xFleche = joueur.x + (joueur.i == 0 ? -85 : 85);

      // trait rouge depuis le tampon, puis double flèche jusqu'à la ligne dorée
      var dessin = this.add.graphics().setDepth(PROFONDEUR.fleche);
      dessin.lineStyle(3, 0xd0342c);
      dessin.lineBetween(joueur.tampon.x - 10, yTampon, xFleche, yTampon);
      if (Y_LIGNE - yTampon > 12) {
        dessin.lineBetween(xFleche, yTampon, xFleche, Y_LIGNE);
        dessin.fillStyle(0xd0342c);
        dessin.fillTriangle(xFleche - 7, yTampon + 12, xFleche + 7, yTampon + 12, xFleche, yTampon);
        dessin.fillTriangle(xFleche - 7, Y_LIGNE - 12, xFleche + 7, Y_LIGNE - 12, xFleche, Y_LIGNE);
      }

      // le score en cm à coté de la flèche
      this.add
        .text(xFleche + (joueur.i == 0 ? -12 : 12), (yTampon + Y_LIGNE) / 2, joueur.cm + " cm", {
          fontFamily: POLICE,
          fontSize: "34px",
          color: "#d0342c",
          stroke: "#ffffff",
          strokeThickness: 6
        })
        .setOrigin(joueur.i == 0 ? 1 : 0, 0.5)
        .setDepth(PROFONDEUR.texte);

      jouerSon(this, "compteur");
      if (joueur.cm == 0) this.parfait(joueur);
    });
    this.time.delayedCall(1500, () => this.resultatEssai());
  }

  // 0 cm : "PARFAIT !" et pluie d'étoiles
  parfait(joueur) {
    jouerSon(this, "bravo");
    var texte = this.add
      .text(joueur.x, Y_LIGNE - 150, "PARFAIT !", {
        fontFamily: POLICE,
        fontSize: "44px",
        color: "#ffd23f",
        stroke: "#2b1f5c",
        strokeThickness: 8
      })
      .setOrigin(0.5)
      .setDepth(PROFONDEUR.texte);
    this.tweens.add({ targets: texte, scale: 1.2, duration: 300, yoyo: true, repeat: 3 });

    for (var k = 0; k < 14; k++) {
      var etoile = this.add.image(joueur.x, Y_LIGNE - 40, "tx_etoile").setDepth(PROFONDEUR.texte);
      this.tweens.add({
        targets: etoile,
        x: joueur.x + Phaser.Math.Between(-180, 180),
        y: Y_LIGNE - Phaser.Math.Between(60, 260),
        angle: 360,
        alpha: 0,
        duration: 1100,
        onComplete: () => etoile.destroy()
      });
    }
  }

  resultatEssai() {
    this.joueurs.forEach((joueur) => this.scores[joueur.i].push(joueur.cm));
    this.majScores();

    // le message du milieu
    var message;
    if (this.solo) {
      message = "Essai " + (this.numEssai + 1) + " : " + this.joueurs[0].cm + " cm\nTotal : " + this.total(0) + " cm";
    } else {
      var meilleur = Math.min(...this.joueurs.map((joueur) => joueur.cm));
      var gagnants = this.joueurs.filter((joueur) => joueur.cm == meilleur);
      if (gagnants.length == 1) {
        var gagnant = gagnants[0];
        message = gagnant.perso.nom + " remporte l'essai !";
      } else {
        message = "Égalité !";
      }
    }
    this.texteCentre.setFontSize(40).setY(300).setText(message);

    var dernierEssai = this.numEssai == ESSAIS.length - 1;
    this.add
      .text(640, 690, dernierEssai ? "A : voir les résultats" : "A : essai suivant", {
        fontFamily: POLICE,
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#2b1f5c",
        padding: { x: 16, y: 6 }
      })
      .setOrigin(0.5)
      .setDepth(PROFONDEUR.texte);

    // on oublie les appuis faits pendant la chute (sinon ça passerait direct à la suite)
    this.clavier.forEach((touches) => vientDAppuyer(touches.a));
    this.etape = "fin_essai";
    // si personne n'appuie, on passe tout seul au bout de 6 s
    this.time.delayedCall(6000, () => this.essaiSuivant());
  }

  essaiSuivant() {
    if (this.dejaPasse) return;
    this.dejaPasse = true;
    jouerSon(this, "valider");
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => {
      if (this.numEssai + 1 < ESSAIS.length) {
        this.scene.restart({ numEssai: this.numEssai + 1, scores: this.scores });
      } else {
        // écran des résultats : le total de chacun + le détail des essais
        this.scene.start("resultats", {
          scores: this.joueurs.map((joueur) => this.total(joueur.i)),
          stats: ESSAIS.map((essai, k) => ({
            titre: "Essai " + (k + 1),
            valeurs: this.joueurs.map((joueur) => this.scores[joueur.i][k] + " cm")
          }))
        });
      }
    });
  }
}