import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Builds only the new React rendering layer. Dev source lives in react-ui/,
// outside application/interface/settings/third-party, because
// tests/stylesheet_and_code_cache_proof.mjs statically requires every file
// under those roots to be in service-worker.js's precache list - JSX/dev
// source is a build input, not a shipped runtime asset, so it must not live
// there.
//
// `vite dev` still serves react-ui/index.html as an ordinary app entry (the
// AccordionComparison harness) regardless of the build.lib config below,
// which only applies to `vite build`.
//
// `vite build` produces a single fixed-name ES module
// (application/ui/react-dist/pfa-react.js) - fixed-name, not content-hashed
// like a normal Vite app build, because a vanilla render file needs a
// stable path to `import()` it from, the same way index.html already
// dynamically imports application/sample-data/mock-personas.js. This is
// the real, shipped output once a component is actually wired into a
// vanilla call site - it gets added to service-worker.js's precache list
// in the same change that first does that.
//
// This produces a static bundle a vanilla render file dynamically imports
// directly - deliberately not electron-vite's opinionated
// main/preload/renderer project layout, since that would require
// restructuring desktop-app/electron-main.cjs and electron-preload.cjs,
// which are out of scope for this migration (rendering layer only).
export default defineConfig({
  root: 'react-ui',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./react-ui', import.meta.url)),
    },
  },
  // React itself reads process.env.NODE_ENV at runtime; Vite's default app
  // build replaces it automatically, but lib mode does not, so a browser
  // with no Node "process" global throws "process is not defined" the
  // moment the bundle loads. Caught by actually booting this in the real
  // app (Electron's local HTTP server) rather than trusting a successful
  // `vite build` alone.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    outDir: '../application/ui/react-dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    minify: 'oxc',
    lib: {
      entry: 'mount.jsx',
      formats: ['es'],
      fileName: () => 'pfa-react.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'pfa-react.[ext]',
      },
    },
  },
});
