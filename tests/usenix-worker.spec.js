const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const workerSource = readFileSync(resolve(__dirname, '../worker/papers.js'), 'utf8');

// The Worker is an ES module, while the site's Playwright project uses CommonJS.
const loadWorker = () => import(`data:text/javascript;base64,${Buffer.from(workerSource).toString('base64')}`);

test('worker resolves legacy USENIX papers through the technical-sessions page', async () => {
  const { handlePaperRequest } = await loadWorker();
  const originalFetch = globalThis.fetch;
  const originalCaches = globalThis.caches;
  const requests = [];
  globalThis.caches = { default: { match: async () => null, put: async () => {} } };
  globalThis.fetch = async (url) => {
    requests.push(url);
    return new Response(`
      <meta name="citation_title" content="Eidetic Systems" />
      <meta name="citation_author" content="David Devecsery" />
      <meta name="citation_publication_date" content="2014" />
      <meta name="citation_pdf_url" content="${url.includes('/technical-sessions/') ? 'https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-devecsery.pdf' : 'https://www.usenix.org/system/files/osdi25-zhang-tony.pdf'}" />
    `);
  };
  const helpers = {
    makeCacheKey: (url, key, value) => new Request(`${url.origin}/?${key}=${encodeURIComponent(value)}`),
    cacheableHeaders: (type) => ({ 'Content-Type': type }),
    jsonResponse: (body, status) => Response.json(body, { status }),
  };
  try {
    const url = new URL('https://example.com/?usenix=osdi14-devecsery&legacy=1');
    const response = await handlePaperRequest(url, { waitUntil: () => {} }, helpers);
    expect(response.status).toBe(200);
    expect(requests).toEqual(['https://www.usenix.org/conference/osdi14/technical-sessions/presentation/devecsery']);
    expect(await response.json()).toMatchObject({
      title: 'Eidetic Systems',
      authors: ['David Devecsery'],
      published: '2014-01-01',
      absUrl: requests[0],
      pdfUrl: 'https://www.usenix.org/system/files/conference/osdi14/osdi14-paper-devecsery.pdf',
    });
    const normal = await handlePaperRequest(new URL('https://example.com/?usenix=osdi25-zhang-tony'), { waitUntil: () => {} }, helpers);
    expect(normal.status).toBe(200);
    expect(requests[1]).toBe('https://www.usenix.org/conference/osdi25/presentation/zhang-tony');
    expect((await normal.json()).pdfUrl).toBe('https://www.usenix.org/system/files/osdi25-zhang-tony.pdf');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.caches = originalCaches;
  }
});
