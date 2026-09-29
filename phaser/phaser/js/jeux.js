// Les 4 mini-jeux de Music Party. Les scènes communes (sélection, menu,
// choix des persos, résultats) lisent ces infos pour s'adapter au jeu choisi.
//   scene       : la scène du jeu         fond : image de fond du menu
//   choixPersos : false = pas d'écran de choix des persos (Music Fall : les Foxy)
//   image       : image de la carte sur l'écran de sélection
//   decor       : persos affichés sur les cotés du menu
//   cleRecords  : tableau des meilleurs scores (solo)
//   croissant   : true = le plus PETIT score est le meilleur (Music Fall, en cm)

// les 4 persos d'opéra sur les cotés du menu
const DECOR_OPERA = [
  { texture: "img_carmen", x: 95, echelle: 0.62 },
  { texture: "img_figaro", x: 205, echelle: 0.62 },
  { texture: "img_diva", x: 1075, echelle: 0.62 },
  { texture: "img_maestro", x: 1185, echelle: 0.62 }
];

export const JEUX = [
  {
    cle: "music_fall",
    titre: "MUSIC FALL",
    slogan: "Tamponne ta note au plus près de la ligne dorée !",
    description: "Tamponne ta note\nau plus près de\nla ligne dorée !",
    regles:
      "Au top départ, ton perso tombe de sa feuille avec sa note.\n" +
      "Appuie sur A pour tamponner ta note sur la partition, au plus près\n" +
      "de la ligne dorée : 0 cm = parfait ! Si tu la dépasses : raté (60 cm).\n" +
      "3 essais : le plus petit total gagne.",
    scene: "music_fall",
    fond: "img_fond_scene",
    choixPersos: false,
    image: "img_renard",
    echelleImage: 4.5,
    decor: [
      { texture: "img_renard", x: 150, echelle: 4.5, anim: "anim_renard_repos" },
      { texture: "img_grenouille", x: 1060, echelle: 4.5, anim: "anim_grenouille_repos" },
      { texture: "img_renard2", x: 1180, echelle: 4.5, anim: "anim_renard2_repos" }
    ],
    cleRecords: "music_fall_records",
    unite: "cm",
    croissant: true
  },
  {
    cle: "piano_time_time",
    titre: "piano_time TIME",
    slogan: "Joue la mélodie sur le piano_time géant !",
    description: "Joue la mélodie\nen rythme sur\nle piano_time géant !",
    regles:
      "Les notes descendent vers la zone dorée de ton piano_time.\n" +
      "Appuie sur A, B ou C quand une note est dans la zone :\n" +
      "chaque réussite accélère le tempo, le combo multiplie tes points.\n" +
      "3 notes ratées ou fausses notes : c'est fini !",
    scene: "piano_time",
    fond: "img_fond_scene",
    choixPersos: true,
    image: "img_figaro",
    echelleImage: 0.8,
    decor: DECOR_OPERA,
    cleRecords: "piano_time_time_records",
    unite: "pts",
    croissant: false
  },
  {
    cle: "memory_song",
    titre: "MEMORY SONG",
    slogan: "Rejoue la mélodie du saxophone... sans te tromper !",
    description: "Rejoue la mélodie\ndu saxophone\nsans te tromper !",
    regles:
      "Le saxophone joue une mélodie : regarde et écoute bien ses touches.\n" +
      "Rejoue-la avec les boutons A B C (en haut) et D E F (en bas).\n" +
      "À chaque manche, la mélodie a une note de plus !\n" +
      "Une erreur = une chance en moins. 3 chances.",
    scene: "memory_song",
    fond: "img_fond_opera",
    choixPersos: true,
    image: "img_saxo",
    echelleImage: 0.34,
    decor: DECOR_OPERA,
    cleRecords: "memory_song_records",
    unite: "pts",
    croissant: false
  },
  {
    cle: "note_catcher",
    titre: "NOTE CATCHER",
    slogan: "note_catcher les notes qui tombent du ciel avec ton livre !",
    description: "note_catcher les notes\nqui tombent du ciel\navec ton livre !",
    regles:
      "Joystick gauche / droite pour te déplacer (A maintenu pour courir).\n" +
      "note_catcher les notes dans ton livre ouvert : chacune joue la mélodie !\n" +
      "Les portées volantes font dévier les notes... et évite les fausses notes.\n" +
      "60 secondes : fais le plus gros score possible !",
    scene: "note_catcher",
    fond: "img_fond_ville",
    choixPersos: true,
    image: "img_carmen",
    echelleImage: 0.85,
    decor: DECOR_OPERA,
    cleRecords: "note_catcher_records",
    unite: "pts",
    croissant: false
  }
];

// les infos d'un mini-jeu à partir de sa clé ("piano_time_time"...)
export function infosJeu(cle) {
  return JEUX.find((jeu) => jeu.cle == cle);
}
