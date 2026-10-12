import {
  SourceDocumentProvider,
  SourceDocumentRequest,
  SourceDocumentContent,
} from '../../types/source';

export class BrowserFetchProvider implements SourceDocumentProvider {
  async load(request: SourceDocumentRequest): Promise<SourceDocumentContent> {
    const { uri, signal } = request;

    const url = new URL(uri);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Browser source loading supports HTTP(S) URIs only');
    }
    try {
      const response = await fetch(uri, {
        signal,
        credentials: 'omit', // no implicit authorization forwarding
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      let content: string | object = text;

      try {
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          content = JSON.parse(text);
        }
      } catch {
        // leave unparseable text as raw string content
      }

      return {
        content,
        retrievalURI: response.url,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err;
      }
      const message = err.message || String(err);
      throw new Error(
        `Fetch failed for ${uri}: ${message}. Check CORS policies or network connectivity.`,
      );
    }
  }
}
