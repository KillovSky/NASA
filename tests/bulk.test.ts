import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getAPODBulk, MAX_BULK_DATES } from '../dist/index.js';
import { apodItem, mockFetch, reply, restoreFetch } from './helpers.js';

/** Datas consecutivas de setembro de 2026, da mais nova para a mais antiga (como a API devolve). */
function sept(from: number, to: number): Array<Record<string, unknown>> {
  const items = [];
  for (let d = to; d >= from; d -= 1) items.push(apodItem(`2026-09-${String(d).padStart(2, '0')}`));
  return items;
}

// -- Intervalo ----------------------------------------------------------------

test('intervalo curto: uma requisição com date_from/date_to, resultado em ordem crescente', async () => {
  const { urls } = mockFetch(reply({ body: sept(1, 3), totalPages: 1 }));
  try {
    const result = await getAPODBulk({ startDate: '2026-09-01', endDate: '2026-09-03' });
    assert.equal(urls.length, 1);
    assert.match(urls[0], /date_from=260901/);
    assert.match(urls[0], /date_to=260903/);
    assert.match(urls[0], /per_page=25/);
    assert.match(urls[0], /page=1/);
    assert.deepEqual(
      result.results.map((r) => r.date),
      ['2026-09-01', '2026-09-02', '2026-09-03'],
    );
    assert.equal(result.requested, 3);
    assert.equal(result.failed, 0);
    assert.equal(result.truncated, false);
    assert.equal(result.results[0].response.best_image, result.results[0].response.nasa.hdurl);
  } finally {
    restoreFetch();
  }
});

test('intervalo com mais de 25 dias percorre as páginas', async () => {
  const { urls } = mockFetch(
    reply({ body: sept(6, 30), totalPages: 2 }),
    reply({ body: sept(1, 5), totalPages: 2 }),
  );
  try {
    const result = await getAPODBulk({ startDate: '2026-09-01', endDate: '2026-09-30' });
    assert.equal(urls.length, 2);
    assert.match(urls[0], /page=1/);
    assert.match(urls[1], /page=2/);
    assert.equal(result.requested, 30);
    assert.equal(result.results[0].date, '2026-09-01');
    assert.equal(result.results[29].date, '2026-09-30');
  } finally {
    restoreFetch();
  }
});

test('intervalo: sem o cabeçalho de total de páginas, para quando a página vem incompleta', async () => {
  const { urls } = mockFetch(reply({ body: sept(6, 30) }), reply({ body: sept(1, 5) }), reply({ body: [] }));
  try {
    const result = await getAPODBulk({ startDate: '2026-09-01', endDate: '2026-09-30' });
    assert.equal(urls.length, 2);
    assert.equal(result.requested, 30);
  } finally {
    restoreFetch();
  }
});

test('intervalo maior que o limite é cortado antes da requisição', async () => {
  const { urls } = mockFetch(reply({ body: [] }));
  try {
    const result = await getAPODBulk({ startDate: '2020-01-01', endDate: '2026-09-01', maxDates: 10 });
    assert.match(urls[0], /date_from=200101/);
    assert.match(urls[0], /date_to=200110/);
    assert.equal(result.truncated, true);
  } finally {
    restoreFetch();
  }
});

test('o limite nunca passa de MAX_BULK_DATES', async () => {
  const { urls } = mockFetch(reply({ body: [] }));
  try {
    await getAPODBulk({ startDate: '2000-01-01', endDate: '2026-09-01', maxDates: 99999 });
    const end = urls[0].match(/date_to=(\d{6})/)?.[1];
    // 366 dias a partir de 2000-01-01 (ano bissexto) terminam em 2000-12-31
    assert.equal(end, '001231');
    assert.equal(MAX_BULK_DATES, 366);
  } finally {
    restoreFetch();
  }
});

test('intervalo sem nenhum APOD devolve um item de erro', async () => {
  mockFetch(reply({ body: [] }));
  try {
    const result = await getAPODBulk({ startDate: '2026-09-01', endDate: '2026-09-02' });
    assert.equal(result.requested, 1);
    assert.equal(result.failed, 1);
    assert.equal(result.results[0].response.code, 404);
  } finally {
    restoreFetch();
  }
});

