import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AccordionComparison } from './AccordionComparison.jsx';
import './styles/tailwind.css';
import './styles/pfa-card-disclosure.css';

// Vite dev-only entry, used to verify the disclosure/Accordion component
// against its vanilla equivalent in isolation. The real app never loads
// this file - desktop-app/electron-main.cjs and index.html are untouched.
// Real screens will mount via createRoot() into containers inside the
// existing index.html, tab by tab, once each component is proven here.
const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <AccordionComparison />
    </StrictMode>
  );
}
