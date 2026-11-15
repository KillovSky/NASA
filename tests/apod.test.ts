import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getAPOD } from '../dist/index.js';
import { apodItem, mockFetch, reply, restoreFetch, tmpDir } from './helpers.js';

const ITEM = apodItem('2026-09-11');

// -- Montagem da requisição ---------------------------------------------------

test('sem data, pede só o item mais recente da listagem', async () => {
  const { urls } = mockFetch(reply({ body: [ITEM] }));
  try {
    const result = await getAPOD();
    assert.equal(urls.length, 1);
    assert.equal(urls[0], 'https://science.nasa.gov/wp-json/wp/v2/apod-basic?per_page=1');
    assert.equal(result.error, false);
    assert.equal(result.nasa.title, ITEM.title);
  } finally {
    restoreFetch();
  }
});

test('com data, usa a rota de data única no formato YYMMDD', async () => {
  const { urls } = mockFetch(reply({ body: ITEM }));
  try {
    const result = await getAPOD({ date: '2026-09-11' });
    assert.equal(urls[0], 'https://science.nasa.gov/wp-json/wp/v2/apod-basic/260911');
    assert.equal(result.date, '2026-09-11');
    assert.equal(result.nasa.post_id, ITEM.post_id);
  } finally {
    restoreFetch();
  }
});

test('apiKey só é enviada quando informada, e vai codificada', async () => {
  const { urls } = mockFetch(reply({ body: ITEM }));
  try {
    await getAPOD({ date: '2026-09-11' });
    await getAPOD({ date: '2026-09-11', apiKey: 'a b&c' });
    assert.doesNotMatch(urls[0], /api_key/);
    assert.match(urls[1], /api_key=a\+b%26c/);
  } finally {
    restoreFetch();
  }
});

test('data inválida é corrigida e o aviso fica em data_msg', async () => {
  const { urls } = mockFetch(reply({ body: ITEM }));
  try {
    const result = await getAPOD({ date: '2999-01-01' });
    assert.notEqual(result.data_msg, false);
    assert.doesNotMatch(urls[0], /\/99\d{4}$/);
  } finally {
    restoreFetch();
  }
});

// -- Leitura da resposta ------------------------------------------------------

test('best_image usa hdurl; url continua sendo a página do post', async () => {
  mockFetch(reply({ body: ITEM }));
  try {
    const result = await getAPOD({ date: '2026-09-11' });
    assert.equal(result.best_image, ITEM.hdurl);
    assert.equal(result.nasa.url, ITEM.permalink);
    assert.equal(result.fallback, false);
  } finally {
    restoreFetch();
  }
});

test('explanation fica em HTML e explanation_text vem limpa', async () => {
  mockFetch(reply({ body: ITEM }));
  try {
    const { nasa } = await getAPOD({ date: '2026-09-11' });
    assert.match(String(nasa.explanation), /<strong>Explanation:<\/strong>/);
    assert.equal(nasa.explanation_text, 'Texto com link e & entidade.');
    assert.equal(nasa.credit_text, 'Fulana de Tal');
  } finally {
    restoreFetch();
  }
});

test('vídeo: video_url sai do <source> de basic_html e a imagem de capa é a best_image', async () => {
  const html = '<body><video controls><source src="https://assets.science.nasa.gov/x/video.mp4" type="video/mp4"></video></body>';
  mockFetch(reply({ body: apodItem('2026-10-28', { media_type: 'video', basic_html: html }) }));
  try {
    const result = await getAPOD({ date: '2026-10-28' });
    assert.equal(result.nasa.video_url, 'https://assets.science.nasa.gov/x/video.mp4');
    assert.equal(result.best_image, result.nasa.hdurl);
  } finally {
    restoreFetch();
  }
});

test('vídeo do YouTube sem imagem de capa usa a miniatura do YouTube', async () => {
  const html = '<iframe width="640" src="https://www.youtube.com/embed/LUW51lvIFjg?rel=0"></iframe>';
  mockFetch(reply({ body: apodItem('2026-10-28', { media_type: 'iframe', hdurl: '', basic_html: html }) }));
  try {
    const result = await getAPOD({ date: '2026-10-28' });
    assert.equal(result.best_image, 'https://img.youtube.com/vi/LUW51lvIFjg/0.jpg');
  } finally {
    restoreFetch();
  }
});

test('campos ausentes viram false', async () => {
  mockFetch(reply({ body: { date: '2026-09-11', title: 'Só o básico' } }));
  try {
    const { nasa, best_image } = await getAPOD({ date: '2026-09-11' });
    assert.equal(nasa.hdurl, false);
    assert.equal(nasa.explanation_text, false);
    assert.equal(nasa.video_url, false);
    assert.equal(best_image, false);
  } finally {
    restoreFetch();
  }
});

// -- Erros --------------------------------------------------------------------

test('erro do WordPress (code/message) vira error: true, com dev_msg e fallback', async () => {
  mockFetch(reply({ status: 404, body: { code: 'rest_no_route', message: 'Nenhuma rota encontrada.', data: { status: 404 } } }));
  try {
    const result = await getAPOD({ date: '2026-09-11' });
    assert.equal(result.error, true);
    assert.equal(result.code, 404);
    assert.equal(result.error_msg, 'Nenhuma rota encontrada.');
    assert.equal(result.dev_msg, 'rest_no_route');
    assert.equal(result.fallback, true);
    assert.notEqual(result.nasa.title, false);
    assert.notEqual(result.best_image, false);
  } finally {
    restoreFetch();
  }
});

