import { creerTextures } from "./textures.js";
import { PERSOS } from "./persos.js";

// Scène de chargement : on charge TOUTES les images et la musique une seule
// fois, on dessine les petites textures et on crée les animations.
// Ensuite on passe à l'écran titre.
export default class chargement extends Phaser.Scene {
  constructor() {
    super({ key: "chargement" });
  }

  preload() {
    // comme dans le template : les chemins sont relatifs à la page du jeu
    this.load.setBaseURL(this.sys.game.config.baseURL);

    this.add
      .text(640, 330, "Chargement...", { fontFamily: "Arial", fontSize: "28px", color: "#ffffffff" })
      .setOrigin(0.5);
    var barre = this.add.graphics();
    this.load.on("progress", function (valeur) {
      barre.clear();
      barre.fillStyle(0xffc83d, 1);
      barre.fillRect(440, 370, 400 * valeur, 16);
    });

    // fonds et logo (dossier "Logo et son background" + document Idées)
    this.load.image("img_fond_accueil", "./assets/images/fond_accueil.jpg");
    this.load.image("img_fond_scene", "./assets/images/fond_scene.jpg");
    this.load.image("img_fond_opera", "./assets/images/fond_opera.jpg");
    this.load.image("img_fond_ville", "./assets/images/fond_ville.jpg");
    this.load.image("img_logo", "./assets/images/logo.png");

    // les 4 persos d'opéra et leur tete (affichée à coté du score)
    PERSOS.forEach((perso) => {
      this.load.image(perso.texture, "./assets/images/" + perso.cle + ".png");
      this.load.image(perso.tete, "./assets/images/tete_" + perso.cle + ".png");
    });

    // Music Fall : persos du pack Sunny Land
    // renard : repos 0-3, course 4-9, saut 10, music_fall 11, blessé 12-13
    this.load.spritesheet("img_renard", "./assets/images/renard.png", { frameWidth: 33, frameHeight: 32 });
    this.load.spritesheet("img_renard2", "./assets/images/renard_j2.png", { frameWidth: 33, frameHeight: 32 });
    this.load.spritesheet("img_grenouille", "./assets/images/grenouille.png", { frameWidth: 35, frameHeight: 32 });
    this.load.image("img_tete_renard", "./assets/images/tete_renard.png");
    this.load.image("img_tete_renard2", "./assets/images/tete_renard2.png");

    // Memory Song : le saxophone et ses 6 touches (dossier "Note Memory img")
    this.load.image("img_saxo", "./assets/images/saxo.png");
    for (var i = 1; i <= 6; i++) {
      this.load.image("img_touche" + i, "./assets/images/touche" + i + ".png");
    }

    // musique de fond (pack SunnyLand Music)
    this.load.audio("musique", "./assets/sons/musique.ogg");
  }

  create() {
    creerTextures(this);

    // les persos Sunny Land sont en pixel art tout petit : quand on les
    // agrandit, on garde des pixels nets au lieu de les flouter
    ["img_renard", "img_renard2", "img_grenouille"].forEach((cle) =>
      this.textures.get(cle).setFilter(Phaser.Textures.FilterMode.NEAREST)
    );
    [
      ["anim_renard_repos", "img_renard", 8],
      ["anim_renard2_repos", "img_renard2", 8],
      ["anim_grenouille_repos", "img_grenouille", 6]
    ].forEach(([cle, texture, vitesse]) => {
      this.anims.create({
        key: cle,
        frames: this.anims.generateFrameNumbers(texture, { start: 0, end: 3 }),
        frameRate: vitesse,
        repeat: -1
      });
    });

    // valeurs par défaut (Carmen est le 1er perso du document Idées)
    this.registry.set("jeu", "music_fall");
    this.registry.set("mode", "solo");
    this.registry.set("perso1", "carmen");
    this.registry.set("perso2", "maestro");
    this.scene.start("accueil");
  }
}
