// Tous les petits éléments graphiques (notes, étoiles, décor de Music Fall...)
// sont dessinés avec des Graphics puis transformés en texture avec
// generateTexture(). Avantages : pas d'image à charger, pas de problème de
// droits, et on peut changer une couleur ou une taille directement dans le code.

export function creerTextures(scene) {
  // communes
  etoile(scene);
  etincelle(scene);
  vie(scene);
  miniNote(scene);
  halo(scene);
  // Music Fall
  bureau(scene);
  page(scene);
  feuille(scene);
  note(scene);
  rideau(scene);
  // piano_time Time
  tuile(scene);
  // Memory Song
  projecteur(scene);
  bulle(scene);
  // Note Catcher
  croche(scene);
  doubleCroche(scene);
  noteOr(scene);
  fausseNote(scene);
  livre(scene);
  portee(scene);
}

function nouveauDessin(scene) {
  return scene.make.graphics({ x: 0, y: 0, add: false });
}

// une croche : (x, y) = coin en haut à gauche, s = échelle (1 = 64 x 128 px)
function dessinerCroche(g, x, y, s, couleur) {
  g.fillStyle(couleur);
  g.fillEllipse(x + 22 * s, y + 112 * s, 36 * s, 26 * s); // tete
  g.fillRect(x + 34 * s, y + 8 * s, 7 * s, 104 * s); // hampe
  var crochet = [
    { x: 41, y: 8 },
    { x: 55, y: 26 },
    { x: 63, y: 48 },
    { x: 56, y: 74 },
    { x: 58, y: 50 },
    { x: 50, y: 34 },
    { x: 41, y: 30 }
  ];
  g.fillPoints(
    crochet.map((p) => ({ x: x + p.x * s, y: y + p.y * s })),
    true
  );
}

// dessine une forme avec un contour : la forme en sombre décalée de 2 px
// dans les 4 sens, puis la forme en couleur par-dessus
function avecContour(dessiner, couleurContour, couleur) {
  [
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2]
  ].forEach(([dx, dy]) => dessiner(dx, dy, couleurContour));
  dessiner(0, 0, couleur);
}

// ---------------------------------------------------------------------------
// COMMUNES
// ---------------------------------------------------------------------------

// petite étoile dorée
function etoile(scene) {
  var g = nouveauDessin(scene);
  var points = [];
  for (var i = 0; i < 10; i++) {
    var r = i % 2 == 0 ? 14 : 6;
    var a = (i * Math.PI) / 5 - Math.PI / 2;
    points.push({ x: 15 + r * Math.cos(a), y: 15 + r * Math.sin(a) });
  }
  g.fillStyle(0xffd23f);
  g.fillPoints(points, true);
  g.generateTexture("tx_etoile", 30, 30);
  g.destroy();
}


// étincelle blanche (on la colorie avec setTint)
function etincelle(scene) {
  var g = nouveauDessin(scene);
  g.fillStyle(0xffffff);
  g.fillCircle(6, 6, 6);
  g.generateTexture("tx_etincelle", 12, 12);
  g.destroy();
}

// une vie = une petite croche dorée avec un contour sombre
function vie(scene) {
  var g = nouveauDessin(scene);
  avecContour((dx, dy, c) => dessinerCroche(g, 2 + dx, 2 + dy, 0.33, c), 0x1b1030, 0xffd23f);
  g.generateTexture("tx_vie", 26, 47);
  g.destroy();
}

// note blanche pour les particules (coloriée avec setTint)
function miniNote(scene) {
  var g = nouveauDessin(scene);
  dessinerCroche(g, 0, 0, 0.22, 0xffffff);
  g.generateTexture("tx_mini_note", 15, 29);
  g.destroy();
}

// halo lumineux : des cercles de plus en plus transparents
function halo(scene) {
  var g = nouveauDessin(scene);
  for (var r = 64; r > 0; r -= 4) {
    g.fillStyle(0xffffff, 0.06 + (1 - r / 64) * 0.1);
    g.fillCircle(64, 64, r);
  }
  g.generateTexture("tx_halo", 128, 128);
  g.destroy();
}

