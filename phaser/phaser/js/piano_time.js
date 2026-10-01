import { creerTouches, vientDAppuyer, unJoueurAppuie, oublierAppuis } from "./controles.js";
import { jouerSon, jouerpiano_time, lancerMusique, volumeMusique } from "./sons.js";
import { participants } from "./persos.js";
import { infosJeu } from "./jeux.js";
import { choisirMorceau } from "./repertoire.js";
import { afficherRecordEnJeu } from "./records.js";
import { style, styleTexte, panneauPresentation, fermerPanneau, creerMedaillon, creerVies, casserVie, texteFlottant, annonce, partieTerminee, OR } from "./interface.js";

////////////////////////////////// Réglages du mini-jeu ///////////////////////////////////////////////

const JEU = infosJeu("piano_time_time"); //  Infos du mini-jeu récupérées dans jeux.js

const X_PIANO_SOLO = [640];         // Mode SOLO = un piano au centre 
const X_PIANO_DUO = [330, 950];     // Mode DUO = un piano de chaque coté

const LARGEUR_COULOIR = 100;              // 3 couloirs par piano : boutons A, B, C (K, L, M sur pc)
const Y_HAUT = 150;                       // Les notes spawn en haut de chaque couloir
const Y_ZONE = 520;                       // Position de la zone de sélection
const HAUTEUR_ZONE = 64;                  // Epaisseur de la zone de selection 

const Y_CLAVIER = 580;                    // Hauteur du haut des touches du piano
const Y_PIEDS = 694;                      // Les persos sont sur les touches

const ECHELLE_PERSO = 0.5;                // Taille des persos : 0.5

// Vitesse du jeu //
const PX_PAR_TEMPS = 150;                 // Ecart vertical entre 2 temps de la partition
const TEMPO_DEPART = 84;                  // Tempo au début de la partie (vitesse)
const GAIN_TEMPO = 2;                     // Vitesse gagnés à chaque note réussie

const FENETRE_BIEN = 46;                  // Jusqu'à 46 px d'ecart pour le bien
const FENETRE_PARFAIT = 15;               // Jusqu'à 15 px d'ecart pour le parfait
const FENETRE_TROP_TOT = 110;             // Si on appuie trop tot : perte du combo, mais pas de vie

const VIES = 3;

const COULEURS_COULOIRS = [0xff5a5a, 0xff5a5a, 0xff5a5a];  // Couleur de chaque couloir
const BOUTONS_COULOIRS = [
  ["a", "d"], ["b", "e"],["c", "f"]       //Bouton sur la borne pour chaque couloir 
];

const STYLE_AUTEUR = { fontFamily: "Georgia, serif", fontSize: "18px", fontStyle: "italic", color: "#ffe9a8" };

// Ordre d'affichage : plus le chiffre est grand, plus l'élément est devant
const PROF = { piste: 1, zone: 2, tuile: 3, clavier: 4, lumiere: 5, perso: 6, voile: 7, hud: 50 };


// Presentation (panneau + bouton lancer) ainsi que decompte (1, 2, 3, 4) -> jeu -> fin
export default class piano_time extends Phaser.Scene {
  constructor() {
    super({ key: "piano_time" });
  }

  create() {
    this.touches = creerTouches(this);
    this.etat = "presentation";
    this.solo = this.registry.get("mode") == "solo";

    // Duo, la partition est la meme pour les 2 joueurs 
    this.morceau = choisirMorceau();
    this.partition = [];
    this.fabrique = { phrase: 0, note: 0, temps: 2, couloir: 1, hauteur: null, demiTemps: false };
    this.allongerPartition(64); // Generation des 64 premieres notes

    this.add.image(0, 0, JEU.fond).setOrigin(0);
    if (this.solo) this.creerCotesSolo();
    else this.creerCentre();

    // On crée un joueur par personnage choisi (1 en solo, 2 en duo)
    this.joueurs = participants(this.registry).map((perso, i) => this.creerJoueur(perso, i));

    lancerMusique(this);
    this.presenter();
  }

  ////////////////////////////////PARTITION INFINI//////////////////////////////////

