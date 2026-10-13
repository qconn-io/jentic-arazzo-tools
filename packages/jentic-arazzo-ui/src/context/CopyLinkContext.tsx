import React, { createContext, useContext } from 'react';
export const CopyLinkContext = createContext<{ copy: () => void; message: string } | null>(null);
export function CopyLocationControl() {
  const sharing = useContext(CopyLinkContext);
  return sharing ? (
    <span className="arazzo-copy-link">
      <button onClick={sharing.copy}>Copy link</button>
      {sharing.message && <span role="status">{sharing.message}</span>}
    </span>
  ) : null;
}