// ---------------------------------------------------------------------------
// MUSIC FALL
// ---------------------------------------------------------------------------

// le bureau en bois sur lequel est posée la partition
function bureau(scene) {
  var g = nouveauDessin(scene);
  g.fillStyle(0x6b4127);
  g.fillRect(0, 0, 1280, 720);
  // veines du bois : des bandes plus claires / plus foncées au hasard
  for (var i = 0; i < 70; i++) {
    var y = Phaser.Math.Between(0, 720);
    g.fillStyle(Phaser.Math.RND.pick([0x5a3520, 0x7a4c2f, 0x80533a, 0x633b23]), 0.7);
    g.fillRect(0, y, 1280, Phaser.Math.Between(2, 9));
  }
  g.generateTexture("tx_bureau", 1280, 720);
  g.destroy();
}

// la grande fiche de partition vierge (900 x 700)
function page(scene) {
  var g = nouveauDessin(scene);
  // ombre portée
  g.fillStyle(0x000000, 0.3);
  g.fillRect(12, 12, 900, 700);
  // papier
  g.fillStyle(0xfbf5e6);
  g.fillRect(0, 0, 900, 700);
  // portées très pâles (la fiche est "vierge", juste les lignes)
  g.lineStyle(2, 0xe3d9c6, 1);
  for (var y0 = 120; y0 < 470; y0 += 90) {
    for (var k = 0; k < 5; k++) {
      g.lineBetween(60, y0 + k * 9, 860, y0 + k * 9);
    }
  }
  // petits trous de classeur sur le coté
  g.fillStyle(0x6b4127);
  [100, 300, 500].forEach((y) => g.fillCircle(22, y, 9));
  g.generateTexture("tx_page", 912, 712);
  g.destroy();
}

// la petite feuille de brouillon d'où le perso saute (200 x 40)
function feuille(scene) {
  var g = nouveauDessin(scene);
  g.fillStyle(0x000000, 0.2);
  g.fillRect(5, 6, 194, 26);
  // bord du bas déchiré (zigzag)
  var points = [
    { x: 0, y: 0 },
    { x: 194, y: 0 },
    { x: 194, y: 24 }
  ];
  for (var x = 194; x > 0; x -= 12) {
    points.push({ x: x, y: 24 });
    points.push({ x: Math.max(0, x - 6), y: 31 });
  }
  points.push({ x: 0, y: 24 });
  g.fillStyle(0xffffff);
  g.fillPoints(points, true);
  // lignes bleues et marge rouge comme un cahier
  g.lineStyle(1, 0x9ec5e8);
  g.lineBetween(0, 8, 194, 8);
  g.lineBetween(0, 17, 194, 17);
  g.lineStyle(1, 0xe08080);
  g.lineBetween(22, 0, 22, 28);
  g.generateTexture("tx_feuille", 200, 40);
  g.destroy();
}

// la grande croche qui tombe avec le perso (64 x 128)
function note(scene) {
  var g = nouveauDessin(scene);
  dessinerCroche(g, 0, 0, 1, 0x1d1830);
  g.generateTexture("tx_note", 64, 128);
  g.destroy();
}

// le rideau rouge de l'opéra (essai 3) 900 x 300
function rideau(scene) {
  var g = nouveauDessin(scene);
  // les plis du velours
  for (var x = 0; x < 900; x += 30) {
    g.fillStyle(0x9b1b24);
    g.fillRect(x, 0, 30, 280);
    g.fillStyle(0xc0303a);
    g.fillRect(x + 6, 0, 10, 280);
    g.fillStyle(0x6e1018);
    g.fillRect(x + 22, 0, 8, 280);
    // festons arrondis en bas
    g.fillStyle(0x9b1b24);
    g.fillCircle(x + 15, 278, 15);
  }
  // barre dorée en haut et frange dorée en bas
  g.fillStyle(0xe0b440);
  g.fillRect(0, 0, 900, 10);
  g.fillRect(0, 284, 900, 6);
  for (var x2 = 0; x2 < 900; x2 += 10) {
    g.fillTriangle(x2, 290, x2 + 10, 290, x2 + 5, 299);
  }
  g.generateTexture("tx_rideau", 900, 300);
  g.destroy();
}