  // On ajoute des notes à la fin de la partition (au fur et à mesure, le jeu n'a pas de fin : il s'arrete quand les joueurs sont éliminés).
  
  allongerPartition(nombre) {
    var f = this.fabrique;
    for (var k = 0; k < nombre; k++) {
      var phrase = this.morceau.phrases[f.phrase]; // la phrase musicale en cours
      var hauteur = phrase[f.note]; // La note à placer

      // après un demi-temps, la note suivante est forcément dans un autre couloir
      var ecart = f.hauteur == null ? 0 : hauteur - f.hauteur;
      var couloir = this.choisirCouloir(f.couloir, ecart);
      if (f.demiTemps && couloir == f.couloir) couloir = (couloir + Phaser.Math.Between(1, 2)) % 3;
      
      this.partition.push({ temps: f.temps, couloir: couloir, hauteur: hauteur });
 
      // On mémorise cette note pour calculer la suivante
      f.couloir = couloir;
      f.hauteur = hauteur;
 
      // La note suivante arrive 1 temps plus tard, ou parfois (15 % de chances) un demi-temps
      f.demiTemps = this.partition.length > 12 && Math.random() < 0.15;
      f.temps += f.demiTemps ? 0.5 : 1;
 
      // On passe à la note suivante de la phrase
      f.note++;
      if (f.note >= phrase.length) {
        // Fin de la phrase : on passe à la suivante (et on revient à la première après la dernière)
        f.note = 0;
        f.phrase = (f.phrase + 1) % this.morceau.phrases.length;
        f.temps += 1; // 1 temps de pause entre 2 phrases
      }
    }
  }

  // le couloir suit le dessin de la mélodie : une note plus aiguë va à droite, une plus grave à gauche (comme sur un vrai clavier)
  choisirCouloir(dernier, ecart) {
    var c;
    if (ecart > 0) {
      c = dernier + (ecart >= 5 ? 2 : 1); // plus aigu : droite 
    } else if (ecart < 0) {
      c = dernier - (ecart <= -5 ? 2 : 1); // plus grave : gauche
    } else {
      c = Phaser.Math.Between(0, 2); // même hauteur : couloir au hasard
    }
    // Si on sort du piano, on repart de l'autre côté
    if (c > 2) c = Phaser.Math.Between(0, 1);
    if (c < 0) c = Phaser.Math.Between(1, 2);
    return c;
  }

  //////////////////////////////// FOND DU JEU AVEC INTERFACE ///////////////////////////
  // en solo : le titre et le morceau à gauche du piano, le record à battre à droite

  creerCotesSolo() {
    this.add.rectangle(235, 250, 330, 220, 0x1b1030, 0.8).setStrokeStyle(2, 0xe0a818);
    this.add.text(235, 180, JEU.titre, style(40, OR, 8)).setOrigin(0.5);
    this.add.text(235, 240, "♪ " + this.morceau.titre, styleTexte(20)).setOrigin(0.5);
    this.add.text(235, 268, this.morceau.auteur, STYLE_AUTEUR).setOrigin(0.5);
    this.add.rectangle(1045, 215, 260, 150, 0x1b1030, 0.8).setStrokeStyle(2, 0xe0a818);
    this.record = afficherRecordEnJeu(this, 1045, 170, JEU.cleRecords);
  }

  // en duo : le titre et le morceau au milieu, entre les 2 pianos
 creerCentre() {
    this.add.text(640, 46, JEU.titre, style(40, OR, 8)).setOrigin(0.5).setDepth(PROF.hud);
    this.add.text(640, 96, "♪ " + this.morceau.titre, styleTexte(20)).setOrigin(0.5).setDepth(PROF.hud);
    this.add.text(640, 122, this.morceau.auteur, STYLE_AUTEUR).setOrigin(0.5).setDepth(PROF.hud);
  }


  // Position X du centre d'un couloir : c vaut 0 (gauche), 1 (milieu) ou 2 (droite)
  xCouloir(j, c) {
    return j.x + (c - 1) * LARGEUR_COULOIR;
  }

