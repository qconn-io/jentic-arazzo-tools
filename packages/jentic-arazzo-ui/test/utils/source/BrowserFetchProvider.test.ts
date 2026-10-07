import { describe, expect, it, vi, afterEach } from 'vitest';
import { BrowserFetchProvider } from '../../../src/utils/source/BrowserFetchProvider';

afterEach(() => vi.unstubAllGlobals());
describe('BrowserFetchProvider', () => {
  it.each(['file:///tmp/api', 'data:text/plain,hi', 'ftp://example.com/api'])(
    'rejects non HTTP(S) URI %s before fetching',
    async (uri) => {
      const fetcher = vi.fn();
      vi.stubGlobal('fetch', fetcher);
      await expect(new BrowserFetchProvider().load({ uri })).rejects.toThrow(/HTTP/);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it('omits credentials from source fetches', async () => {
    const fetcher = vi.fn(async () => ({
      ok: true,
      url: 'https://example.com/api',
      text: async () => 'api',
    }));
    vi.stubGlobal('fetch', fetcher);
    await new BrowserFetchProvider().load({ uri: 'https://example.com/api' });
    expect(fetcher).toHaveBeenCalledWith(
      'https://example.com/api',
      expect.objectContaining({ credentials: 'omit' }),
    );
  });
});
