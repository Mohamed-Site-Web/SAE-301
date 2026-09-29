import { vientDAppuyer } from "./controles.js";
import { jouerSon } from "./sons.js";
import { style, annonce, OR } from "./interface.js";

// Tableau des meilleurs scores du mode solo, comme sur une vraie borne :
// les 5 meilleurs, avec les initiales du joueur (3 lettres).
// Il est gardé dans le navigateur (localStorage) : il reste meme quand on
// éteint la borne. Une entrée = { initiales: "CAR", perso: "carmen", score: 1340 }
//
// "croissant" = true quand le plus PETIT score est le meilleur (Music Fall, en cm)

const TAILLE = 5;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CLE_INITIALES = "music_party_initiales"; // les dernières initiales tapées

function lireRecords(cle) {
  try {
    var liste = JSON.parse(localStorage.getItem(cle));
    return Array.isArray(liste) ? liste : [];
  } catch (e) {
    return []; // pas de localStorage (navigation privée...) : tableau vide
  }
}

// le 1er du tableau (ou null s'il est vide)
export function meilleurRecord(cle) {
  var liste = lireRecords(cle);
  return liste.length > 0 ? liste[0] : null;
}

// true si le score a est meilleur que le score b
function estMeilleur(a, b, croissant) {
  return croissant ? a < b : a > b;
}

// place que prendrait ce score dans le tableau (0 = 1er), ou -1 s'il n'y entre pas
export function placeDansRecords(cle, score, croissant) {
  if (!croissant && score <= 0) return -1; // 0 point : pas de record
  var liste = lireRecords(cle);
  var place = liste.findIndex((r) => estMeilleur(score, r.score, croissant));
  if (place == -1) place = liste.length;
  return place < TAILLE ? place : -1;
}

function ajouterRecord(cle, entree, croissant) {
  var liste = lireRecords(cle);
  var place = placeDansRecords(cle, entree.score, croissant);
  liste.splice(place, 0, entree);
  try {
    localStorage.setItem(cle, JSON.stringify(liste.slice(0, TAILLE)));
    localStorage.setItem(CLE_INITIALES, entree.initiales);
  } catch (e) {}
}

function dernieresInitiales() {
  try {
    return localStorage.getItem(CLE_INITIALES) || "AAA";
  } catch (e) {
    return "AAA";
  }
}

// Pendant une partie solo : le record à battre, affiché en (x, y).
// verifier(score) annonce "NOUVEAU RECORD !" la 1re fois qu'on le dépasse.
export function afficherRecordEnJeu(scene, x, y, cleRecords) {
  var record = meilleurRecord(cleRecords);
  scene.add.text(x, y, "RECORD", style(20, "#ffe9a8", 4)).setOrigin(0.5).setDepth(30);
  var texte = scene.add
    .text(x, y + 34, record ? record.score + " pts" : "---", style(30, OR))
    .setOrigin(0.5)
    .setDepth(30);
  if (record) scene.add.text(x, y + 66, record.initiales, style(18, "#ffffff", 4)).setOrigin(0.5).setDepth(30);
  var battu = false;
  return {
    verifier: (score) => {
      if (battu || record == null || score <= record.score) return;
      battu = true;
      texte.setColor("#7ee0b8");
      jouerSon(scene, "bonus");
      annonce(scene, "NOUVEAU RECORD !", "#7ee0b8", 1200, 250);
    }
  };
}

// ---------------------------------------------------------------------------
// Affichage du tableau + saisie des initiales (écran des résultats en solo).
// jeu = infos du mini-jeu (voir jeux.js), (x, y) = haut du tableau.
// Dans update() de la scène, on appelle mettreAJour(touches) : il renvoie
// true tant que le joueur est en train de taper ses initiales.
// ---------------------------------------------------------------------------
export class TableauRecords {
  constructor(scene, jeu, score, perso, x, y) {
    this.scene = scene;
    this.jeu = jeu;
    this.score = score;
    this.perso = perso;
    this.x = x;
    this.y = y;
    this.place = placeDansRecords(jeu.cleRecords, score, jeu.croissant);
    this.enSaisie = this.place >= 0; // on tape ses initiales si on entre dans le tableau
    this.lettres = dernieresInitiales().split("");
    this.curseur = 0; // la lettre qu'on est en train de changer (0, 1 ou 2)
    this.elements = [];
    this.dessiner();
  }

