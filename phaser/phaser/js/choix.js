

////////////////////////////////CHOIX DES PERSO A CHANGER/////////////////////////////

import { creerTouches, vientDAppuyer } from "./controles.js";
import { jouerSon, jouerMotif, lancerMusique } from "./sons.js";
import { PERSOS } from "./persos.js";
import { infosJeu } from "./jeux.js";
import { style, styleTexte, fondAssombri, aideBas, annonce, texteFlottant, POLICE, OR } from "./interface.js";

// Réglages de l'écran
const X_CARTES = [205, 495, 785, 1075];
const Y_CARTE = 375; // centre des cartes
const LARGEUR_CARTE = 250;
const HAUTEUR_CARTE = 460;
const COULEURS = [0xffc83d, 0x4fd6ff]; // J1 doré, J2 bleu

// Choix des persos : chaque joueur a un curseur (un cadre de sa couleur).
// Joystick gauche / droite pour choisir, A pour valider, B pour annuler.
// En duo, les 2 joueurs choisissent en meme temps et ne peuvent pas prendre
// le meme perso.
export default class choix extends Phaser.Scene {
  constructor() {
    super({ key: "choix" });
  }

  create() {
    this.touches = creerTouches(this);
    this.jeu = infosJeu(this.registry.get("jeu"));
    this.duo = this.registry.get("mode") == "duo";
    this.depart = false; // true quand on quitte l'écran

    fondAssombri(this, this.jeu.fond, 0.62);
    this.add.text(640, 52, "CHOISIS TON PERSONNAGE", style(46, OR, 10)).setOrigin(0.5);
    var sousTitre = this.duo ? "J1 et J2 choisissent en même temps" : "Avec qui vas-tu jouer ?";
    this.add.text(640, 102, sousTitre, styleTexte(22, "#ffe9a8")).setOrigin(0.5);
    this.cartes = PERSOS.map((perso, i) => this.creerCarte(perso, i));

    // on reprend les persos de la partie précédente
    var index1 = PERSOS.findIndex((p) => p.cle == this.registry.get("perso1"));
    var index2 = PERSOS.findIndex((p) => p.cle == this.registry.get("perso2"));
    if (index2 == index1) index2 = (index1 + 1) % PERSOS.length;
    this.curseurs = [this.creerCurseur(0, index1)];
    if (this.duo) this.curseurs.push(this.creerCurseur(1, index2));

    aideBas(this, "◄ ► : choisir      A : valider      B : retour");
    this.majCurseurs();
    lancerMusique(this);
    this.cameras.main.fadeIn(300);
  }

  creerCarte(perso, i) {
    var x = X_CARTES[i];
    this.add.rectangle(x, Y_CARTE, LARGEUR_CARTE, HAUTEUR_CARTE, 0x1b1030, 0.88).setStrokeStyle(3, perso.teinte);
    // un halo de la couleur du perso derrière lui (le Maestro est très sombre)
    this.add.image(x, Y_CARTE - 40, "tx_halo").setScale(2.2).setTint(perso.teinte).setAlpha(0.8);
    var sprite = this.add.image(x, Y_CARTE + 70, perso.texture).setOrigin(0.5, 1).setScale(0.82);
    this.add.text(x, Y_CARTE + 100, perso.nom.toUpperCase(), style(26, perso.couleur, 6)).setOrigin(0.5);
    this.add
      .text(x, Y_CARTE + 130, perso.titre, { fontFamily: "Georgia, serif", fontSize: "18px", fontStyle: "italic", color: "#ffe9a8" })
      .setOrigin(0.5);
    this.add.text(x, Y_CARTE + 150, perso.description, styleTexte(15, "#d8d0e8")).setOrigin(0.5, 0);
    return { perso: perso, x: x, sprite: sprite };
  }

  creerCurseur(numero, index) {
    var tag = this.add
      .text(0, 0, "J" + (numero + 1), {
        fontFamily: POLICE,
        fontSize: "18px",
        color: "#1b1030",
        backgroundColor: "#" + COULEURS[numero].toString(16),
        padding: { x: 8, y: 3 }
      })
      .setOrigin(0.5)
      .setDepth(6);
    return { numero: numero, index: index, cadre: this.add.graphics().setDepth(5), tag: tag, valide: false };
  }

  // redessine les cadres des curseurs autour des cartes
  majCurseurs() {
    this.curseurs.forEach((c) => {
      var carte = this.cartes[c.index];
      // J1 : cadre à l'extérieur, J2 : cadre à l'intérieur (on voit les 2 sur la meme carte)
      var marge = c.numero == 0 ? 12 : 2;
      c.cadre.clear();
      c.cadre.lineStyle(c.valide ? 9 : 5, COULEURS[c.numero], 1);
      c.cadre.strokeRoundedRect(
        carte.x - LARGEUR_CARTE / 2 - marge,
        Y_CARTE - HAUTEUR_CARTE / 2 - marge,
        LARGEUR_CARTE + 2 * marge,
        HAUTEUR_CARTE + 2 * marge,
        12
      );
      c.tag.setPosition(carte.x + (c.numero == 0 ? -70 : 70), Y_CARTE - HAUTEUR_CARTE / 2 + 22);
      c.tag.setText("J" + (c.numero + 1) + (c.valide ? " ✓" : ""));
    });
  }

  update() {
    // on lit TOUTES les touches à chaque image (même si on ne s'en sert pas),
    // sinon un vieil appui pourrait ressortir plus tard
    var appuis = this.curseurs.map((c) => {
      var t = this.touches[c.numero];
      return { gauche: vientDAppuyer(t.gauche), droite: vientDAppuyer(t.droite), a: vientDAppuyer(t.a), b: vientDAppuyer(t.b) };
    });
    if (this.depart) return;

    this.curseurs.forEach((c, i) => {
      var appui = appuis[i];
      if (!c.valide) {
        if (appui.gauche || appui.droite) {
          c.index = (c.index + (appui.droite ? 1 : PERSOS.length - 1)) % PERSOS.length;
          jouerSon(this, "menu");
          this.majCurseurs();
        }
        if (appui.a) this.valider(c);
        else if (appui.b && c.numero == 0) this.partir("menu");
      } else if (appui.b) {
        // on annule son choix
        c.valide = false;
        jouerSon(this, "retour");
        this.majCurseurs();
      }
    });
  }

  valider(c) {
    var carte = this.cartes[c.index];
    // perso déjà pris par l'autre joueur ?
    if (this.curseurs.some((autre) => autre != c && autre.valide && autre.index == c.index)) {
      jouerSon(this, "erreur");
      texteFlottant(this, carte.x, Y_CARTE - 60, "Déjà pris !", "#ff4d5e", 28);
      return;
    }
    c.valide = true;
    jouerMotif(this, carte.perso);
    this.tweens.add({ targets: carte.sprite, y: carte.sprite.y - 30, duration: 160, yoyo: true, ease: "Quad.easeOut" });
    this.majCurseurs();
    // tout le monde a choisi : c'est parti
    if (this.curseurs.every((cur) => cur.valide)) {
      this.depart = true;
      this.registry.set("perso1", PERSOS[this.curseurs[0].index].cle);
      if (this.duo) this.registry.set("perso2", PERSOS[this.curseurs[1].index].cle);
      annonce(this, "C'EST PARTI !", OR, 800, 360);
      this.time.delayedCall(700, () => this.partir(this.jeu.scene));
    }
  }

  partir(scene) {
    this.depart = true;
    jouerSon(this, scene == "menu" ? "retour" : "valider");
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => this.scene.start(scene));
  }
}
