import React from 'react';
import { createRoot } from 'react-dom/client';
import { ArazzoUIStandalone } from '../src/ArazzoUIStandalone';

function getDocumentURL() {
  const hashDoc = window.location.hash.match(/document=([^&]+)/)?.[1];
  return new URL(hashDoc || './petstore-order-workflow.arazzo.yaml', document.baseURI).toString();
}

const App = () => {
  const [docURL, setDocURL] = React.useState(getDocumentURL());
  
  React.useEffect(() => {
    const onHashChange = () => setDocURL(getDocumentURL());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return <ArazzoUIStandalone document={docURL} />;
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
