import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAPODBulk } from '../dist/index.js';

const originalFetch = globalThis.fetch;

function restoreFetch(): void {
  globalThis.fetch = originalFetch;
}

function rawApod(date: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    date,
    explanation: `Explicação de ${date}`,
    hdurl: `https://apod.nasa.gov/${date}_hd.jpg`,
    media_type: 'image',
    service_version: 'v1',
    title: `Título ${date}`,
    url: `https://apod.nasa.gov/${date}.jpg`,
    copyright: false,
    ...overrides,
  };
}

// -- Caminho startDate/endDate: deve ser 1 única requisição ------------------

test('getAPODBulk (range): startDate/endDate vira uma única requisição HTTP e devolve um item por data', async () => {
  let fetchCalls = 0;
  globalThis.fetch = (async (url: string) => {
    fetchCalls += 1;
    assert.match(url, /start_date=2024-01-01/);
    assert.match(url, /end_date=2024-01-03/);
    return {
      status: 200,
      json: async () => [rawApod('2024-01-01'), rawApod('2024-01-02'), rawApod('2024-01-03')],
    };
  }) as unknown as typeof fetch;

  try {
    const result = await getAPODBulk({ startDate: '2024-01-01', endDate: '2024-01-03' });
    assert.equal(fetchCalls, 1, 'deve fazer só 1 requisição para o intervalo inteiro');
    assert.equal(result.requested, 3);
    assert.equal(result.failed, 0);
    assert.equal(result.truncated, false);
    assert.deepEqual(
      result.results.map((r) => r.date),
      ['2024-01-01', '2024-01-02', '2024-01-03'],
    );
    assert.equal(result.results[0].response.error, false);
    assert.equal(result.results[0].response.best_image, 'https://apod.nasa.gov/2024-01-01_hd.jpg');
  } finally {
    restoreFetch();
  }
});

test('getAPODBulk (range): deriva thumbnail de vídeo igual a getAPOD()', async () => {
  globalThis.fetch = (async () => ({
    status: 200,
    json: async () => [rawApod('2024-03-19', { media_type: 'video', url: 'https://youtu.be/dQw4w9WgXcQ', hdurl: false })],
  })) as unknown as typeof fetch;

  try {
    const result = await getAPODBulk({ startDate: '2024-03-19', endDate: '2024-03-19' });
    assert.equal(result.results[0].response.nasa.thumbnail_url, 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg');
    assert.equal(result.results[0].response.best_image, 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg');
  } finally {
    restoreFetch();
  }
});

test('REGRESSÃO (uso responsável da API): intervalo maior que maxDates é cortado no cliente antes do fetch', async () => {
  let capturedUrl = '';
  globalThis.fetch = (async (url: string) => {
    capturedUrl = url;
    return { status: 200, json: async () => [rawApod('1996-01-01')] };
  }) as unknown as typeof fetch;

  try {
    const result = await getAPODBulk({ startDate: '1996-01-01', endDate: '2026-01-01', maxDates: 10 });
    assert.match(capturedUrl, /end_date=1996-01-10/, 'a URL enviada à NASA já deve vir cortada para 10 dias');
    assert.equal(result.truncated, true);
  } finally {
    restoreFetch();
  }
});

test('getAPODBulk (range): erro da API da NASA (corpo não é array) vira 1 item de erro com fallback útil, não lança exceção', async () => {
  globalThis.fetch = (async () => ({
    status: 429,
    json: async () => ({ code: 429, msg: 'Limite excedido' }),
  })) as unknown as typeof fetch;

  try {
    const result = await getAPODBulk({ startDate: '2024-01-01', endDate: '2024-01-05' });
    assert.equal(result.requested, 1);
    assert.equal(result.failed, 1);
    assert.equal(result.results[0].response.error, true);
    assert.equal(result.results[0].response.fallback, true);
    assert.notEqual(result.results[0].response.best_image, false);
  } finally {
    restoreFetch();
  }
});

test('getAPODBulk (range): falha de rede vira 1 item de erro com fallback útil, sem lançar exceção', async () => {
  globalThis.fetch = (async () => {
    throw new Error('network down');
  }) as unknown as typeof fetch;

  try {
    const result = await getAPODBulk({ startDate: '2024-01-01', endDate: '2024-01-05' });
    assert.equal(result.failed, 1);
    assert.equal(result.results[0].response.fallback, true);
  } finally {
    restoreFetch();
  }
});

// -- Caminho dates: concorrência limitada, dedupe, falhas isoladas -----------

test('getAPODBulk (dates): busca cada data e preserva a ordem original em results', async () => {
  globalThis.fetch = (async (url: string) => {
    const date = new URL(url).searchParams.get('date')!;
    return { status: 200, json: async () => rawApod(date) };
  }) as unknown as typeof fetch;

  try {
    const result = await getAPODBulk({ dates: ['2024-01-01', '2023-05-05', '2022-12-25'] });
    assert.deepEqual(
      result.results.map((r) => r.date),
      ['2024-01-01', '2023-05-05', '2022-12-25'],
    );
    assert.equal(result.failed, 0);
  } finally {
    restoreFetch();
  }
});

test('REGRESSÃO (uso responsável da API): datas duplicadas em "dates" não geram requisições duplicadas', async () => {
  let fetchCalls = 0;
  globalThis.fetch = (async (url: string) => {
    fetchCalls += 1;
    const date = new URL(url).searchParams.get('date')!;
    return { status: 200, json: async () => rawApod(date) };
  }) as unknown as typeof fetch;

  try {
    const result = await getAPODBulk({ dates: ['2024-01-01', '2024-01-01', '2024-01-01', '2023-05-05'] });
    assert.equal(fetchCalls, 2, 'datas repetidas devem virar 1 única requisição cada');
    assert.equal(result.requested, 2);
  } finally {
    restoreFetch();
  }
});

test('REGRESSÃO (uso responsável da API): nunca mais que "concurrency" requisições em voo ao mesmo tempo', async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  globalThis.fetch = (async (url: string) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 15));
    inFlight -= 1;
    const date = new URL(url).searchParams.get('date')!;
    return { status: 200, json: async () => rawApod(date) };
  }) as unknown as typeof fetch;

  try {
    const dates = Array.from({ length: 12 }, (_, i) => `2020-01-${String(i + 1).padStart(2, '0')}`);
    await getAPODBulk({ dates, concurrency: 3 });
    assert.ok(maxInFlight <= 3, `esperava no máximo 3 requisições simultâneas, obteve ${maxInFlight}`);
    assert.ok(maxInFlight > 1, 'deveria de fato paralelizar (não virar sequencial)');
  } finally {
    restoreFetch();
  }
});