// ---------------------------------------------------------------------------
// piano_time TIME
// ---------------------------------------------------------------------------

// la tuile noire qui descend vers la zone dorée
function tuile(scene) {
  var g = nouveauDessin(scene);
  g.fillStyle(0x000000, 0.25);
  g.fillRoundedRect(3, 5, 86, 54, 10); // ombre
  g.fillStyle(0x1d1628);
  g.fillRoundedRect(0, 0, 86, 54, 10); // touche noire
  g.fillStyle(0x3d3252);
  g.fillRoundedRect(5, 3, 76, 12, 6); // reflet en haut
  dessinerCroche(g, 33, 10, 0.3, 0xffd23f); // note dorée au milieu
  g.generateTexture("tx_tuile", 90, 60);
  g.destroy();
}

// ---------------------------------------------------------------------------
// MEMORY SONG
// ---------------------------------------------------------------------------

// faisceau du projecteur qui éclaire le saxophone pendant qu'il joue
// (des trapèzes de plus en plus étroits = plus lumineux au centre)
function projecteur(scene) {
  var g = nouveauDessin(scene);
  for (var k = 0; k < 6; k++) {
    var haut = 50 - k * 7;
    var bas = 360 - k * 50;
    g.fillStyle(0xfff3c4, 0.05);
    g.fillPoints(
      [
        { x: 360 - haut, y: 0 },
        { x: 360 + haut, y: 0 },
        { x: 360 + bas, y: 560 },
        { x: 360 - bas, y: 560 }
      ],
      true
    );
  }
  g.generateTexture("tx_projecteur", 720, 560);
  g.destroy();
}

// bulle ronde (on écrit la lettre du bouton dedans)
function bulle(scene) {
  var g = nouveauDessin(scene);
  g.fillStyle(0xffffff);
  g.fillCircle(28, 28, 26);
  g.fillTriangle(20, 48, 36, 48, 28, 62);
  g.lineStyle(3, 0x1b1030);
  g.strokeCircle(28, 28, 26);
  g.generateTexture("tx_bulle", 56, 64);
  g.destroy();
}

// ---------------------------------------------------------------------------
// NOTE CATCHER
// ---------------------------------------------------------------------------

// croche dorée : 10 points
function croche(scene) {
  var g = nouveauDessin(scene);
  avecContour((dx, dy, c) => dessinerCroche(g, 3 + dx, 3 + dy, 0.36, c), 0x1b1030, 0xffd23f);
  g.fillStyle(0xffffff, 0.8);
  g.fillEllipse(8, 42, 5, 3); // petit reflet sur la tete
  g.generateTexture("tx_croche", 32, 54);
  g.destroy();
}

// double croche bleue : 20 points
function doubleCroche(scene) {
  var g = nouveauDessin(scene);
  var dessiner = (dx, dy, couleur) => {
    g.fillStyle(couleur);
    g.fillEllipse(dx + 12, dy + 44, 16, 11); // les 2 tetes
    g.fillEllipse(dx + 38, dy + 40, 16, 11);
    g.fillRect(dx + 18, dy + 9, 3, 35); // les 2 hampes
    g.fillRect(dx + 44, dy + 5, 3, 35);
    // les 2 barres qui relient les hampes
    g.fillPoints(
      [
        { x: dx + 18, y: dy + 9 },
        { x: dx + 47, y: dy + 5 },
        { x: dx + 47, y: dy + 11 },
        { x: dx + 18, y: dy + 15 }
      ],
      true
    );
    g.fillPoints(
      [
        { x: dx + 18, y: dy + 19 },
        { x: dx + 47, y: dy + 15 },
        { x: dx + 47, y: dy + 20 },
        { x: dx + 18, y: dy + 24 }
      ],
      true
    );
  };
  avecContour((dx, dy, c) => dessiner(3 + dx, 3 + dy, c), 0x1b1030, 0x4fd6ff);
  g.generateTexture("tx_double", 56, 56);
  g.destroy();
}

