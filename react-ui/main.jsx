import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ToolchainSmokeTest } from './ToolchainSmokeTest.jsx';
import './styles/tailwind.css';

// Vite dev-only entry, used to verify the Vite + React + Tailwind + shadcn
// token pipeline in isolation. The real app never loads this file -
// desktop-app/electron-main.cjs and index.html are untouched by this
// checkpoint. Real screens will mount via createRoot() into containers
// inside the existing index.html, tab by tab, once built.
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <ToolchainSmokeTest />
    </StrictMode>
  );
}