test('REGRESSÃO (uso responsável da API): concurrency e maxDates nunca passam dos limites do pacote, mesmo se pedido um valor maior', async () => {
  let maxInFlight = 0;
  let inFlight = 0;
  globalThis.fetch = (async (url: string) => {
    inFlight += 1;
    maxInFlight = Math.max(maxInFlight, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    const date = new URL(url).searchParams.get('date')!;
    return { status: 200, json: async () => rawApod(date) };
  }) as unknown as typeof fetch;

  try {
    const dates = Array.from({ length: 20 }, (_, i) => `2021-01-${String(i + 1).padStart(2, '0')}`);
    // Pede um valor absurdamente alto de propósito — o pacote deve conter isso sozinho.
    const result = await getAPODBulk({ dates, concurrency: 999 });
    assert.ok(maxInFlight <= 10, `concurrency deveria ser limitada a MAX_BULK_CONCURRENCY (10), obteve ${maxInFlight}`);
    assert.equal(result.requested, 20);
  } finally {
    restoreFetch();
  }
});

test('getAPODBulk (dates): uma data falhando não derruba as outras do lote', async () => {
  globalThis.fetch = (async (url: string) => {
    const date = new URL(url).searchParams.get('date')!;
    if (date === '2024-06-15') {
      throw new Error('falha simulada só para este dia');
    }
    return { status: 200, json: async () => rawApod(date) };
  }) as unknown as typeof fetch;

  try {
    const result = await getAPODBulk({ dates: ['2024-01-01', '2024-06-15', '2023-12-25'] });
    assert.equal(result.requested, 3);
    assert.equal(result.failed, 1);

    const failedItem = result.results.find((r) => r.date === '2024-06-15');
    assert.ok(failedItem);
    assert.equal(failedItem!.response.error, true);
    assert.equal(failedItem!.response.fallback, true);
    assert.notEqual(failedItem!.response.best_image, false);

    const okItem = result.results.find((r) => r.date === '2024-01-01');
    assert.equal(okItem!.response.error, false);
  } finally {
    restoreFetch();
  }
});

test('getAPODBulk (dates): lote maior que maxDates é truncado, sem lançar exceção', async () => {
  globalThis.fetch = (async (url: string) => {
    const date = new URL(url).searchParams.get('date')!;
    return { status: 200, json: async () => rawApod(date) };
  }) as unknown as typeof fetch;

  try {
    const dates = Array.from({ length: 50 }, (_, i) => `2015-0${(i % 9) + 1}-0${(i % 8) + 1}`);
    const result = await getAPODBulk({ dates, maxDates: 5 });
    assert.equal(result.truncated, true);
    assert.equal(result.requested, 5);
    assert.equal(result.results.length, 5);
  } finally {
    restoreFetch();
  }
});

test('getAPODBulk: lança TypeError se "dates" e "startDate"/"endDate" forem usados juntos', async () => {
  await assert.rejects(
    () => getAPODBulk({ dates: ['2024-01-01'], startDate: '2024-01-01', endDate: '2024-01-02' }),
    TypeError,
  );
});

test('getAPODBulk: sem nenhuma opção de data, trata "dates" como lista vazia (nenhuma requisição, resultado vazio)', async () => {
  let called = false;
  globalThis.fetch = (async () => {
    called = true;
    return { status: 200, json: async () => rawApod('2024-01-01') };
  }) as unknown as typeof fetch;

  try {
    const result = await getAPODBulk({});
    assert.equal(called, false);
    assert.equal(result.requested, 0);
    assert.deepEqual(result.results, []);
  } finally {
    restoreFetch();
  }
});
