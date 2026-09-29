import { creerTouches, unJoueurAppuie } from "./controles.js";
import { jouerSon, lancerMusique } from "./sons.js";
import { JEUX } from "./jeux.js";
import { meilleurRecord } from "./records.js";
import { style, styleTexte, fondAssombri, aideBas, respirer, OR } from "./interface.js";

const X_CARTES = [205, 495, 785, 1075];
const Y_CARTE = 370;
const LARGEUR_CARTE = 250;
const HAUTEUR_CARTE = 440;

// Sélection du mini-jeu (comme la scène "selection" du template, qui mène aux
// niveaux) : joystick gauche / droite, A pour jouer, B pour revenir au titre.
export default class selection extends Phaser.Scene {
  constructor() {
    super({ key: "selection" });
  }

  create() {
    this.touches = creerTouches(this);
    this.depart = false;
    // on se replace sur le dernier jeu choisi
    this.index = JEUX.findIndex((jeu) => jeu.cle == this.registry.get("jeu"));

    fondAssombri(this, "img_fond_scene", 0.6);
    this.add.text(640, 55, "CHOISIS TON JEU", style(50, OR, 10)).setOrigin(0.5);
    this.add.text(640, 105, "Music Party : 4 mini-jeux, en solo ou à deux", styleTexte(22, "#ffe9a8")).setOrigin(0.5);
    this.cartes = JEUX.map((jeu, i) => this.creerCarte(jeu, i));
    this.cadre = this.add.graphics().setDepth(5);

    aideBas(this, "◄ ► : choisir      A : jouer      B : écran titre");
    this.majCadre();
    lancerMusique(this);
    this.cameras.main.fadeIn(300);
  }

  creerCarte(jeu, i) {
    var x = X_CARTES[i];
    this.add.rectangle(x, Y_CARTE, LARGEUR_CARTE, HAUTEUR_CARTE, 0x1b1030, 0.88).setStrokeStyle(3, 0xe0a818);
    // (pour une spritesheet, Phaser affiche automatiquement la 1re image)
    var image = this.add.image(x, Y_CARTE + 20, jeu.image).setOrigin(0.5, 1).setScale(jeu.echelleImage);
    respirer(this, image);
    this.add.text(x, Y_CARTE + 55, jeu.titre, style(26, OR, 6)).setOrigin(0.5);
    this.add.text(x, Y_CARTE + 85, jeu.description, styleTexte(18, "#d8d0e8")).setOrigin(0.5, 0);
    // le record du mode solo
    var record = meilleurRecord(jeu.cleRecords);
    var texteRecord = record ? "Record : " + record.score + " " + jeu.unite + " (" + record.initiales + ")" : "Pas encore de record";
    this.add.text(x, Y_CARTE + 180, texteRecord, styleTexte(16, "#7ee0b8")).setOrigin(0.5);
    return { image: image, x: x };
  }

  majCadre() {
    var carte = this.cartes[this.index];
    this.cadre.clear();
    this.cadre.lineStyle(8, 0xffc83d, 1);
    this.cadre.strokeRoundedRect(
      carte.x - LARGEUR_CARTE / 2 - 10,
      Y_CARTE - HAUTEUR_CARTE / 2 - 10,
      LARGEUR_CARTE + 20,
      HAUTEUR_CARTE + 20,
      12
    );
    this.cartes.forEach((c, i) => c.image.setAlpha(i == this.index ? 1 : 0.55));
  }

  update() {
    if (this.depart) return;
    var gauche = unJoueurAppuie(this.touches, "gauche");
    var droite = unJoueurAppuie(this.touches, "droite");
    if (gauche || droite) {
      this.index = (this.index + (droite ? 1 : JEUX.length - 1)) % JEUX.length;
      jouerSon(this, "menu");
      this.majCadre();
    }
    if (unJoueurAppuie(this.touches, "a")) {
      this.registry.set("jeu", JEUX[this.index].cle);
      this.partir("menu", "valider");
    } else if (unJoueurAppuie(this.touches, "b")) {
      this.partir("accueil", "retour");
    }
  }

  partir(scene, son) {
    this.depart = true;
    jouerSon(this, son);
    this.cameras.main.fadeOut(300);
    this.time.delayedCall(300, () => this.scene.start(scene));
  }
}