  // les lignes à afficher : le tableau actuel, avec le nouveau score inséré
  lignes() {
    var liste = lireRecords(this.jeu.cleRecords);
    if (this.enSaisie) {
      liste.splice(this.place, 0, { initiales: "", perso: this.perso, score: this.score, nouveau: true });
    }
    return liste.slice(0, TAILLE);
  }

  // (re)dessine tout le tableau
  dessiner() {
    var s = this.scene;
    this.elements.forEach((e) => e.destroy());
    this.elements = [s.add.text(this.x, this.y, "MEILLEURS SCORES", style(26, OR)).setOrigin(0.5, 0)];
    var lignes = this.lignes();
    if (lignes.length == 0) {
      this.elements.push(s.add.text(this.x, this.y + 80, "Aucun record pour l'instant", style(20)).setOrigin(0.5, 0));
    }
    lignes.forEach((ligne, rang) => {
      var y = this.y + 70 + rang * 54;
      var couleur = ligne.nouveau ? "#7ee0b8" : "#ffffff";
      // rang, tete du perso, initiales, score
      this.elements.push(
        s.add.text(this.x - 190, y, rang + 1 + ".", style(26, couleur)).setOrigin(0, 0.5),
        s.add.image(this.x - 132, y, "img_tete_" + ligne.perso).setScale(0.6),
        s.add.text(this.x + 190, y, ligne.score + " " + this.jeu.unite, style(26, couleur)).setOrigin(1, 0.5)
      );
      if (ligne.nouveau) {
        // la ligne du joueur : 3 lettres qu'on change au joystick
        this.surligne = s.add.rectangle(0, y, 28, 40, 0xffffff, 0.3);
        this.textesLettres = [0, 1, 2].map((k) => s.add.text(this.x - 84 + k * 27, y, "", style(28, couleur)).setOrigin(0.5));
        this.elements.push(this.surligne, ...this.textesLettres);
        this.majSaisie();
      } else {
        var initiales = s.add.text(this.x - 96, y, ligne.initiales, style(28, couleur)).setOrigin(0, 0.5);
        this.elements.push(initiales);
        // la ligne qu'on vient d'enregistrer clignote
        if (rang == this.place) s.tweens.add({ targets: initiales, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
      }
    });
    if (this.enSaisie) {
      this.elements.push(
        s.add.text(this.x, this.y + 345, "▲ ▼ : lettre   ◄ ► : bouger   A : valider", style(16, "#ffffff", 3)).setOrigin(0.5, 0)
      );
    }
  }

  majSaisie() {
    this.textesLettres.forEach((t, k) => t.setText(this.lettres[k]));
    this.surligne.x = this.textesLettres[this.curseur].x;
  }

  mettreAJour(touches) {
    var t = touches[0]; // en solo, c'est J1 qui joue
    // on lit toutes les touches (pour bien "consommer" chaque appui)
    var haut = vientDAppuyer(t.haut);
    var bas = vientDAppuyer(t.bas);
    var gauche = vientDAppuyer(t.gauche);
    var droite = vientDAppuyer(t.droite);
    var a = vientDAppuyer(t.a);
    if (!haut && !bas && !gauche && !droite && !a) return true;

    var i = ALPHABET.indexOf(this.lettres[this.curseur]);
    if (haut) this.lettres[this.curseur] = ALPHABET[(i + 1) % ALPHABET.length];
    if (bas) this.lettres[this.curseur] = ALPHABET[(i + ALPHABET.length - 1) % ALPHABET.length];
    if (gauche) this.curseur = Math.max(0, this.curseur - 1);
    if (droite) this.curseur = Math.min(2, this.curseur + 1);
    if (a) {
      // A : lettre suivante, et à la 3e on enregistre
      if (this.curseur == 2) {
        this.valider();
        return false;
      }
      this.curseur++;
    }
    jouerSon(this.scene, "menu");
    this.majSaisie();
    return true;
  }

  valider() {
    ajouterRecord(this.jeu.cleRecords, { initiales: this.lettres.join(""), perso: this.perso, score: this.score }, this.jeu.croissant);
    this.enSaisie = false;
    jouerSon(this.scene, "valider");
    this.dessiner();
  }
}
