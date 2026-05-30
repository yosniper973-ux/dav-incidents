import { cpSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const src = resolve(root, 'node_modules/sql.js/dist/sql-wasm.wasm');
const destDir = resolve(root, 'public/assets');
const dest = resolve(destDir, 'sql-wasm.wasm');

if (!existsSync(src)) {
  console.warn('⚠️  sql-wasm.wasm introuvable dans node_modules (normal avant npm install).');
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
cpSync(src, dest);
console.log('✓ sql-wasm.wasm copié dans public/');
