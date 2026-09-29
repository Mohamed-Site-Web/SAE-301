// Le répertoire : des airs célèbres (compositeurs du 18e / 19e siècle, donc
// dans le domaine public). Les notes sont écrites en numéros MIDI :
//   60 = Do   62 = Ré   64 = Mi   65 = Fa   67 = Sol   69 = La   71 = Si
//   72 = Do aigu (une octave au-dessus)... +1 = un demi-ton plus haut.
// Chaque morceau est découpé en phrases : dans piano_time Time on laisse un temps
// de silence entre 2 phrases, comme un musicien qui respire.
const MORCEAUX = [
  {
    titre: "French Cancan",
    auteur: "Offenbach",
    phrases: [
      [72, 74, 77, 76, 74, 79, 79, 79, 81, 76, 77, 74, 74, 74, 77, 76, 74, 72, 84, 83, 81, 79, 77, 76, 74],
      [72, 74, 77, 76, 74, 79, 79, 79, 81, 76, 77, 74, 74, 74, 77, 76, 74, 72, 79, 74, 76, 72]
    ]
  },
  {
    titre: "Guillaume Tell",
    auteur: "Rossini",
    phrases: [
      [67, 67, 67, 67, 67, 67, 67, 67, 72, 74, 76],
      [67, 67, 67, 67, 67, 72, 76, 74, 71, 67],
      [67, 67, 67, 67, 67, 67, 67, 67, 72, 74, 76],
      [72, 76, 79, 77, 76, 74, 72]
    ]
  },
  {
    titre: "Habanera (Carmen)",
    auteur: "Bizet",
    phrases: [
      [74, 73, 72, 72, 71, 70, 69, 69],
      [69, 68, 67, 67, 66, 65, 64, 64],
      [74, 73, 72, 72, 71, 70, 69, 69],
      [67, 65, 64, 65, 67, 65, 64, 62]
    ]
  },
  {
    titre: "Petite musique de nuit",
    auteur: "Mozart",
    phrases: [
      [67, 62, 67, 62, 67, 62, 67, 71, 74],
      [72, 69, 72, 69, 72, 69, 66, 69, 62],
      [67, 67, 71, 69, 67, 67, 66, 66, 69, 72, 66, 69, 67]
    ]
  },
  {
    titre: "Ode à la joie",
    auteur: "Beethoven",
    phrases: [
      [76, 76, 77, 79, 79, 77, 76, 74, 72, 72, 74, 76, 76, 74, 74],
      [76, 76, 77, 79, 79, 77, 76, 74, 72, 72, 74, 76, 74, 72, 72]
    ]
  }
];

// un morceau au hasard (jamais 2 fois de suite le meme)
var dernier = -1;
export function choisirMorceau() {
  var i = Phaser.Math.Between(0, MORCEAUX.length - 1);
  if (i == dernier) i = (i + 1) % MORCEAUX.length;
  dernier = i;
  return MORCEAUX[i];
}
