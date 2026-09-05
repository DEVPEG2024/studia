const test = require('node:test');
const assert = require('node:assert');
const E = require('../src/common/padel-engine.js');

/** Joue une suite de points : '0' = equipe 0, '1' = equipe 1. */
function play(state, seq) {
  for (const ch of seq) E.addPoint(state, ch === '0' ? 0 : 1);
  return state;
}

/** Fait gagner n jeux d'affilee a une equipe (sans avantages). */
function winGames(state, team, n) {
  for (let i = 0; i < n; i++) play(state, String(team).repeat(4));
  return state;
}

/** Amene le set a 6-6 en alternant les jeux, donc sans jamais 2 jeux d'ecart. */
function reachTieBreak(state) {
  for (let i = 0; i < 6; i++) {
    winGames(state, 0, 1);
    winGames(state, 1, 1);
  }
  return state;
}

test('progression des points 0/15/30/40', () => {
  const s = E.createMatch();
  assert.strictEqual(E.pointLabel(s, 0), '0');
  play(s, '0');
  assert.strictEqual(E.pointLabel(s, 0), '15');
  play(s, '0');
  assert.strictEqual(E.pointLabel(s, 0), '30');
  play(s, '0');
  assert.strictEqual(E.pointLabel(s, 0), '40');
  play(s, '0');
  assert.deepStrictEqual(s.games, [1, 0]);
  assert.deepStrictEqual(s.points, [0, 0]);
});

test('point en or : le point a 40-40 emporte le jeu', () => {
  const s = E.createMatch({ goldenPoint: true });
  play(s, '000111');
  assert.deepStrictEqual(s.points, [3, 3]);
  assert.strictEqual(E.pointStatus(s).golden, true);
  play(s, '1');
  assert.deepStrictEqual(s.games, [0, 1]);
});

test('avantages : deuce, avantage, retour a 40-40, jeu', () => {
  const s = E.createMatch({ goldenPoint: false });
  play(s, '000111');
  assert.deepStrictEqual(s.points, [3, 3]);
  play(s, '0');
  assert.strictEqual(E.pointLabel(s, 0), 'AV');
  assert.strictEqual(E.pointLabel(s, 1), '40');
  play(s, '1');                       // retour a 40-40
  assert.deepStrictEqual(s.points, [3, 3]);
  play(s, '11');                      // avantage puis jeu
  assert.deepStrictEqual(s.games, [0, 1]);
});

test('set gagne 6-4', () => {
  const s = E.createMatch();
  winGames(s, 1, 4);
  winGames(s, 0, 6);
  assert.deepStrictEqual(s.sets, [1, 0]);
  assert.deepStrictEqual(E.setSummary(s), ['6-4']);
  assert.deepStrictEqual(s.games, [0, 0]);
});

test('pas de set a 6-5, il faut 7-5', () => {
  const s = E.createMatch();
  winGames(s, 0, 5);
  winGames(s, 1, 5);
  winGames(s, 0, 1);                  // 6-5
  assert.deepStrictEqual(s.sets, [0, 0]);
  assert.deepStrictEqual(s.games, [6, 5]);
  winGames(s, 0, 1);                  // 7-5
  assert.deepStrictEqual(s.sets, [1, 0]);
  assert.deepStrictEqual(E.setSummary(s), ['7-5']);
});

test('tie-break declenche a 6-6 et gagne 7-5', () => {
  const s = E.createMatch();
  reachTieBreak(s);
  assert.deepStrictEqual(s.games, [6, 6]);
  assert.strictEqual(s.tieBreak, true);
  assert.strictEqual(s.tieBreakTarget, 7);
  play(s, '0101010101');              // 5-5
  assert.deepStrictEqual(s.points, [5, 5]);
  play(s, '0');                       // 6-5 : pas encore gagne
  assert.strictEqual(s.tieBreak, true);
  play(s, '0');                       // 7-5
  assert.deepStrictEqual(s.sets, [1, 0]);
  assert.deepStrictEqual(E.setSummary(s), ['7-6(5)']);
});

