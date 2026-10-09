import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// keep profile state in its viewer provider while sharing the standalone setup disclosure.
const AdvancedToolsTarget = createContext<HTMLElement | null | undefined>(undefined);

export function AdvancedTools({
  reveal,
  status,
  setup,
  children,
}: {
  reveal: boolean;
  status?: string;
  setup: React.ReactNode;
  children: React.ReactNode;
}) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if ((reveal || status) && disclosure.current) disclosure.current.open = true;
  }, [reveal, status]);
  return (
    <AdvancedToolsTarget.Provider value={target}>
      <details ref={disclosure} className="arazzo-advanced-tools">
        <summary>Advanced tools</summary>
        {setup}
        <div ref={setTarget} />
      </details>
      {children}
    </AdvancedToolsTarget.Provider>
  );
}

export function AdvancedProfileControls({ children }: { children: React.ReactNode }) {
  const target = useContext(AdvancedToolsTarget);
  if (target === undefined)
    return (
      <details open className="arazzo-advanced-tools">
        <summary>Advanced tools</summary>
        {children}
      </details>
    );
  return target ? createPortal(children, target) : null;
}
