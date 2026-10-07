import '@jentic/arazzo-ui/styles.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArazzoWorkflowReview } from '@jentic/arazzo-ui';
const name = new URLSearchParams(location.search).get('pair') ?? 'purchase';
fetch(`../examples/revision-review/${name}.json`)
  .then((r) => r.json())
  .then((pair) =>
    createRoot(document.getElementById('root')!).render(<ArazzoWorkflowReview {...pair} />),
  );