test('tie-break : il faut 2 points d ecart', () => {
  const s = E.createMatch();
  reachTieBreak(s);
  play(s, '000000111111');            // 6-6
  play(s, '0');                       // 7-6
  assert.strictEqual(s.tieBreak, true, '7-6 ne suffit pas');
  play(s, '1');                       // 7-7
  play(s, '11');                      // 9-7
  assert.deepStrictEqual(s.sets, [0, 1]);
  assert.deepStrictEqual(E.setSummary(s), ['6-7(7)']);
});

test('rotation du service : 1 point puis 2 en tie-break', () => {
  const s = E.createMatch({ firstServer: 0 });
  assert.strictEqual(E.currentServer(s), 0);
  winGames(s, 0, 1);
  assert.strictEqual(E.currentServer(s), 1, 'le service change a chaque jeu');

  const t = E.createMatch();
  reachTieBreak(t);
  const first = t.tieBreakStartServer;
  assert.strictEqual(E.currentServer(t), first);
  play(t, '0');
  assert.strictEqual(E.currentServer(t), 1 - first);
  play(t, '0');
  assert.strictEqual(E.currentServer(t), 1 - first);
  play(t, '0');
  assert.strictEqual(E.currentServer(t), first);
  play(t, '0');
  assert.strictEqual(E.currentServer(t), first);
});

test('match au meilleur des 3 sets', () => {
  const s = E.createMatch({ setsToWin: 2 });
  winGames(s, 0, 6);                  // 6-0
  assert.strictEqual(s.finished, false);
  winGames(s, 1, 6);                  // 0-6
  assert.deepStrictEqual(s.sets, [1, 1]);
  winGames(s, 0, 6);                  // 6-0
  assert.strictEqual(s.finished, true);
  assert.strictEqual(s.winner, 0);
  assert.deepStrictEqual(E.setSummary(s), ['6-0', '0-6', '6-0']);
});

test('un match termine n accepte plus de points', () => {
  const s = E.createMatch({ setsToWin: 1 });
  winGames(s, 0, 6);
  assert.strictEqual(s.finished, true);
  const before = JSON.stringify(s.sets) + JSON.stringify(s.points);
  E.addPoint(s, 1);
  assert.strictEqual(JSON.stringify(s.sets) + JSON.stringify(s.points), before);
});

test('super tie-break en 10 points au set decisif', () => {
  const s = E.createMatch({ superTieBreak: true, superTieBreakPoints: 10 });
  winGames(s, 0, 6);
  winGames(s, 1, 6);
  assert.deepStrictEqual(s.sets, [1, 1]);
  assert.strictEqual(s.tieBreak, true);
  assert.strictEqual(s.superTieBreak, true);
  assert.strictEqual(s.tieBreakTarget, 10);
  play(s, '0'.repeat(9) + '1'.repeat(9));   // 9-9
  assert.strictEqual(s.finished, false);
  play(s, '00');                            // 11-9
  assert.strictEqual(s.finished, true);
  assert.strictEqual(s.winner, 0);
  assert.deepStrictEqual(E.setSummary(s)[2], '[11-9]');
});

test('balles de jeu, de set et de match', () => {
  const s = E.createMatch({ goldenPoint: false, setsToWin: 1 });
  play(s, '000');                     // 40-0
  assert.deepStrictEqual(E.pointStatus(s).teams, ['game', null]);

  const t = E.createMatch({ setsToWin: 1 });
  winGames(t, 0, 5);
  play(t, '000');                     // 5-0, 40-0 -> balle de set = balle de match (1 set)
  assert.strictEqual(E.pointStatus(t).teams[0], 'match');

  const u = E.createMatch({ setsToWin: 2 });
  winGames(u, 0, 5);
  play(u, '000');
  assert.strictEqual(E.pointStatus(u).teams[0], 'set');
});

test('point en or : les deux equipes ont une balle de jeu', () => {
  const s = E.createMatch({ goldenPoint: true });
  play(s, '000111');
  const st = E.pointStatus(s);
  assert.strictEqual(st.golden, true);
  assert.deepStrictEqual(st.teams, ['game', 'game']);
});

