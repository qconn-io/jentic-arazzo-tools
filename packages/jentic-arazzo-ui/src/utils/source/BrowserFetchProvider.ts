import { SourceDocumentProvider, SourceDocumentRequest, SourceDocumentContent } from '../../types/source';

export class BrowserFetchProvider implements SourceDocumentProvider {
  async load(request: SourceDocumentRequest): Promise<SourceDocumentContent> {
    const { uri, signal } = request;
    
    try {
      const response = await fetch(uri, {
        signal,
        credentials: 'omit', // No implicit authorization forwarding
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      
      const text = await response.text();
      let content: string | object = text;
      
      // Try to parse JSON if applicable
      try {
        if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
          content = JSON.parse(text);
        }
      } catch (e) {
        // Ignore parse error, return as string
      }
      
      return {
        content,
        retrievalURI: response.url,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw err;
      }
      // Useful CORS/failure feedback
      const message = err.message || String(err);
      throw new Error(`Fetch failed for ${uri}: ${message}. Check CORS policies or network connectivity.`);
    }
  }
}
