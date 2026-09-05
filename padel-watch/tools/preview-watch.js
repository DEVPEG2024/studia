#!/usr/bin/env node
/**
 * Rend une page .ux dans un navigateur, à la taille de la dalle de la montre.
 *
 * Faute d'appareil et d'émulateur Vela accessible, c'est le seul moyen de
 * regarder l'écran avant de le livrer. La traduction reste fidèle sur ce qui
 * décide de la mise en page : Vela affiche les <div> en flex ligne par
 * défaut, les <text> en bloc, et exige border-width là où CSS veut aussi un
 * border-style.
 *
 * Usage : node tools/preview-watch.js [page.ux] [sortie.html]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = process.argv[2] || path.join(ROOT, 'src', 'pages', 'Index', 'index.ux');
const OUT = process.argv[3] || path.join(ROOT, 'dist', 'preview-montre.html');

// Un match plausible : 3e set, avantage, NOUS au service.
const SAMPLE = {
  phaseText: 'SET 3',
  historyText: '6-4 · 3-6',
  teamA: 'NOUS', teamB: 'EUX',
  setsA: '1', setsB: '1',
  pointAnimA: '', pointAnimB: '', gamesAnimA: '', gamesAnimB: '',
  spotLeftA: 'sp-vide', spotRightA: 'sp-a', spotLeftB: '', spotRightB: '',
  pointA: 'AV', pointB: '40',
  gamesA: '5', gamesB: '4',
  plateClassA: 'pl-a', plateClassB: '',
  teamClassA: 'tm-on', teamClassB: '',
  setsClassA: 'sn-on', setsClassB: 'sn-b',
  pointClassA: 'pt-a', pointClassB: 'pt-b',
  statusText: 'AVANTAGE NOUS', statusClass: 'sl-a',
  undoClass: '',
  finished: false
};

function block(source, tag) {
  const open = source.indexOf('<' + tag + '>');
  const close = source.lastIndexOf('</' + tag + '>');
  return source.slice(open + tag.length + 2, close);
}

const source = fs.readFileSync(SRC, 'utf8');

// --- styles : CSS exige un border-style que Vela sous-entend ---
const style = block(source, 'style')
  .replace(/(border(?:-top|-right|-bottom|-left)?)-width:/g, '$1-style: solid;\n  $1-width:');

// --- gabarit : bindings résolus, <text> en bloc, gestionnaires retirés ---
let template = block(source, 'template')
  .replace(/\{\{\s*([^}]+?)\s*\}\}/g, (all, expr) => {
    const key = expr.trim();
    if (Object.prototype.hasOwnProperty.call(SAMPLE, key)) return String(SAMPLE[key]);
    if (key.startsWith('!')) return '';               // show="{{ !finished }}"
    return '';
  })
  .replace(/\sonclick="[^"]*"/g, '')
  .replace(/\sshow="[^"]*"/g, '')
  // <text class="x"> doit devenir <div class="t x">, pas deux attributs class.
  .replace(/<text(\s[^>]*?)?>/g, (all, attrs = '') => {
    const raw = attrs || '';
    const cls = raw.match(/\sclass="([^"]*)"/);
    const rest = raw.replace(/\sclass="[^"]*"/, '');
    return '<div class="t' + (cls ? ' ' + cls[1].trim() : '') + '"' + rest + '>';
  })
  .replace(/<\/text>/g, '</div>');

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Aperçu — écran de la montre</title>
<style>
  body {
    margin: 0; min-height: 100vh; display: flex;
    align-items: center; justify-content: center;
    background: #11161d; font-family: system-ui, -apple-system, sans-serif;
  }
  /* La dalle de la Redmi Watch 4. */
  .device {
    width: 390px; height: 450px; overflow: hidden;
    border-radius: 44px; box-shadow: 0 0 0 9px #1b222c, 0 20px 54px rgba(0,0,0,.65);
    display: flex; flex-direction: column;
  }
  /* Vela : les div sont des conteneurs flex en ligne, les text des blocs.
     Sélecteurs volontairement faibles : la moindre règle de classe du .ux
     doit pouvoir les emporter, comme sur l'appareil. */
  div { display: flex; flex-direction: row; box-sizing: border-box; min-width: 0; }
  .t { display: block; }
${style.replace(/^/gm, '  ')}
</style>
</head>
<body>
<div class="device">
${template}
</div>
</body>
</html>
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log('aperçu écrit : ' + path.relative(ROOT, OUT));
