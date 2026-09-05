#!/usr/bin/env node
/**
 * Produit une version autonome du simulateur : le moteur de score est
 * inline dans la page, qui n'a alors plus aucune dependance externe et
 * peut etre ouverte depuis n'importe ou (fichier local, hebergement,
 * ajout a l'ecran d'accueil d'un telephone).
 *
 * Avec --artifact, la sortie est un fragment (titre + style + contenu +
 * script) sans <!doctype>/<html>/<head>/<body>, forme attendue par les
 * pages publiees comme Artifact.
 *
 * Usage : node tools/build-web.js [fichier de sortie] [--artifact] [--title=...]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'web', 'index.html');
const ENGINE = path.join(ROOT, 'src', 'common', 'padel-engine.js');
const args = process.argv.slice(2);
const ARTIFACT = args.includes('--artifact');
// Le titre de l'onglet du depot ("simulateur ...") ne convient pas a une page
// publiee, qui est l'application elle-meme et non une maquette.
const titleArg = args.find((a) => a.startsWith('--title='));
const TITLE = titleArg ? titleArg.slice('--title='.length) : null;
const OUT =
  args.find((a) => !a.startsWith('--')) ||
  path.join(ROOT, 'dist', ARTIFACT ? 'padel-artifact.html' : 'padel-web.html');

const TAG = '<script src="../src/common/padel-engine.js"></script>';

const page = fs.readFileSync(SOURCE, 'utf8');
if (!page.includes(TAG)) {
  console.error('balise du moteur introuvable dans web/index.html — rien a inliner');
  process.exit(1);
}

const engine = fs.readFileSync(ENGINE, 'utf8');
// Une balise fermante dans le source casserait le <script> qui l'englobe.
if (/<\/script/i.test(engine)) {
  console.error('le moteur contient une balise </script>, inlining impossible');
  process.exit(1);
}

let bundled = page.replace(TAG, '<script>\n' + engine + '\n</script>');

if (ARTIFACT) {
  // L'hote fournit deja <!doctype>, <html>, <head> et <body> : on ne garde
  // que le titre, les styles et le contenu.
  const title = TITLE ? '<title>' + TITLE + '</title>' : bundled.match(/<title>[\s\S]*?<\/title>/)[0];
  const style = bundled.match(/<style>[\s\S]*?<\/style>/)[0];
  const body = bundled.slice(bundled.indexOf('<body>') + 6, bundled.lastIndexOf('</body>'));
  bundled = title + '\n' + style + '\n' + body.trim() + '\n';
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, bundled);
console.log('page autonome ecrite : ' + path.relative(ROOT, OUT) + ' (' + bundled.length + ' octets)');
