import React from 'react';
import { createRoot } from 'react-dom/client';
import type { WorkflowViewProfile } from '../src/types/profile';
import { ArazzoUIStandalone } from '../src/ArazzoUIStandalone';

function getDocumentURL() {
  const hashDoc =
    new URLSearchParams(window.location.search).get('document') ??
    window.location.hash.match(/document=([^&]+)/)?.[1];
  return new URL(hashDoc || './petstore-order-workflow.arazzo.yaml', document.baseURI).toString();
}

const App = () => {
  const [docURL, setDocURL] = React.useState(getDocumentURL());

  React.useEffect(() => {
    const onHashChange = () => setDocURL(getDocumentURL());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const configuration = new URLSearchParams(window.location.search);
  const adapter =
    configuration.get('profile') === 'digital-product' ? ('digital-product' as const) : undefined;
  const profileURL = configuration.get('systemsProfile');
  const [profile, setProfile] = React.useState<WorkflowViewProfile>();
  React.useEffect(() => {
    let cancelled = false;
    setProfile(undefined);
    if (profileURL)
      fetch(new URL(profileURL, document.baseURI))
        .then((r) => {
          if (!r.ok) throw new Error('Profile unavailable');
          return r.json();
        })
        .then((value: WorkflowViewProfile) => {
          value.document = new URL(value.document, docURL).href;
          value.events = value.events.map((e) => ({
            ...e,
            channel: { ...e.channel, uri: new URL(e.channel.uri, docURL).href },
            message: { ...e.message, uri: new URL(e.message.uri, docURL).href },
          }));
          if (!cancelled) setProfile(value);
        })
        .catch(() => {
          if (!cancelled) setProfile(undefined);
        });
    return () => {
      cancelled = true;
    };
  }, [profileURL, docURL]);
  return (
    <ArazzoUIStandalone document={docURL} viewProfileAdapter={adapter} viewProfile={profile} />
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