  // La piste = une feuille de papier à musique avec 3 couloirs et la zone de selection
  dessinerPiste(j) {
    var gauche = j.x - 1.5 * LARGEUR_COULOIR; //bord gauche de la piste 
    var largeur = 3 * LARGEUR_COULOIR;

    // "graphics" = un objet sur lequel on dessine des formes (rectangles, lignes...)
    var g = this.add.graphics().setDepth(PROF.piste);

    // Ombre (fond noir transparent) puis feuille de papier beige
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(gauche - 4, Y_HAUT - 22, largeur + 28, Y_CLAVIER - Y_HAUT + 40, 14);
    g.fillStyle(0xfbf5e6, 0.94);
    g.fillRoundedRect(gauche - 10, Y_HAUT - 30, largeur + 20, Y_CLAVIER - Y_HAUT + 40, 14);
    
    // 2 lignes verticales qui séparent les 3 couloirs
    g.lineStyle(2, 0xd8ccb4);
    for (var k = 1; k < 3; k++) {
      g.lineBetween(gauche + k * LARGEUR_COULOIR, Y_HAUT - 20, gauche + k * LARGEUR_COULOIR, Y_CLAVIER);
    }


    // la zone de selection : c'est là qu'il faut jouer les notes
    g.fillStyle(0xffd23f, 0.35);
    g.fillRect(gauche, Y_ZONE - HAUTEUR_ZONE / 2, largeur, HAUTEUR_ZONE);
    g.lineStyle(3, 0xe0a818);
    g.strokeRect(gauche, Y_ZONE - HAUTEUR_ZONE / 2, largeur, HAUTEUR_ZONE);
    

    // une lumière par couloir (elle s'allume quand on appuie) + la lettre du bouton
    j.lumieres = [0, 1, 2].map((c) =>
      this.add
        .rectangle(this.xCouloir(j, c), Y_ZONE, LARGEUR_COULOIR - 6, HAUTEUR_ZONE - 6, COULEURS_COULOIRS[c])
        .setAlpha(0)
        .setDepth(PROF.zone)
    );

     // La lettre du bouton, écrite dans chaque couloir
    ["A", "B", "C"].forEach((lettre, c) => {
      this.add
        .text(this.xCouloir(j, c), Y_ZONE, lettre, style(30, "#ffffff", 6))
        .setOrigin(0.5)
        .setAlpha(0.6)
        .setDepth(PROF.zone);
    });
 
    // Texte en haut de la piste (Départ 84) (score)
    j.texteTempo = this.add
      .text(j.x, Y_HAUT - 12, "", { ...styleTexte(16, "#ee009f"), fontStyle: "bold italic" })
      .setOrigin(0.5)
      .setDepth(PROF.zone);
  }

  // Le piano géant sur lequel le perso se déplace
  dessinerClavier(j) {
    var gauche = j.x - 1.5 * LARGEUR_COULOIR;
    var g = this.add.graphics().setDepth(PROF.clavier);
 
    // Boîtier sombre du piano
    g.fillStyle(0x1b1030);
    g.fillRoundedRect(gauche - 10, Y_CLAVIER - 6, 3 * LARGEUR_COULOIR + 20, 150, 10);
 
    // 3 touches blanches (avec une bande grise en bas pour l'effet de relief)
    for (var c = 0; c < 3; c++) {
      var x = gauche + c * LARGEUR_COULOIR + 3;
      g.fillStyle(0xfdfaf2);
      g.fillRoundedRect(x, Y_CLAVIER, LARGEUR_COULOIR - 6, 124, { tl: 0, tr: 0, bl: 10, br: 10 });
      g.fillStyle(0xd9d0c0);
      g.fillRect(x, Y_CLAVIER + 108, LARGEUR_COULOIR - 6, 16);
    }
 
    // 2 touches noires, entre les touches blanches
    g.fillStyle(0x16101f);
    for (var k = 1; k < 3; k++) {
      g.fillRoundedRect(gauche + k * LARGEUR_COULOIR - 18, Y_CLAVIER, 36, 62, { tl: 0, tr: 0, bl: 6, br: 6 });
    }
 
    // Une lumière colorée par touche (invisible, elle s'allume quand on appuie)
    j.lumieresClavier = [0, 1, 2].map((c) =>
      this.add
        .rectangle(this.xCouloir(j, c), Y_CLAVIER + 62, LARGEUR_COULOIR - 6, 124, COULEURS_COULOIRS[c])
        .setAlpha(0)
        .setDepth(PROF.lumiere)
    );
  }


