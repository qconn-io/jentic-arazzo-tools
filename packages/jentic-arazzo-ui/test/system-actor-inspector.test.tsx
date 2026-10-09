// @vitest-environment jsdom
import React from 'react';
import { it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArazzoUI } from '../src/ArazzoUI';
import { consumerWorkflow, entryActorProfile } from './fixtures/upstream-readiness';

it('shows the owning helper unknown actor in the second call inspector', async () => {
  render(
    <ArazzoUI
      document={consumerWorkflow()}
      documentIdentity="fixture"
      viewProfile={entryActorProfile()}
      perspective="systems"
    />,
  );
  fireEvent.click(
    await screen.findByRole('button', { name: 'Expand standard call entry.first-item' }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Expand standard call entry.second-item' }));
  const captures = screen.getAllByRole('button', { name: /^Inspect system helper\.capture/ });
  expect(captures).toHaveLength(2);
  fireEvent.click(captures[1]);
  const details = await screen.findByRole('region', { name: 'Selection details' });
  expect(details.textContent).toContain('Unknown actor: helper');
  expect(details.textContent).toContain('Payments');
  expect(details.textContent).toContain('second-item');
});
