import React from 'react';

// guide URL setup is independent of supplied guides and Systems reading navigation.
export function GuideSetup({
  status,
  setup,
  children,
}: {
  status?: React.ReactNode;
  setup: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="arazzo-guide-setup">
        <details className="arazzo-advanced-tools">
          <summary>Help and guides</summary>
          <p>Follow an author-provided walkthrough to find its declared workflow steps.</p>
          <details>
            <summary>Load guides from a URL</summary>
            {setup}
          </details>
        </details>
        {status}
      </div>
      {children}
    </>
  );
}