  ///////////////////////////////Creation JOUEURS //////////////////////////////////////

  creerJoueur(perso, i) {
    var j = {
      perso: perso,
      i: i,
      x: this.solo ? X_PIANO_SOLO[i] : X_PIANO_DUO[i],
      touches: this.touches[i], // les boutons de ce joueur
      pan: this.solo ? 0 : i == 0 ? -0.6 : 0.6, // son : J1 à gauche, J2 à droite, solo au centre
      tempo: TEMPO_DEPART,
      temps: -4, // position dans la partition, en battements (négatif = le temps du décompte)
      prochaine: 0, // numéro de la prochaine note de la partition à faire apparaître
      tuiles: [], // les tuiles actuellement visibles sur sa piste
      score: 0,
      combo: 0, // nombre de notes réussies d'affilée
      meilleurCombo: 0,
      notesJouees: 0,
      vies: VIES,
      elimine: false
    };

    this.dessinerPiste(j);
    this.dessinerClavier(j);

    // le perso est debout sur la touche du milieu
    j.sprite = this.add
      .image(this.xCouloir(j, 1), Y_PIEDS, perso.texture)
      .setOrigin(0.5, 1)
      .setScale(ECHELLE_PERSO)
      .setDepth(PROF.perso)
      .setFlipX(i == 1); // Le joueur 2 regarde vers la gauceh
    this.creerHUD(j);
    return j;
  }

  // score : le chiffre à coté de la tete du perso choisi
 creerHUD(j) {
    var xTete = j.x - 110;
    creerMedaillon(this, xTete, 56, j.perso, j.perso.etiquette);
    j.texteScore = this.add.text(xTete + 50, 40, "0", style(34, j.perso.couleur)).setOrigin(0, 0.5).setDepth(PROF.hud);
    j.imagesVies = creerVies(this, xTete + 64, 86, VIES).map((v) => v.setScale(0.8));
    j.texteMulti = this.add.text(j.x + 150, 42, "", style(30, OR)).setOrigin(1, 0.5).setDepth(PROF.hud);
    j.texteCombo = this.add.text(j.x + 150, 80, "", styleTexte(17, "#ffffff")).setOrigin(1, 0.5).setDepth(PROF.hud);
    this.majHUD(j);
    this.majTempo(j);
  }
  
  // Multiplicateur de score : x1 au départ, +1 tous les 10 combos avec un max de x4
  multiplicateur(j) {
    return Math.min(4, 1 + Math.floor(j.combo / 10));
  }


// Met à jour le score 
  majHUD(j) {
    j.texteScore.setText(j.score);
    if (this.solo) this.record.verifier(j.score); // (SOLO : verifie si c'est un new record)
    var multi = this.multiplicateur(j);
    j.texteMulti.setText(multi > 1 ? "x" + multi : ""); // empeche l'affichage de X1
    j.texteCombo.setText(j.combo > 1 ? j.combo + " combos" : "");
  }
  
  majTempo(j) {
    j.texteTempo.setText("♩ = " + Math.round(j.tempo));
  }



  ///////////////////////////////PANNEAU EXPLICATIVE//////////////////////////////////////