// note d'or qui brille : 50 points (rare)
function noteOr(scene) {
  var g = nouveauDessin(scene);
  for (var r = 30; r > 0; r -= 3) {
    g.fillStyle(0xffe680, 0.05 + (1 - r / 30) * 0.12);
    g.fillCircle(30, 32, r);
  }
  avecContour((dx, dy, c) => dessinerCroche(g, 19 + dx, 8 + dy, 0.36, c), 0x7a4a00, 0xffc400);
  g.fillStyle(0xffffff);
  g.fillCircle(24, 49, 2);
  g.fillCircle(46, 14, 2);
  g.fillCircle(12, 20, 1.5);
  g.generateTexture("tx_or", 60, 64);
  g.destroy();
}

// fausse note : note noire entourée de rouge, avec une croix (à éviter !)
function fausseNote(scene) {
  var g = nouveauDessin(scene);
  for (var r = 24; r > 0; r -= 3) {
    g.fillStyle(0xff2030, 0.04 + (1 - r / 24) * 0.1);
    g.fillCircle(18, 42, r);
  }
  avecContour((dx, dy, c) => dessinerCroche(g, 8 + dx, 4 + dy, 0.36, c), 0xff3040, 0x14081c);
  g.lineStyle(2, 0xffffff);
  g.lineBetween(12, 41, 20, 47);
  g.lineBetween(20, 41, 12, 47);
  g.generateTexture("tx_fausse", 44, 64);
  g.destroy();
}

// le livre ouvert que le perso tient au-dessus de sa tete
function livre(scene) {
  var g = nouveauDessin(scene);
  // couverture
  g.fillStyle(0x6b2e1e);
  g.fillPoints(
    [
      { x: 0, y: 10 },
      { x: 52, y: 18 },
      { x: 104, y: 10 },
      { x: 104, y: 22 },
      { x: 52, y: 32 },
      { x: 0, y: 22 }
    ],
    true
  );
  // les 2 pages
  g.fillStyle(0xfbf5e6);
  g.fillPoints(
    [
      { x: 4, y: 5 },
      { x: 51, y: 14 },
      { x: 51, y: 26 },
      { x: 4, y: 17 }
    ],
    true
  );
  g.fillPoints(
    [
      { x: 53, y: 14 },
      { x: 100, y: 5 },
      { x: 100, y: 17 },
      { x: 53, y: 26 }
    ],
    true
  );
  // des lignes de portée sur les pages
  g.lineStyle(1, 0x9c8a70);
  for (var k = 0; k < 3; k++) {
    g.lineBetween(9, 9 + k * 3, 47, 16 + k * 3);
    g.lineBetween(57, 16 + k * 3, 95, 9 + k * 3);
  }
  g.lineStyle(2, 0x9c7b5a);
  g.lineBetween(52, 14, 52, 28); // la reliure
  g.generateTexture("tx_livre", 104, 34);
  g.destroy();
}

// une portée volante (les plateformes qui font dévier les notes)
function portee(scene) {
  var g = nouveauDessin(scene);
  g.fillStyle(0x1b1030, 0.88);
  g.fillRoundedRect(0, 0, 200, 28, 12);
  g.lineStyle(2, 0xe0a818);
  g.strokeRoundedRect(1, 1, 198, 26, 12);
  g.lineStyle(1, 0xf3e3b5, 0.9);
  for (var k = 0; k < 5; k++) g.lineBetween(12, 6 + k * 4, 188, 6 + k * 4);
  g.generateTexture("tx_portee", 200, 28);
  g.destroy();
}