test('erro da NASA no intervalo vira um item de erro com fallback', async () => {
  mockFetch(reply({ status: 400, body: { code: 'rest_post_invalid_page_number', message: 'Página inválida.' } }));
  try {
    const result = await getAPODBulk({ startDate: '2026-09-01', endDate: '2026-09-02' });
    assert.equal(result.failed, 1);
    assert.equal(result.results[0].response.dev_msg, 'rest_post_invalid_page_number');
    assert.equal(result.results[0].response.fallback, true);
  } finally {
    restoreFetch();
  }
});

test('falha de rede no intervalo não lança exceção', async () => {
  globalThis.fetch = (async () => {
    throw new Error('network down');
  }) as unknown as typeof fetch;
  try {
    const result = await getAPODBulk({ startDate: '2026-09-01', endDate: '2026-09-02' });
    assert.equal(result.failed, 1);
    assert.equal(result.results[0].response.error_msg, 'network down');
  } finally {
    restoreFetch();
  }
});

test('falha na segunda página mantém o que já foi lido e acrescenta o erro', async () => {
  mockFetch(
    reply({ body: sept(6, 30), totalPages: 2 }),
    reply({ status: 500, body: { code: 'internal', message: 'Erro interno.' } }),
  );
  try {
    const result = await getAPODBulk({ startDate: '2026-09-01', endDate: '2026-09-30' });
    assert.equal(result.requested, 26);
    assert.equal(result.failed, 1);
  } finally {
    restoreFetch();
  }
});

// -- Datas avulsas ------------------------------------------------------------

test('dates: uma requisição por data, sem repetidas', async () => {
  const { urls } = mockFetch(reply({ body: apodItem('2026-09-01') }));
  try {
    const result = await getAPODBulk({ dates: ['2026-09-01', '2026-09-01', '2026-06-15'] });
    assert.equal(urls.length, 2);
    assert.match(urls[0], /\/260901$/);
    assert.match(urls[1], /\/260615$/);
    assert.equal(result.requested, 2);
    assert.deepEqual(
      result.results.map((r) => r.date),
      ['2026-09-01', '2026-06-15'],
    );
  } finally {
    restoreFetch();
  }
});

test('dates: respeita maxDates e avisa com truncated', async () => {
  const { urls } = mockFetch(reply({ body: apodItem('2026-09-01') }));
  try {
    const result = await getAPODBulk({ dates: ['2026-09-01', '2026-09-02', '2026-09-03'], maxDates: 2 });
    assert.equal(urls.length, 2);
    assert.equal(result.truncated, true);
  } finally {
    restoreFetch();
  }
});

test('dates: não passa do limite de requisições simultâneas', async () => {
  let inFlight = 0;
  let peak = 0;
  globalThis.fetch = (async () => {
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    inFlight -= 1;
    return reply({ body: apodItem('2026-09-01') });
  }) as unknown as typeof fetch;
  try {
    const dates = Array.from({ length: 30 }, (_, i) => `2026-08-${String(i + 1).padStart(2, '0')}`);
    await getAPODBulk({ dates, concurrency: 999 });
    assert.ok(peak <= 10, `pico de ${peak} requisições simultâneas`);
  } finally {
    restoreFetch();
  }
});

test('dates: uma data com erro não derruba as outras', async () => {
  mockFetch(
    reply({ body: apodItem('2026-09-01') }),
    reply({ status: 404, body: { code: 'rest_no_route', message: 'Sem APOD.' } }),
    reply({ body: apodItem('2026-09-03') }),
  );
  try {
    const result = await getAPODBulk({ dates: ['2026-09-01', '2026-09-02', '2026-09-03'], concurrency: 1 });
    assert.equal(result.requested, 3);
    assert.equal(result.failed, 1);
    assert.equal(result.results[1].response.error, true);
    assert.equal(result.results[2].response.error, false);
  } finally {
    restoreFetch();
  }
});

test('dates junto com startDate lança TypeError', async () => {
  await assert.rejects(() => getAPODBulk({ dates: ['2026-09-01'], startDate: '2026-09-01' }), TypeError);
});
