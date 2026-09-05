/**
 * Moteur de score de padel.
 *
 * Ecrit en UMD sans dependance : utilisable tel quel
 *  - dans la quick app Vela  : import PadelEngine from '../../common/padel-engine.js'
 *  - dans le navigateur      : <script src="padel-engine.js"> -> window.PadelEngine
 *  - dans Node (tests)       : require('./padel-engine.js')
 *
 * Regles couvertes :
 *  - points 0 / 15 / 30 / 40, avantages OU point en or (punto de oro)
 *  - jeux : set en 6 jeux avec 2 d'ecart, jeu decisif (tie-break) a 6-6 en 7 points
 *  - match au meilleur des 3 sets, avec option super tie-break en 10 points au 3e set
 *  - suivi du serveur (alternance chaque jeu, rotation 1 puis 2 en tie-break)
 *  - changements de cote (jeux impairs cumules, tous les 6 points en tie-break)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.PadelEngine = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var POINT_LABELS = ['0', '15', '30', '40', 'AV'];

  function defaultConfig() {
    return {
      teams: ['NOUS', 'EUX'],
      goldenPoint: false,         // false = avantages (defaut), true = point en or a 40-40
      gamesPerSet: 6,
      tieBreakAt: 6,              // jeu decisif quand les deux equipes atteignent ce total
      tieBreakPoints: 7,
      setsToWin: 2,               // 2 = au meilleur des 3 sets, 1 = un seul set
      superTieBreak: false,       // set decisif joue en super tie-break
      superTieBreakPoints: 10,
      firstServer: 0
    };
  }

  function mergeConfig(userConfig) {
    var config = defaultConfig();
    if (!userConfig) return config;
    for (var k in userConfig) {
      if (Object.prototype.hasOwnProperty.call(userConfig, k) && userConfig[k] !== undefined && userConfig[k] !== null) {
        config[k] = userConfig[k];
      }
    }
    return config;
  }

  function createMatch(userConfig) {
    var config = mergeConfig(userConfig);
    var state = {
      config: config,
      points: [0, 0],
      games: [0, 0],
      sets: [0, 0],
      setHistory: [],
      tieBreak: false,
      tieBreakTarget: config.tieBreakPoints,
      superTieBreak: false,
      server: config.firstServer,
      tieBreakStartServer: config.firstServer,
      gamesForEnds: 0,
      changeEnds: false,
      finished: false,
      winner: null,
      history: []
    };
    maybeStartSuperTieBreak(state);
    return state;
  }

  /* ------------------------------------------------------------------ */
  /* Clonage (pile d'annulation + simulation des balles de jeu)          */
  /* ------------------------------------------------------------------ */

  function cloneCore(s) {
    var hist = [];
    for (var i = 0; i < s.setHistory.length; i++) {
      var e = s.setHistory[i];
      hist.push({ g: e.g.slice(), tb: e.tb ? e.tb.slice() : null, superTb: e.superTb });
    }
    return {
      config: s.config,
      points: s.points.slice(),
      games: s.games.slice(),
      sets: s.sets.slice(),
      setHistory: hist,
      tieBreak: s.tieBreak,
      tieBreakTarget: s.tieBreakTarget,
      superTieBreak: s.superTieBreak,
      server: s.server,
      tieBreakStartServer: s.tieBreakStartServer,
      gamesForEnds: s.gamesForEnds,
      changeEnds: s.changeEnds,
      finished: s.finished,
      winner: s.winner
    };
  }

  function restoreCore(s, snap) {
    s.points = snap.points;
    s.games = snap.games;
    s.sets = snap.sets;
    s.setHistory = snap.setHistory;
    s.tieBreak = snap.tieBreak;
    s.tieBreakTarget = snap.tieBreakTarget;
    s.superTieBreak = snap.superTieBreak;
    s.server = snap.server;
    s.tieBreakStartServer = snap.tieBreakStartServer;
    s.gamesForEnds = snap.gamesForEnds;
    s.changeEnds = snap.changeEnds;
    s.finished = snap.finished;
    s.winner = snap.winner;
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* Deroulement du match                                                */
  /* ------------------------------------------------------------------ */

  function maybeStartSuperTieBreak(s) {
    var c = s.config;
    if (!c.superTieBreak) return;
    var decider = c.setsToWin - 1;
    if (decider > 0 && s.sets[0] === decider && s.sets[1] === decider) {
      s.tieBreak = true;
      s.superTieBreak = true;
      s.tieBreakTarget = c.superTieBreakPoints;
      s.tieBreakStartServer = s.server;
      s.points = [0, 0];
    }
  }

  function winSet(s, team, tb) {
    s.sets[team]++;
    if (tb && s.superTieBreak) {
      s.setHistory.push({ g: tb.slice(), tb: tb.slice(), superTb: true });
    } else {
      s.setHistory.push({ g: s.games.slice(), tb: tb ? tb.slice() : null, superTb: false });
    }
    s.games = [0, 0];
    s.points = [0, 0];
    s.tieBreak = false;
    s.superTieBreak = false;
    s.tieBreakTarget = s.config.tieBreakPoints;
    if (tb) {
      // celui qui a servi en premier au tie-break recoit au set suivant
      s.server = 1 - s.tieBreakStartServer;
    }
    if (s.sets[team] >= s.config.setsToWin) {
      s.finished = true;
      s.winner = team;
      return;
    }
    maybeStartSuperTieBreak(s);
  }

  function winGame(s, team) {
    var c = s.config;
    var opp = 1 - team;
    s.games[team]++;
    s.points = [0, 0];
    s.gamesForEnds++;
    s.changeEnds = s.gamesForEnds % 2 === 1;
    s.server = 1 - s.server;
    if (s.games[team] >= c.gamesPerSet && s.games[team] - s.games[opp] >= 2) {
      winSet(s, team, null);
      return;
    }
    if (s.games[0] === c.tieBreakAt && s.games[1] === c.tieBreakAt) {
      s.tieBreak = true;
      s.superTieBreak = false;
      s.tieBreakTarget = c.tieBreakPoints;
      s.tieBreakStartServer = s.server;
      s.points = [0, 0];
    }
  }

  function applyPoint(s, team) {
    if (s.finished) return s;
    var opp = 1 - team;
    s.changeEnds = false;

    if (s.tieBreak) {
      s.points[team]++;
      var played = s.points[0] + s.points[1];
      if (played % 6 === 0) s.changeEnds = true;
      if (s.points[team] >= s.tieBreakTarget && s.points[team] - s.points[opp] >= 2) {
        var tb = s.points.slice();
        if (!s.superTieBreak) s.games[team]++;
        s.gamesForEnds++;
        winSet(s, team, tb);
      }
      return s;
    }

    var p = s.points[team];
    var q = s.points[opp];

    if (p < 3) {
      s.points[team] = p + 1;
      return s;
    }
    if (p === 4) {            // l'equipe avait l'avantage
      winGame(s, team);
      return s;
    }
    // p === 3 (40)
    if (q < 3) {
      winGame(s, team);
      return s;
    }
    if (q === 3) {            // 40-40
      if (s.config.goldenPoint) winGame(s, team);
      else s.points[team] = 4;
      return s;
    }
    // q === 4 : l'adversaire avait l'avantage -> retour a 40-40
    s.points[opp] = 3;
    return s;
  }

  /* ------------------------------------------------------------------ */
  /* API publique                                                        */
  /* ------------------------------------------------------------------ */

  function addPoint(s, team) {
    if (s.finished) return s;
    s.history.push(cloneCore(s));
    if (s.history.length > 80) s.history.shift();
    return applyPoint(s, team);
  }

  function undo(s) {
    if (!s.history || !s.history.length) return false;
    restoreCore(s, s.history.pop());
    return true;
  }

  function canUndo(s) {
    return !!(s.history && s.history.length);
  }

  function currentServer(s) {
    if (!s.tieBreak) return s.server;
    var played = s.points[0] + s.points[1];
    return (s.tieBreakStartServer + Math.floor((played + 1) / 2)) % 2;
  }

  function pointLabel(s, team) {
    if (s.tieBreak) return String(s.points[team]);
    return POINT_LABELS[s.points[team]];
  }

  /** Numero du set en cours (1-based). */
  function currentSetNumber(s) {
    return s.setHistory.length + 1;
  }

  /** Sets termines, formates : ['6-4', '6-7(5)', '[10-8]']. */
  function setSummary(s) {
    var out = [];
    for (var i = 0; i < s.setHistory.length; i++) {
      var e = s.setHistory[i];
      if (e.superTb) {
        out.push('[' + e.g[0] + '-' + e.g[1] + ']');
      } else if (e.tb) {
        out.push(e.g[0] + '-' + e.g[1] + '(' + Math.min(e.tb[0], e.tb[1]) + ')');
      } else {
        out.push(e.g[0] + '-' + e.g[1]);
      }
    }
    return out;
  }

  /**
   * Balles de jeu / de set / de match.
   * Retourne { golden, teams: [typeA, typeB] } ou type vaut
   * 'game' | 'set' | 'match' | null.
   */
  function pointStatus(s) {
    var res = { golden: false, teams: [null, null] };
    if (s.finished) return res;
    if (!s.tieBreak && s.config.goldenPoint && s.points[0] === 3 && s.points[1] === 3) {
      res.golden = true;
    }
    for (var team = 0; team < 2; team++) {
      var c = cloneCore(s);
      applyPoint(c, team);
      if (c.finished) res.teams[team] = 'match';
      else if (c.setHistory.length > s.setHistory.length) res.teams[team] = 'set';
      else if (c.games[team] > s.games[team]) res.teams[team] = 'game';
    }
    return res;
  }

  /* ------------------------------------------------------------------ */
  /* Persistance                                                         */
  /* ------------------------------------------------------------------ */

  /** L'historique d'annulation est tronque pour rester leger en stockage. */
  function serialize(s, historyDepth) {
    var core = cloneCore(s);
    core.config = s.config;
    core.v = 1;
    var depth = historyDepth === undefined ? 20 : historyDepth;
    var kept = depth > 0 ? s.history.slice(-depth) : [];
    core.h = [];
    for (var i = 0; i < kept.length; i++) {
      var snap = kept[i];
      var lean = {};
      for (var k in snap) {
        if (k !== 'config' && Object.prototype.hasOwnProperty.call(snap, k)) lean[k] = snap[k];
      }
      core.h.push(lean);
    }
    return JSON.stringify(core);
  }

  function deserialize(json) {
    if (!json) return null;
    var data;
    try {
      data = JSON.parse(json);
    } catch (e) {
      return null;
    }
    if (!data || data.v !== 1 || !data.points || !data.games || !data.sets) return null;
    var s = createMatch(data.config);
    restoreCore(s, {
      points: data.points,
      games: data.games,
      sets: data.sets,
      setHistory: data.setHistory || [],
      tieBreak: !!data.tieBreak,
      tieBreakTarget: data.tieBreakTarget || s.config.tieBreakPoints,
      superTieBreak: !!data.superTieBreak,
      server: data.server || 0,
      tieBreakStartServer: data.tieBreakStartServer || 0,
      gamesForEnds: data.gamesForEnds || 0,
      changeEnds: !!data.changeEnds,
      finished: !!data.finished,
      winner: typeof data.winner === 'number' ? data.winner : null
    });
    s.history = Array.isArray(data.h) ? data.h : [];
    return s;
  }

  return {
    POINT_LABELS: POINT_LABELS,
    defaultConfig: defaultConfig,
    createMatch: createMatch,
    addPoint: addPoint,
    undo: undo,
    canUndo: canUndo,
    currentServer: currentServer,
    pointLabel: pointLabel,
    currentSetNumber: currentSetNumber,
    setSummary: setSummary,
    pointStatus: pointStatus,
    serialize: serialize,
    deserialize: deserialize
  };
});