test('annulation point par point', () => {
  const s = E.createMatch();
  play(s, '0000');                    // 1 jeu
  assert.deepStrictEqual(s.games, [1, 0]);
  assert.strictEqual(E.undo(s), true);
  assert.deepStrictEqual(s.games, [0, 0]);
  assert.deepStrictEqual(s.points, [3, 0]);
  E.undo(s); E.undo(s); E.undo(s);
  assert.deepStrictEqual(s.points, [0, 0]);
  assert.strictEqual(E.canUndo(s), false);
  assert.strictEqual(E.undo(s), false);
});

test('annulation a travers une fin de set', () => {
  const s = E.createMatch();
  winGames(s, 0, 5);
  play(s, '000');
  const serverBefore = s.server;
  play(s, '0');                       // set 6-0
  assert.deepStrictEqual(s.sets, [1, 0]);
  E.undo(s);
  assert.deepStrictEqual(s.sets, [0, 0]);
  assert.deepStrictEqual(s.games, [5, 0]);
  assert.deepStrictEqual(s.points, [3, 0]);
  assert.deepStrictEqual(E.setSummary(s), []);
  assert.strictEqual(s.server, serverBefore);
});

test('changement de cote sur jeux impairs cumules', () => {
  const s = E.createMatch();
  winGames(s, 0, 1);                  // 1 jeu
  assert.strictEqual(s.changeEnds, true);
  winGames(s, 1, 1);                  // 2 jeux
  assert.strictEqual(s.changeEnds, false);
  winGames(s, 0, 1);                  // 3 jeux
  assert.strictEqual(s.changeEnds, true);
});

test('changement de cote tous les 6 points en tie-break', () => {
  const s = E.createMatch();
  reachTieBreak(s);
  play(s, '01010');                   // 5 points
  assert.strictEqual(s.changeEnds, false);
  play(s, '1');                       // 6 points
  assert.strictEqual(s.changeEnds, true);
});

test('sauvegarde et rechargement du match', () => {
  const s = E.createMatch({ goldenPoint: false, superTieBreak: true });
  winGames(s, 0, 6);
  winGames(s, 1, 3);
  play(s, '0011');
  const restored = E.deserialize(E.serialize(s));
  assert.deepStrictEqual(restored.points, s.points);
  assert.deepStrictEqual(restored.games, s.games);
  assert.deepStrictEqual(restored.sets, s.sets);
  assert.deepStrictEqual(E.setSummary(restored), E.setSummary(s));
  assert.strictEqual(restored.config.goldenPoint, false);
  assert.strictEqual(restored.config.superTieBreak, true);
  assert.strictEqual(restored.server, s.server);
});

test('deserialize tolere les donnees invalides', () => {
  assert.strictEqual(E.deserialize(null), null);
  assert.strictEqual(E.deserialize(''), null);
  assert.strictEqual(E.deserialize('pas du json'), null);
  assert.strictEqual(E.deserialize('{"v":99}'), null);
});

test('la sauvegarde conserve un historique d annulation tronque', () => {
  const s = E.createMatch();
  play(s, '0101010101010101010101010101');   // 28 points
  assert.ok(s.history.length > 20);
  const restored = E.deserialize(E.serialize(s));
  assert.strictEqual(restored.history.length, 20);
  assert.strictEqual(E.canUndo(restored), true);
  E.undo(restored);
  E.undo(s);
  assert.deepStrictEqual(restored.points, s.points);
  assert.deepStrictEqual(restored.games, s.games);
  // l'historique sauvegarde ne duplique pas la configuration
  assert.ok(!('config' in JSON.parse(E.serialize(s)).h[0]));
});

test('profondeur d historique configurable a la sauvegarde', () => {
  const s = E.createMatch();
  play(s, '01010101');
  assert.strictEqual(E.deserialize(E.serialize(s, 0)).history.length, 0);
  assert.strictEqual(E.canUndo(E.deserialize(E.serialize(s, 0))), false);
  assert.strictEqual(E.deserialize(E.serialize(s, 3)).history.length, 3);
});
