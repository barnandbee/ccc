// Stamps a new version on every script and stylesheet in index.html, so phones
// load fresh files after an update instead of reusing old cached ones.
//
//   node tools/bump-version.mjs
//
// Run it before pushing any change to the game.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const version = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
const modules = readdirSync(new URL('js/', root)).filter((f) => f.endsWith('.js')).sort();
const map = Object.fromEntries(modules.map((f) => [`./js/${f}`, `./js/${f}?v=${version}`]));
const importMap = `<script type="importmap" id="versions">\n${JSON.stringify({ imports: map }, null, 2)}\n  </script>`;

let html = readFileSync(new URL('index.html', root), 'utf8');
html = html.replace(/<script type="importmap" id="versions">[\s\S]*?<\/script>\n\s*/, '');
html = html.replace(/href="css\/style\.css(\?v=\w+)?"/, `href="css/style.css?v=${version}"`);
html = html.replace(/<script type="module" src="js\/main\.js(\?v=\w+)?"><\/script>/,
  `${importMap}\n  <script type="module" src="js/main.js?v=${version}"></script>`);
writeFileSync(new URL('index.html', root), html);
console.log(`index.html now uses version ${version} for ${modules.length} scripts and the stylesheet`);
