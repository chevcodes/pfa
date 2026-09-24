import { cn } from './lib/utils';

// Temporary: proves Vite + React + Tailwind v4 + the aliased design-token
// theme resolve and paint correctly against the app's real foundation.css
// tokens. Deleted once the first real shared component (the disclosure/
// Accordion pattern) replaces it as the toolchain's proof point.
export function ToolchainSmokeTest() {
  return (
    <div className="pfa-react-root p-6">
      <div className={cn('rounded-lg border bg-card text-card-foreground p-4 shadow-sm')}>
        <p className="text-sm text-muted-foreground">React + Tailwind + shadcn tokens</p>
        <p className="font-sans text-lg" style={{ color: 'var(--color-primary)' }}>
          Toolchain online
        </p>
      </div>
    </div>
  );
}
