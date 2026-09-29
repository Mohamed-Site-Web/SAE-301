// Les bruitages et les instruments sont fabriqués directement avec la
// Web Audio API (des oscillateurs, comme un petit synthé) : aucun fichier son
// à charger, et chaque note peut avoir la hauteur qu'on veut.
// On passe par le contexte audio de Phaser. Seule la musique de fond est un
// fichier (assets/sons/musique.ogg).

function contexte(scene) {
  var ctx = scene.sound.context; // n'existe que si Phaser utilise la Web Audio
  if (!ctx || scene.sound.mute) return null;
  return ctx;
}

// fréquence d'une note à partir de son numéro MIDI (69 = La 440 Hz, 60 = Do)
function midi(n) {
  return 440 * Math.pow(2, (n - 69) / 12);
}

// sortie avec panoramique : -1 = haut-parleur gauche, 1 = droite.
// En duo, chaque joueur entend ses notes de son coté de la borne.
function sortie(ctx, pan) {
  if (!pan || !ctx.createStereoPanner) return ctx.destination;
  var p = ctx.createStereoPanner();
  p.pan.value = pan;
  p.connect(ctx.destination);
  return p;
}

// une note simple : fréquence en Hz, début et durée en secondes
function bip(ctx, freq, debut, duree, forme, volume, dest) {
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = forme;
  osc.frequency.setValueAtTime(freq, debut);
  // petite enveloppe pour éviter les "clics"
  gain.gain.setValueAtTime(0.0001, debut);
  gain.gain.exponentialRampToValueAtTime(volume, debut + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
  osc.connect(gain);
  gain.connect(dest || ctx.destination);
  osc.start(debut);
  osc.stop(debut + duree + 0.05);
  return osc;
}

// ---------------------------------------------------------------------------
// INSTRUMENTS (options : pan, retard en secondes, duree, volume)
// ---------------------------------------------------------------------------

// piano_time (piano_time Time) : une fondamentale + des harmoniques qui s'éteignent plus vite
export function jouerpiano_time(scene, n, options) {
  var ctx = contexte(scene);
  if (!ctx) return;
  var o = options || {};
  var t = ctx.currentTime + (o.retard || 0);
  var v = o.volume || 1;
  var dest = sortie(ctx, o.pan);
  var f = midi(n);
  bip(ctx, f, t, 1.1, "triangle", 0.24 * v, dest);
  bip(ctx, f * 2, t, 0.45, "sine", 0.07 * v, dest);
  bip(ctx, f * 3, t, 0.2, "sine", 0.035 * v, dest);
}

// saxophone (Memory Song) : onde en dents de scie adoucie par un filtre, avec un vibrato
export function jouerSaxo(scene, n, options) {
  var ctx = contexte(scene);
  if (!ctx) return;
  var o = options || {};
  var t = ctx.currentTime;
  var duree = o.duree || 0.4;
  var f = midi(n);

  var osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(f, t);
  // vibrato : un 2e oscillateur, très lent, fait onduler la fréquence
  var vibrato = ctx.createOscillator();
  var profondeur = ctx.createGain();
  vibrato.frequency.value = 5.5;
  profondeur.gain.value = f * 0.01;
  vibrato.connect(profondeur);
  profondeur.connect(osc.frequency);
  // le filtre s'ouvre à l'attaque (le "souffle" du saxo) puis se referme un peu
  var filtre = ctx.createBiquadFilter();
  filtre.type = "lowpass";
  filtre.Q.value = 4;
  filtre.frequency.setValueAtTime(600, t);
  filtre.frequency.linearRampToValueAtTime(2600, t + 0.06);
  filtre.frequency.linearRampToValueAtTime(1500, t + duree);
  var gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.16, t + 0.04);
  gain.gain.setValueAtTime(0.16, t + Math.max(0.05, duree - 0.06));
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duree + 0.08);

  osc.connect(filtre);
  filtre.connect(gain);
  gain.connect(sortie(ctx, o.pan));
  osc.start(t);
  vibrato.start(t);
  osc.stop(t + duree + 0.12);
  vibrato.stop(t + duree + 0.12);
}

// boite à musique (Note Catcher) : son de clochette aigu et court
export function jouerCelesta(scene, n, options) {
  var ctx = contexte(scene);
  if (!ctx) return;
  var o = options || {};
  var t = ctx.currentTime + (o.retard || 0);
  var v = o.volume || 1;
  var dest = sortie(ctx, o.pan);
  var f = midi(n);
  bip(ctx, f, t, 0.8, "sine", 0.22 * v, dest);
  bip(ctx, f * 2, t, 0.3, "triangle", 0.05 * v, dest);
  bip(ctx, f * 4, t, 0.08, "sine", 0.04 * v, dest);
}

// orgue (pour le Maestro) : plusieurs octaves en même temps
function jouerOrgue(scene, n, options) {
  var ctx = contexte(scene);
  if (!ctx) return;
  var t = ctx.currentTime + options.retard;
  bip(ctx, midi(n), t, options.duree, "square", 0.05);
  bip(ctx, midi(n) / 2, t, options.duree, "sine", 0.12);
  bip(ctx, midi(n) * 2, t, options.duree, "sine", 0.04);
}

// petit air joué quand on choisit un perso (chaque perso a le sien)
export function jouerMotif(scene, perso) {
  var instrument = perso.cle == "maestro" ? jouerOrgue : perso.cle == "diva" ? jouerCelesta : jouerpiano_time;
  perso.motif.forEach((n, i) => instrument(scene, n, { retard: i * 0.11, duree: 0.13, volume: 0.9 }));
}