  presenter() {
    this.panneau = panneauPresentation(this, JEU.titre, [
      "Les notes descendent vers la zone dorée de ton piano_time.",
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
    volumeMusique(this, 0); // la musique fait par les joueurs
    var dureeTemps = 60000 / TEMPO_DEPART; // Durée d'un temps en ms

    for (var k = 0; k < 4; k++) {
      let numero = k;
      this.time.delayedCall(numero * dureeTemps, () => {
        annonce(this, String(numero + 1), OR, dureeTemps * 0.5, 300);
        jouerSon(this, numero == 3 ? "top" : "tic");
      });
    }

  //La partie commence apres les 4 temps
    this.time.delayedCall(4 * dureeTemps, () => {
      this.etat = "jeu";
      oublierAppuis(this.touches); // ignore les appuis pendant le decompte 
      annonce(this, "Jouez !", "#ffffff", 500, 300);
    });
  }

  update(time, delta) {
    if (this.etat == "presentation") {
    // Pendant la présentation, on attend que quelqu'un appuie sur A pour lancer
      if (unJoueurAppuie(this.touches, "a")) {
        this.etat = "lancement"; // eviter de relancer plusieur fois 
        jouerSon(this, "valider");
        fermerPanneau(this, this.panneau, () => this.decompte());
      }
      return;
    }

    // On ne fait avancer le jeu que pendant le décompte et la partie
    if (this.etat != "decompte" && this.etat != "jeu") return;

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

    // Il reste moins de 16 notes d'avance : on en génère 32 de plus
      if (j.prochaine > this.partition.length - 16) this.allongerPartition(32);
    }

    // Place chaque tuile : plus sa note approche dans le temps, plus elle est proche de la zone.
    j.tuiles.slice().forEach((t) => {
      if (j.elimine) return; // éliminé par la tuile précédente
      t.y = Y_ZONE - (t.note.temps - j.temps) * PX_PAR_TEMPS;
      if (t.y - Y_ZONE > FENETRE_BIEN) this.rater(j, t); // elle a dépassé la zone
    });

    // Les boutons ne comptent que pendant la partie (pas pendant le décompte)
    if (this.etat != "jeu" || j.elimine) return; this.lireTouches(j);
  }

  creerTuile(j, note) {
    var tuile = this.add
      .image(this.xCouloir(j, note.couloir), Y_HAUT, "img_touche_note")
      .setDisplaySize(90, 60)
      .setDepth(PROF.tuile);
    tuile.note = note; 
    j.tuiles.push(tuile); 
  }


   // Supprime une tuile : on la retire de la liste du joueur et on la détruit à l'écran
  supprimerTuile(j, tuile) {
    j.tuiles = j.tuiles.filter((t) => t != tuile); // filter = on garde toutes les tuiles sauf celle-ci
    tuile.destroy();
  }

  // Supprime toutes les tuiles d'un joueur
  viderTuiles(j) {
    j.tuiles.forEach((t) => t.destroy());
    j.tuiles = [];
  }


  // Regarde si le joueur vient d'appuyer sur un de ses boutons
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
    // Le perso se place sur la touche jouée
    j.sprite.setX(this.xCouloir(j, c));
    this.eclairer(j, c);

    // la tuile de ce couloir la plus proche de la zone
    var cible = null;
    j.tuiles.forEach((t) => {
      if (t.note.couloir != c) return; // pas le bon couloir : on l'ignore
      if (cible == null || Math.abs(t.y - Y_ZONE) < Math.abs(cible.y - Y_ZONE)) cible = t;
    });

    // Distance entre cette tuile et le centre de la zone
    var ecart = cible ? Math.abs(cible.y - Y_ZONE) : Infinity;
    
    if (ecart <= FENETRE_BIEN) {
      this.reussir(j, cible, ecart <= FENETRE_PARFAIT); // dans la zone : réussi (parfait si très précis)
    } else if (cible && cible.y < Y_ZONE && ecart <= FENETRE_TROP_TOT) {
      this.tropTot(j, c); // tuile au-dessus de la zone et pas trop loin : appui trop tôt
    } else {
      this.fausseNote(j, c); // aucune tuile proche : fausse note
    }
  }
  
  // Allume brièvement la lumière du couloir et de la touche du piano
  eclairer(j, c) {
    [j.lumieres[c], j.lumieresClavier[c]].forEach((lumiere) => {
      lumiere.setAlpha(0.8); // On l'allume d'un coup
      this.tweens.add({ targets: lumiere, alpha: 0, duration: 250 }); // puis elle s'eteint en 250ms
    });
  }


