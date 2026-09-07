import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { getAPOD, youtubeThumbnail, vimeoThumbnail } from '../dist/index.js';

const originalFetch = globalThis.fetch;

function jsonResponse(status: number, body: unknown): typeof fetch {
  return (async () => ({
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

/** Mocka a 1ª chamada (API da NASA) e, se houver, a 2ª (download da imagem). */
function mockSequence(...responses: unknown[]): void {
  let call = 0;
  globalThis.fetch = (async (url: unknown) => {
    const response = responses[call];
    call += 1;
    if (typeof response === 'function') return (response as () => unknown)();
    return response;
  }) as unknown as typeof fetch;
}

function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nasa-apod-test-'));
}

const SAMPLE_APOD = {
  date: '2024-01-01',
  explanation: 'Uma explicação qualquer.',
  hdurl: 'https://apod.nasa.gov/apod/image/2401/example_hd.jpg',
  media_type: 'image',
  service_version: 'v1',
  title: 'Título de exemplo',
  url: 'https://apod.nasa.gov/apod/image/2401/example.jpg',
  copyright: 'Alguém',
};

// -- Caminho feliz -----------------------------------------------------------

test('getAPOD: resposta de imagem bem-sucedida preenche best_image com a hdurl', async () => {
  mockSequence({ status: 200, json: async () => SAMPLE_APOD });
  try {
    const result = await getAPOD({ date: '2024-01-01' });
    assert.equal(result.error, false);
    assert.equal(result.code, 200);
    assert.equal(result.best_image, SAMPLE_APOD.hdurl);
    assert.equal(result.nasa.title, SAMPLE_APOD.title);
  } finally {
    restoreFetch();
  }
});

test('getAPOD: usa DEMO_KEY por padrão quando nenhuma apiKey é passada', async () => {
  let capturedUrl = '';
  globalThis.fetch = (async (url: string) => {
    capturedUrl = url;
    return { status: 200, json: async () => SAMPLE_APOD };
  }) as unknown as typeof fetch;
  try {
    await getAPOD();
    assert.match(capturedUrl, /api_key=DEMO_KEY/);
  } finally {
    restoreFetch();
  }
});

test('getAPOD: apiKey e date são codificadas na URL da requisição', async () => {
  let capturedUrl = '';
  globalThis.fetch = (async (url: string) => {
    capturedUrl = url;
    return { status: 200, json: async () => SAMPLE_APOD };
  }) as unknown as typeof fetch;
  try {
    await getAPOD({ apiKey: 'a b&c', date: '2024-01-01' });
    assert.doesNotMatch(capturedUrl, /api_key=a b&c/);
    assert.match(capturedUrl, /api_key=a%20b%26c/);
  } finally {
    restoreFetch();
  }
});

// -- Erros retornados pela própria API da NASA -------------------------------

test('getAPOD: corpo com "code" (erro de rate limit/chave inválida) vira error: true', async () => {
  mockSequence({ status: 429, json: async () => ({ code: 429, msg: 'Limite excedido' }) });
  try {
    const result = await getAPOD();
    assert.equal(result.error, true);
    assert.equal(result.code, 429);
    assert.equal(result.error_msg, 'Limite excedido');
  } finally {
    restoreFetch();
  }
});

test('getAPOD: corpo com "error" (formato alternativo de erro da NASA) vira error: true', async () => {
  mockSequence({ status: 400, json: async () => ({ error: { code: 'BAD_REQUEST', message: 'Data inválida' } }) });
  try {
    const result = await getAPOD();
    assert.equal(result.error, true);
    assert.equal(result.error_msg, 'Data inválida');
    assert.equal(result.dev_msg, 'BAD_REQUEST');
  } finally {
    restoreFetch();
  }
});

test('getAPOD: falha de rede vira error: true, sem lançar exceção', async () => {
  globalThis.fetch = (async () => {
    throw new Error('network down');
  }) as unknown as typeof fetch;
  try {
    const result = await getAPOD();
    assert.equal(result.error, true);
    assert.equal(result.error_msg, 'network down');
  } finally {
    restoreFetch();
  }
});

// -- Vídeos (YouTube/Vimeo) ----------------------------------------------------

test('getAPOD: vídeo do YouTube sem thumbnail_url da NASA gera uma via youtubeThumbnail', async () => {
  mockSequence({
    status: 200,
    json: async () => ({
      ...SAMPLE_APOD,
      media_type: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      hdurl: false,
    }),
  });
  try {
    const result = await getAPOD();
    assert.equal(result.nasa.thumbnail_url, 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg');
    assert.equal(result.best_image, 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg');
  } finally {
    restoreFetch();
  }
});

test('getAPOD: vídeo do Vimeo sem thumbnail_url da NASA gera uma via vimeoThumbnail', async () => {
  mockSequence({
    status: 200,
    json: async () => ({
      ...SAMPLE_APOD,
      media_type: 'video',
      url: 'https://vimeo.com/927766087',
      hdurl: false,
    }),
  });
  try {
    const result = await getAPOD();
    assert.equal(result.nasa.thumbnail_url, 'https://vumbnail.com/927766087.jpg');
  } finally {
    restoreFetch();
  }
});

test('youtubeThumbnail: extrai o ID em vários formatos de URL', () => {
  assert.equal(youtubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg');
  assert.equal(youtubeThumbnail('https://youtu.be/dQw4w9WgXcQ'), 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg');
  assert.equal(youtubeThumbnail('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg');
  assert.equal(youtubeThumbnail('https://example.com/no-id-here'), false);
});

test('youtubeThumbnail: não trava (ReDoS) em entrada adversarial', () => {
  const evil = `https://youtu.be/${'a'.repeat(300_000)}?x=`;
  const t0 = Date.now();
  youtubeThumbnail(evil);
  assert.ok(Date.now() - t0 < 1000, 'youtubeThumbnail deve ser O(n), não deve travar em entrada grande');
});

test('vimeoThumbnail: extrai o ID numérico da URL', () => {
  assert.equal(vimeoThumbnail('https://vimeo.com/927766087'), 'https://vumbnail.com/927766087.jpg');
  assert.equal(vimeoThumbnail('https://example.com/not-vimeo'), false);
});

// -- Download: caminho feliz e regressão de segurança -------------------------

test('getAPOD: download baixa a imagem e grava no caminho esperado', async () => {
  const dir = tmpDir();
  mockSequence(
    { status: 200, json: async () => SAMPLE_APOD },
    { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
  );
  try {
    const result = await getAPOD({ download: true, downloadPath: dir });
    const expectedPath = path.join(path.resolve(dir), '2024-01-01.jpg');
    assert.equal(result.download, `Download concluído, salvo em ${expectedPath}`);
    assert.equal(fs.existsSync(expectedPath), true);
  } finally {
    restoreFetch();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('getAPOD: download não sobrescreve um arquivo já baixado', async () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, '2024-01-01.jpg'), 'já existia');
  mockSequence({ status: 200, json: async () => SAMPLE_APOD });
  try {
    const result = await getAPOD({ download: true, downloadPath: dir });
    assert.match(result.download as string, /já havia sido baixada/);
  } finally {
    restoreFetch();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('getAPOD: download com pasta inexistente retorna mensagem, sem lançar exceção', async () => {
  mockSequence({ status: 200, json: async () => SAMPLE_APOD });
  try {
    const result = await getAPOD({ download: true, downloadPath: '/caminho/que/nao/existe/de/verdade' });
    assert.match(result.download as string, /caminho especificado não existe/);
  } finally {
    restoreFetch();
  }
});

test('REGRESSÃO (path injection): campo "date" malicioso na resposta da API não escreve fora da pasta de destino', async () => {
  const dir = tmpDir();
  mockSequence(
    {
      status: 200,
      json: async () => ({ ...SAMPLE_APOD, date: '../../../../tmp/pwned-by-test' }),
    },
    { arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer },
  );
  try {
    const result = await getAPOD({ download: true, downloadPath: dir });
    // deve ter baixado normalmente, só que com um nome de arquivo seguro (não o valor malicioso)
    assert.match(result.download as string, /Download concluído/);
    assert.equal(fs.existsSync('/tmp/pwned-by-test.jpg'), false);
    assert.equal(fs.existsSync(path.join(path.resolve(dir), '../../../../tmp/pwned-by-test.jpg')), false);
  } finally {
    restoreFetch();
    fs.rmSync(dir, { recursive: true, force: true });
    fs.rmSync('/tmp/pwned-by-test.jpg', { force: true });
  }
});

test('REGRESSÃO (SSRF/esquema não-http): URL de imagem com protocolo file:// é rejeitada antes do fetch', async () => {
  const dir = tmpDir();
  let secondFetchCalled = false;
  globalThis.fetch = (async () => {
    if (secondFetchCalled) throw new Error('fetch não deveria ser chamado de novo para uma URL file://');
    secondFetchCalled = true;
    return { status: 200, json: async () => ({ ...SAMPLE_APOD, hdurl: false, url: 'file:///etc/passwd' }) };
  }) as unknown as typeof fetch;
  try {
    const result = await getAPOD({ download: true, downloadPath: dir });
    assert.match(result.download as string, /protocolo não suportado/);
  } finally {
    restoreFetch();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
