#!/usr/bin/env node
/**
 * Verification statique des fichiers .ux avant compilation :
 *  - les trois blocs (template / style / script) sont bien fermes ;
 *  - le script est syntaxiquement valide ;
 *  - chaque classe CSS utilisee dans le template existe dans le style ;
 *  - chaque gestionnaire onclick / onlongpress existe dans le script.
 *
 * Usage : node tools/check-ux.js src/**\/*.ux
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function blocks(source, tag) {
  const open = source.indexOf('<' + tag + '>');
  const close = source.lastIndexOf('</' + tag + '>');
  if (open === -1 || close === -1 || close < open) return null;
  return source.slice(open + tag.length + 2, close);
}

function checkFile(file) {
  const errors = [];
  const source = fs.readFileSync(file, 'utf8');
  const script = blocks(source, 'script');
  const template = blocks(source, 'template');
  const style = blocks(source, 'style');

  if (script === null) errors.push('bloc <script> absent ou mal ferme');
  if (template === null && !file.endsWith('app.ux')) errors.push('bloc <template> absent ou mal ferme');
  if (style === null && !file.endsWith('app.ux')) errors.push('bloc <style> absent ou mal ferme');

  if (script !== null) {
    // On retire la syntaxe de module pour ne verifier que la syntaxe du corps.
    const plain = script
      .replace(/^\s*import\s[^\n]*$/gm, '')
      .replace(/export\s+default\s*/, 'const __page = ');
    try {
      new vm.Script(plain, { filename: file });
    } catch (e) {
      errors.push('script invalide : ' + e.message);
    }

    // Une const ou let utilisee avant sa declaration passe la verification de
    // syntaxe mais leve une ReferenceError a l'execution. On cherche donc,
    // methode par methode, un usage qui precede la declaration.
    const bodyRe = /^ {2}([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{$/gm;
    let mb;
    while ((mb = bodyRe.exec(script)) !== null) {
      const from = mb.index + mb[0].length;
      const close = script.indexOf('\n  },', from);
      const body = script.slice(from, close === -1 ? script.length : close);
      // Commentaires et chaines contiennent des mots ordinaires : les blanchir
      // evite de prendre le « a » d'une phrase pour la variable a.
      const code = body
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/\/\/[^\n]*/g, ' ')
        .replace(/'(?:\\.|[^'\\])*'/g, "''")
        .replace(/"(?:\\.|[^"\\])*"/g, '""')
        .replace(/`(?:\\.|[^`\\])*`/g, '``');
      const declRe = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/g;
      let md;
      while ((md = declRe.exec(code)) !== null) {
        const name = md[1];
        const before = code.slice(0, md.index);
        if (new RegExp('\\b' + name + '\\b').test(before)) {
          errors.push(
            'dans ' + mb[1] + '() : "' + name + '" est utilisee avant sa declaration'
          );
        }
      }
    }

    if (template) {
      const handlers = new Set();
      const methodRe = /^\s{2}([A-Za-z_$][\w$]*)\s*\(/gm;
      let m;
      while ((m = methodRe.exec(script)) !== null) handlers.add(m[1]);

      // accepte onclick="method" comme onclick="method($idx)"
      const bindRe = /\bon(?:click|longpress|change)\s*=\s*"\s*([A-Za-z_$][\w$]*)\s*(?:\([^"]*\))?\s*"/g;
      while ((m = bindRe.exec(template)) !== null) {
        if (!handlers.has(m[1])) errors.push('gestionnaire "' + m[1] + '" absent du script');
      }
    }
  }

  if (template && style) {
    const declared = new Set();
    const classRe = /\.([A-Za-z_-][\w-]*)\s*(?:,|\{)/g;
    let m;
    while ((m = classRe.exec(style)) !== null) declared.add(m[1]);

    const used = new Set();
    const attrRe = /\bclass\s*=\s*"([^"]*)"/g;
    while ((m = attrRe.exec(template)) !== null) {
      m[1]
        .replace(/\{\{[^}]*\}\}/g, ' ')      // les classes calculees sont verifiees plus bas
        .split(/\s+/)
        .filter(Boolean)
        .forEach((c) => used.add(c));
    }
    used.forEach((c) => {
      if (!declared.has(c)) errors.push('classe "' + c + '" utilisee mais absente du <style>');
    });

    // Les classes injectees par binding sont des chaines litterales dans le script.
    if (script) {
      const dynamic = new Set();
      const strRe = /'((?:pt|gm|dot|st|btn)-[\w-]*)'/g;
      while ((m = strRe.exec(script)) !== null) dynamic.add(m[1]);
      dynamic.forEach((c) => {
        if (!declared.has(c)) errors.push('classe dynamique "' + c + '" absente du <style>');
      });
    }
  }

  return errors;
}

const files = process.argv.slice(2);
if (!files.length) {
  console.error('usage : node tools/check-ux.js <fichiers .ux>');
  process.exit(2);
}

let failed = 0;
for (const file of files) {
  const errors = checkFile(file);
  if (errors.length) {
    failed++;
    console.error('FAIL ' + path.relative(process.cwd(), file));
    errors.forEach((e) => console.error('     - ' + e));
  } else {
    console.log('ok   ' + path.relative(process.cwd(), file));
  }
}
process.exit(failed ? 1 : 0);
