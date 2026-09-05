#!/usr/bin/env node
/**
 * Petit serveur statique sans dependance pour ouvrir le simulateur
 * dans un navigateur : node tools/serve.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2]) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.css': 'text/css; charset=utf-8'
};

http
  .createServer((req, res) => {
    let rel = decodeURIComponent(req.url.split('?')[0]);
    if (rel === '/') rel = '/web/index.html';
    const file = path.join(ROOT, rel);
    // On ne sert rien en dehors du projet.
    if (!file.startsWith(ROOT + path.sep)) {
      res.writeHead(403).end('interdit');
      return;
    }
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('introuvable : ' + rel);
        return;
      }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  })
  .listen(PORT, () => {
    console.log('Simulateur Padel : http://localhost:' + PORT + '/');
    console.log('Ctrl+C pour arreter.');
  });
