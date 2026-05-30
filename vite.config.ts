import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      // Sert le WASM de sql.js depuis node_modules en dev
      // (Vite réserve /assets/* pour ses propres bundles)
      name: 'serve-sql-wasm',
      configureServer(server) {
        server.middlewares.use('/assets/sql-wasm.wasm', (_req, res) => {
          const wasmPath = path.resolve('node_modules/sql.js/dist/sql-wasm.wasm');
          res.setHeader('Content-Type', 'application/wasm');
          fs.createReadStream(wasmPath).pipe(res);
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: ['jeep-sqlite'],
  },
});