// ---------------------------------------------------------------------------
// BRUITAGES
// ---------------------------------------------------------------------------
export function jouerSon(scene, nom, pan) {
  var ctx = contexte(scene);
  if (!ctx) return;
  var t = ctx.currentTime;
  var dest = sortie(ctx, pan);

  if (nom == "menu") {
    bip(ctx, 880, t, 0.06, "triangle", 0.12, dest);
  } else if (nom == "valider") {
    bip(ctx, midi(72), t, 0.08, "triangle", 0.15, dest);
    bip(ctx, midi(79), t + 0.07, 0.12, "triangle", 0.15, dest);
  } else if (nom == "retour") {
    bip(ctx, midi(76), t, 0.08, "triangle", 0.13, dest);
    bip(ctx, midi(69), t + 0.07, 0.12, "triangle", 0.13, dest);
  } else if (nom == "erreur") {
    bip(ctx, 140, t, 0.18, "square", 0.08, dest);
  } else if (nom == "tic") {
    // métronome
    bip(ctx, 1320, t, 0.05, "square", 0.06, dest);
  } else if (nom == "top") {
    bip(ctx, 1760, t, 0.14, "square", 0.08, dest);
  } else if (nom == "compteur") {
    bip(ctx, 1000, t, 0.02, "square", 0.03, dest);
  } else if (nom == "couac") {
    // la fausse note : un "pouêt" qui dégringole
    var o = bip(ctx, 260, t, 0.35, "sawtooth", 0.1, dest);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.35);
    bip(ctx, 180, t, 0.25, "square", 0.05, dest);
  } else if (nom == "trop_tot") {
    bip(ctx, 520, t, 0.07, "square", 0.04, dest);
  } else if (nom == "combo") {
    [72, 76, 79, 84].forEach((n, i) => bip(ctx, midi(n), t + i * 0.05, 0.12, "square", 0.05, dest));
  } else if (nom == "elimine") {
    // "wah wah wah waaah" du trombone triste
    [67, 66, 65].forEach((n, i) => bip(ctx, midi(n - 12), t + i * 0.3, 0.28, "sawtooth", 0.07, dest));
    var dernier = bip(ctx, midi(52), t + 0.9, 0.9, "sawtooth", 0.07, dest);
    dernier.frequency.linearRampToValueAtTime(midi(50), t + 1.8);
  } else if (nom == "note_catcher") {
    bip(ctx, 1200, t, 0.05, "sine", 0.06, dest);
  } else if (nom == "bonus") {
    [79, 83, 86, 91].forEach((n, i) => bip(ctx, midi(n), t + i * 0.06, 0.2, "triangle", 0.09, dest));
  } else if (nom == "fanfare" || nom == "bravo") {
    // arpège do - mi - sol - do
    [72, 76, 79, 84].forEach((n, i) => bip(ctx, midi(n), t + i * 0.09, 0.25, "square", 0.07, dest));
    if (nom == "fanfare") bip(ctx, midi(88), t + 0.4, 0.6, "square", 0.07, dest);
  }
}

// Music Fall : "boum" grave du tampon + une note d'autant plus aiguë qu'on est précis
export function jouerTampon(scene, cm) {
  var ctx = contexte(scene);
  if (!ctx) return;
  var t = ctx.currentTime;
  var osc = bip(ctx, 160, t, 0.18, "sine", 0.5);
  osc.frequency.exponentialRampToValueAtTime(55, t + 0.18);
  var hauteur = cm <= 0 ? 84 : Math.max(60, 81 - cm);
  bip(ctx, midi(hauteur), t + 0.05, 0.35, "triangle", 0.18);
}

// Music Fall : sifflement qui descend pendant la music_fall (comme dans les dessins
// animés). Il faut pouvoir l'arrêter au moment du tampon, donc on renvoie un objet.
export function sifflet(scene, duree) {
  var ctx = contexte(scene);
  if (!ctx) return { stop: () => {} };
  var t = ctx.currentTime;
  var osc = ctx.createOscillator();
  var gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(1400, t);
  osc.frequency.exponentialRampToValueAtTime(300, t + duree);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.05, t + 0.05);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duree + 0.5);
  return {
    stop: () => {
      var maintenant = ctx.currentTime;
      gain.gain.cancelScheduledValues(maintenant);
      gain.gain.setTargetAtTime(0, maintenant, 0.02); // descend vite vers 0
      try {
        osc.stop(maintenant + 0.2);
      } catch (e) {} // certains navigateurs n'aiment pas un 2e stop()
    }
  };
}

// musique de fond (pack SunnyLand Music), en boucle sur tout le jeu
export function lancerMusique(scene) {
  var musique = scene.sound.get("musique");
  if (musique == null) musique = scene.sound.add("musique", { loop: true, volume: 0.3 });
  if (!musique.isPlaying) musique.play();
  // si on l'avait baissée pendant un jeu, on la remet au volume normal
  volumeMusique(scene, 0.3);
}

// on baisse (ou on coupe) la musique pendant les jeux pour bien entendre les notes
export function volumeMusique(scene, volume) {
  var musique = scene.sound.get("musique");
  if (musique) scene.tweens.add({ targets: musique, volume: volume, duration: 400 });
}
