import { useEffect, useRef } from 'react';

/**
 * Grafts an existing vanilla-built DOM subtree (built by application/ui's
 * own `el()` helper) into a React tree, unchanged. This is the actual
 * incremental-migration bridge: PfaCardDisclosure owns the shell (trigger,
 * chevron, open/close animation), the vanilla render file still owns
 * everything inside it - nothing about how that content is built has to
 * change for the shell around it to migrate first.
 */
export function VanillaBody({ node }) {
  const ref = useRef(null);
  useEffect(() => {
    const host = ref.current;
    if (!host || !node) return;
    host.appendChild(node);
    return () => {
      if (node.parentNode === host) host.removeChild(node);
    };
  }, [node]);
  // display: contents - the wrapper takes no box of its own, so it can graft
  // an inline icon into a flex row (.card-title) or a block body into
  // .disclosure-body without changing either layout's children count/shape.
  return <div ref={ref} style={{ display: 'contents' }} />;
}
