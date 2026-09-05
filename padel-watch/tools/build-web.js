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
 * Avec --pwa, la sortie est un dossier complet (page + service worker +
 * manifeste + icones) prêt à être servi en HTTPS : c'est cette forme qui
 * permet à iOS d'installer la page sur l'écran d'accueil et de lui laisser
 * envoyer des notifications, donc de pousser le score jusqu'à la montre.
 *
 * Usage : node tools/build-web.js [sortie] [--artifact] [--pwa] [--title=...]
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function main() {
const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'web', 'index.html');
const ENGINE = path.join(ROOT, 'src', 'common', 'padel-engine.js');
const args = process.argv.slice(2);
const ARTIFACT = args.includes('--artifact');
const PWA = args.includes('--pwa');
// Le titre de l'onglet du depot ("simulateur ...") ne convient pas a une page
// publiee, qui est l'application elle-meme et non une maquette.
const titleArg = args.find((a) => a.startsWith('--title='));
const TITLE = titleArg ? titleArg.slice('--title='.length) : null;
const OUT =
  args.find((a) => !a.startsWith('--')) ||
  (PWA
    ? path.join(ROOT, '..', 'docs')
    : path.join(ROOT, 'dist', ARTIFACT ? 'padel-artifact.html' : 'padel-web.html'));

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
if (!PWA) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, bundled);
  console.log('page autonome ecrite : ' + path.relative(ROOT, OUT) + ' (' + bundled.length + ' octets)');
  return;
}

/* ---------------- variante installable (PWA) ---------------- */

const icon = require('./make-icon.js');
const version = crypto.createHash('sha256').update(bundled).digest('hex').slice(0, 12);

bundled = bundled.replace(
  '</head>',
  '<link rel="manifest" href="manifest.webmanifest">\n' +
    '<link rel="apple-touch-icon" href="icon-192.png">\n' +
    '</head>'
);

const manifest = {
  name: 'Compteur Padel',
  short_name: 'Padel',
  description: "Compteur de points de padel : une moitié d'écran par équipe.",
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'any',
  background_color: '#000000',
  theme_color: '#000000',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};

// Le cache est versionné par le contenu de la page : une nouvelle version
// remplace l'ancienne au lieu de rester bloquée dans le cache du téléphone.
const sw = `/* Service worker du compteur Padel — généré par tools/build-web.js */
const CACHE = 'padel-${version}';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La page elle-même : réseau d'abord, cache en secours. Sans cela une mise à
// jour n'apparaît qu'au lancement suivant. Le reste : cache d'abord, pour que
// le compteur démarre sur un terrain sans réseau.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const isPage = event.request.mode === 'navigate' ||
    event.request.destination === 'document';

  if (isPage) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match(event.request).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(caches.match(event.request).then((hit) => hit || fetch(event.request)));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) if ('focus' in client) return client.focus();
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
`;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), bundled);
fs.writeFileSync(path.join(OUT, 'sw.js'), sw);
fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
icon.write(192, path.join(OUT, 'icon-192.png'));
icon.write(512, path.join(OUT, 'icon-512.png'));
// GitHub Pages passe le site par Jekyll sans ce fichier, ce qui casse les
// noms commençant par un tiret bas et ralentit la publication.
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

console.log('site installable écrit dans ' + OUT);
for (const f of fs.readdirSync(OUT).sort()) {
  console.log('  ' + f + '  ' + fs.statSync(path.join(OUT, f)).size + ' octets');
}
console.log('version du cache : padel-' + version);
}

main();