test('erro no formato { error: { code, message } } também é reconhecido', async () => {
  mockFetch(reply({ status: 403, body: { error: { code: 'API_KEY_INVALID', message: 'Chave inválida' } } }));
  try {
    const result = await getAPOD();
    assert.equal(result.error, true);
    assert.equal(result.error_msg, 'Chave inválida');
    assert.equal(result.dev_msg, 'API_KEY_INVALID');
  } finally {
    restoreFetch();
  }
});

test('resposta que não é JSON (ex.: 502 em HTML) vira erro com o status', async () => {
  mockFetch(reply({ status: 502, invalidJson: true }));
  try {
    const result = await getAPOD();
    assert.equal(result.error, true);
    assert.equal(result.code, 502);
    assert.equal(result.fallback, true);
  } finally {
    restoreFetch();
  }
});

test('lista vazia vira erro 404', async () => {
  mockFetch(reply({ body: [] }));
  try {
    const result = await getAPOD({ date: '2026-09-11' });
    assert.equal(result.error, true);
    assert.equal(result.code, 404);
  } finally {
    restoreFetch();
  }
});

test('falha de rede não lança exceção', async () => {
  globalThis.fetch = (async () => {
    throw new Error('network down');
  }) as unknown as typeof fetch;
  try {
    const result = await getAPOD();
    assert.equal(result.error, true);
    assert.equal(result.error_msg, 'network down');
    assert.equal(result.fallback, true);
  } finally {
    restoreFetch();
  }
});

test('tempo esgotado aborta a requisição e devolve erro', async () => {
  globalThis.fetch = (async (_url: unknown, init?: { signal?: AbortSignal }) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const err = new Error('The operation was aborted');
        err.name = 'AbortError';
        reject(err);
      });
    })) as unknown as typeof fetch;
  try {
    const result = await getAPOD({ timeout: 10 });
    assert.equal(result.error, true);
    assert.equal(result.fallback, true);
  } finally {
    restoreFetch();
  }
});

// -- Download -----------------------------------------------------------------

const IMAGE_BYTES = { status: 200, ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };

test('download grava a imagem como <data>.jpg', async () => {
  const dir = tmpDir();
  const { urls } = mockFetch(reply({ body: ITEM }), IMAGE_BYTES);
  try {
    const result = await getAPOD({ date: '2026-09-11', download: true, downloadPath: dir });
    const expected = path.join(path.resolve(dir), '2026-09-11.jpg');
    assert.equal(result.download, `Download concluído, salvo em ${expected}`);
    assert.equal(urls[1], ITEM.hdurl);
    assert.deepEqual([...fs.readFileSync(expected)], [1, 2, 3]);
  } finally {
    restoreFetch();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('download não sobrescreve um arquivo que já existe', async () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, '2026-09-11.jpg'), 'original');
  const { urls } = mockFetch(reply({ body: ITEM }));
  try {
    const result = await getAPOD({ date: '2026-09-11', download: true, downloadPath: dir });
    assert.match(String(result.download), /já havia sido baixada/);
    assert.equal(urls.length, 1);
    assert.equal(fs.readFileSync(path.join(dir, '2026-09-11.jpg'), 'utf8'), 'original');
  } finally {
    restoreFetch();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('download com pasta inexistente devolve uma mensagem', async () => {
  mockFetch(reply({ body: ITEM }));
  try {
    const result = await getAPOD({ date: '2026-09-11', download: true, downloadPath: '/caminho/que/nao/existe' });
    assert.match(String(result.download), /não existe/);
  } finally {
    restoreFetch();
  }
});

test('download não é feito quando a requisição falhou', async () => {
  const dir = tmpDir();
  const { urls } = mockFetch(reply({ status: 404, body: { code: 'rest_no_route', message: 'x' } }));
  try {
    const result = await getAPOD({ date: '2026-09-11', download: true, downloadPath: dir });
    assert.equal(result.download, false);
    assert.equal(urls.length, 1);
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally {
    restoreFetch();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('download: resposta com erro HTTP não grava arquivo', async () => {
  const dir = tmpDir();
  mockFetch(reply({ body: ITEM }), { status: 404, ok: false, arrayBuffer: async () => new ArrayBuffer(0) });
  try {
    const result = await getAPOD({ date: '2026-09-11', download: true, downloadPath: dir });
    assert.match(String(result.download), /status 404/);
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally {
    restoreFetch();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('download: data fora do formato na resposta não escreve fora da pasta', async () => {
  const dir = tmpDir();
  mockFetch(reply({ body: apodItem('2026-09-11', { date: '../../../etc/cron.d/x' }) }), IMAGE_BYTES);
  try {
    const result = await getAPOD({ download: true, downloadPath: dir });
    const files = fs.readdirSync(dir);
    assert.equal(files.length, 1);
    assert.match(files[0], /^\d{4}-\d{2}-\d{2}\.jpg$/);
    assert.match(String(result.download), /Download concluído/);
  } finally {
    restoreFetch();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('download: URL com protocolo file: é recusada antes do fetch', async () => {
  const dir = tmpDir();
  const { urls } = mockFetch(reply({ body: apodItem('2026-09-11', { hdurl: 'file:///etc/passwd' }) }));
  try {
    const result = await getAPOD({ date: '2026-09-11', download: true, downloadPath: dir });
    assert.match(String(result.download), /protocolo não suportado/);
    assert.equal(urls.length, 1);
  } finally {
    restoreFetch();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
