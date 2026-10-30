/**
 * Copies build/index.html into route folders so static hosting
 * can open /bwc, /num, … without server rewrite rules.
 */
const fs = require('fs');
const path = require('path');

const ROUTES = ['bwc', 'num', 'twodigit', 'dice', 'random'];
const buildDir = path.join(__dirname, '..', 'build');
const indexPath = path.join(buildDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('build/index.html not found. Run build first.');
  process.exit(1);
}

const html = fs.readFileSync(indexPath, 'utf8');

for (const route of ROUTES) {
  const dir = path.join(buildDir, route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
  console.log(`spa-routes: ${route}/index.html`);
}