  reussir(j, tuile, parfait) {
    var x = tuile.x; // on garde la position avant de détruire la tuile
    jouerpiano_time(this, tuile.note.hauteur, { pan: j.pan }); // on joue la note de la mélodie
    this.supprimerTuile(j, tuile);
 
    j.combo++;
    j.meilleurCombo = Math.max(j.meilleurCombo, j.combo);  // Math.max = garde le plus grand des deux
    j.notesJouees++;
    j.score += (parfait ? 100 : 50) * this.multiplicateur(j);
    j.tempo += GAIN_TEMPO; // chaque réussite accélère le jeu
 
    texteFlottant(this, x, Y_ZONE - 48, parfait ? "PARFAIT" : "BIEN", parfait ? OR : "#ffffff", 22);
 
    // À 10, 20 et 30 combos : on annonce le nouveau multiplicateur
    if (j.combo % 10 == 0 && j.combo <= 30) {
      texteFlottant(this, j.x, 330, "COMBO x" + this.multiplicateur(j) + " !", OR, 36);
      jouerSon(this, "combo", j.pan);
    }
 
    this.majHUD(j);
    this.majTempo(j);
    this.verifierFin(); // en duo, le gagnant est peut-être déjà connu
  }
 
  tropTot(j, c) {
    j.combo = 0; // on perd le combo, mais pas de vie
    this.majHUD(j);
    jouerSon(this, "trop_tot", j.pan);
    texteFlottant(this, this.xCouloir(j, c), Y_ZONE - 48, "Trop tôt !", "#ffa23a", 20);
  }
 
  fausseNote(j, c) {
    texteFlottant(this, this.xCouloir(j, c), Y_ZONE - 48, "Fausse note !", "#ff4d5e", 20);
    this.perdreVie(j);
  }
 
  // La tuile a dépassé la zone sans être jouée
  rater(j, tuile) {
    texteFlottant(this, tuile.x, Y_ZONE - 48, "Raté !", "#ff4d5e", 22);
    this.supprimerTuile(j, tuile);
    this.perdreVie(j);
  }
 
  perdreVie(j) {
    if (j.elimine) return;
    j.combo = 0;
    j.vies--;
    casserVie(this, j.imagesVies[j.vies]); // fait disparaître le cœur correspondant
    jouerSon(this, "couac", j.pan);
    this.majHUD(j);
    if (j.vies <= 0) this.eliminer(j);
  }
 
   /////////////////////////////////////// FIN DE LA PARTIE//////////////////////////////////////


  eliminer(j) {
    j.elimine = true;
    this.viderTuiles(j);
 
    // Voile sombre sur son piano
    this.add
      .rectangle(j.x, (Y_HAUT - 30 + 720) / 2, 3 * LARGEUR_COULOIR + 24, 720 - Y_HAUT + 30, 0x0b0618, 0.55)
      .setDepth(PROF.voile);
 
    // Tampon rouge "ÉLIMINÉ" (ou "TERMINÉ" en solo), légèrement penché
    this.add
      .text(j.x, 330, this.solo ? "TERMINÉ" : "ÉLIMINÉ", style(46, "#ff4d5e", 8))
      .setOrigin(0.5)
      .setAngle(-12)   // MODIFFFFFFFFFFFFFFFFFFFFF
      .setDepth(PROF.hud);
 
    j.sprite.setAlpha(0.5); // perso à moitié transparent
    jouerSon(this, "elimine", j.pan);
    this.verifierFin();
  }
 
  // La partie s'arrête quand tous les joueurs sont éliminés (ou quand le gagnant est connu en duo)
  verifierFin() {
    if (this.etat == "jeu" && partieTerminee(this.joueurs)) this.fin();
  }
 
  fin() {
    this.etat = "fin";
    this.joueurs.forEach((j) => this.viderTuiles(j));
    annonce(this, "FIN DU RÉCITAL !", OR, 1700, 300);
    jouerSon(this, "bravo");
 
    // Après 2,3 s : fondu au noir (0,3 s), puis on lance la scène des résultats avec les stats
    this.time.delayedCall(2300, () => {
      this.cameras.main.fadeOut(300);
      this.time.delayedCall(300, () =>
        this.scene.start("resultats", {
          scores: this.joueurs.map((j) => j.score), // .map = on construit une liste avec une valeur par joueur
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
