// Les personnages.
//   texture : l'image du perso        tete : sa tete, affichée à coté du score
//   echelle : taille quand on l'affiche en grand (écran des résultats)
//   couleur : couleur de son texte     teinte : couleur de ses effets

// Les 4 persos du document "Idées" (des archétypes d'opéra), pour piano_time_time Time,
// Memory Song et Note Catcher. "motif" = son petit air quand on le choisit.
export const PERSOS = [
  {
    cle: "diva",
    nom: "La Diva",
    titre: "La Diva dramatique",
    description: "Reine de la Nuit.\nSa voix brise les verres...",
    texture: "img_diva",
    tete: "img_tete_diva",
    echelle: 1.1,
    couleur: "#9dbbff",
    teinte: 0x4f73e8,
    motif: [77, 81, 84, 89, 84, 89],
  },
  {
    cle: "figaro",
    nom: "Figaro",
    titre: "Le Barbier hyperactif",
    description: "Figaro ci, Figaro là...\ntoujours pressé,\njamais fatigué !",
    texture: "img_figaro",
    tete: "img_tete_figaro",
    echelle: 1.1,
    couleur: "#7ee0b8",
    teinte: 0x2aa37c,
    motif: [67, 67, 67, 72, 67, 72, 76],
  },
  {
    cle: "carmen",
    nom: "Carmen",
    titre: "La Rebelle",
    description: "Libre comme l'oiseau...\net très mauvaise\nperdante !",
    texture: "img_carmen",
    tete: "img_tete_carmen",
    echelle: 1.1,
    couleur: "#ff8080",
    teinte: 0xd8324a,
    motif: [74, 73, 72, 71, 70, 69],
  },
  {
    cle: "maestro",
    nom: "Le Maestro",
    titre: "Le Maestro mystérieux",
    description: "Il dirige l'orchestre\ndepuis les coulisses...\nsans jamais se montrer.",
    texture: "img_maestro",
    tete: "img_tete_maestro",
    echelle: 1.1,
    couleur: "#c9a2ff",
    teinte: 0x7d4bc9,
    motif: [81, 79, 81, 79, 77, 76, 74, 73, 74],
  }
];

// Music Fall se joue avec Foxy (J1) et Foxy bleu (J2), du pack Sunny Land.
// Leurs images sont des spritesheets : "anim" = leur animation au repos,
// "imagemusic_fall" = l'image quand ils tombent, "pied" = hauteur des pattes dans
// l'image (0 = en haut, 1 = en bas) pour qu'elles tombent pile sur la ligne.
const RENARDS = [
  {
    cle: "renard",
    nom: "Foxy",
    texture: "img_renard",
    tete: "img_tete_renard",
    echelle: 4.5,
    anim: "anim_renard_repos",
    imagemusic_fall: 11,
    piedRepos: 32 / 32,
    piedmusic_fall: 29 / 32, // 3 lignes vides sous l'image de music_fall
    couleur: "#ff9a3c",
    teinte: 0xd9622b, // c'est aussi la couleur du tampon de sa note
  },
  {
    cle: "renard2",
    nom: "Foxy bleu",
    texture: "img_renard2",
    tete: "img_tete_renard2",
    echelle: 4.5,
    anim: "anim_renard2_repos",
    imagemusic_fall: 11,
    piedRepos: 32 / 32,
    piedmusic_fall: 29 / 32,
    couleur: "#5fc8ff",
    teinte: 0x2b7fd9,
  }
];

function trouverPerso(cle) {
  return PERSOS.find((p) => p.cle == cle) || PERSOS[0];
}

// les joueurs de la partie : J1 tout seul (solo, pour battre les records)
// ou J1 contre J2 (duo)
export function participants(registry) {
  var duo = registry.get("mode") == "duo";
  var persos;
  if (registry.get("jeu") == "music_fall") persos = RENARDS;
  else persos = [trouverPerso(registry.get("perso1")), trouverPerso(registry.get("perso2"))];
  var joueurs = [{ ...persos[0], etiquette: "J1" }];
  if (duo) joueurs.push({ ...persos[1], etiquette: "J2" });
  return joueurs;
}
