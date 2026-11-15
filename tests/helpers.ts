import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const originalFetch = globalThis.fetch;

export function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

export function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nasa-apod-test-'));
}

export interface FakeReply {
  status?: number;
  body?: unknown;
  /** Quando definido, `res.json()` falha, como acontece com uma página de erro em HTML. */
  invalidJson?: boolean;
  totalPages?: number;
}

export function reply({ status = 200, body, invalidJson, totalPages }: FakeReply): unknown {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => (name.toLowerCase() === 'x-wp-totalpages' && totalPages ? String(totalPages) : null) },
    json: async () => {
      if (invalidJson) throw new SyntaxError('Unexpected token <');
      return body;
    },
  };
}

/** Troca o fetch por uma função que responde na ordem e guarda as URLs pedidas. */
export function mockFetch(...replies: unknown[]): { urls: string[] } {
  const urls: string[] = [];
  let call = 0;
  globalThis.fetch = (async (url: unknown) => {
    urls.push(String(url));
    const next = replies[Math.min(call, replies.length - 1)];
    call += 1;
    return typeof next === 'function' ? (next as () => unknown)() : next;
  }) as unknown as typeof fetch;
  return { urls };
}

/** Item no formato que a API nova devolve. */
export function apodItem(date: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const [y, m, d] = date.split('-');
  const slug = `apod-${y}-${m}-${d}-teste`;
  return {
    date,
    post_id: 1000 + Number(d),
    title: `Título ${date}`,
    permalink: `https://science.nasa.gov/image-article/${slug}/`,
    media_type: 'image',
    explanation:
      '<strong>Explanation:</strong> Texto com <a href="https://example.com/">link</a> e &amp; entidade.<br><br><strong>Tomorrow&#039;s picture: </strong><a href="https://example.com/">amanhã</a>',
    credit: '<a href="https://example.com/autor">Fulana de Tal</a>',
    copyright: '<a href="https://example.com/autor">Fulana de Tal</a>',
    alt: 'Descrição da imagem.',
    url: `https://science.nasa.gov/image-article/${slug}/`,
    hdurl: `https://assets.science.nasa.gov/dynamicimage/${date}.jpg?w=100&h=100&fit=clip`,
    basic_html: '<!doctype html><html><body><p>página</p></body></html>',
    basic_html_url: `https://science.nasa.gov/wp-json/wp/v2/apod-basic/${y.slice(2)}${m}${d}/html`,
    ...overrides,
  };
}
