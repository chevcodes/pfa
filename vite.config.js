import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Builds only the new React rendering layer. Dev source lives in react-ui/,
// outside application/interface/settings/third-party, because
// tests/stylesheet_and_code_cache_proof.mjs statically requires every file
// under those roots to be in service-worker.js's precache list - JSX/dev
// source is a build input, not a shipped runtime asset, so it must not live
// there. The build output stays inside react-ui/dist/ for the same reason,
// until a real component is ready to ship - at that point outDir moves to
// application/ui/react-dist/ and that path is added to the precache list
// in the same change that first wires it into index.html.
// The rest of the app (application/app-controller.js and every other
// vanilla module) is untouched and keeps loading exactly as before, served
// by desktop-app/electron-main.cjs's own local HTTP server / npm run web.
// This produces a static bundle that index.html references directly -
// deliberately not electron-vite's opinionated main/preload/renderer
// project layout, since that would require restructuring
// desktop-app/electron-main.cjs and electron-preload.cjs, which are out of
// scope for this migration (rendering layer only).
export default defineConfig({
  root: 'react-ui',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
