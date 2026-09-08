import { normalizeDate } from './dateUtils.js';
import { _internal, getAPOD } from './index.js';
import type { ApodBulkItem, ApodBulkOptions, ApodBulkResponse, ApodData, ApodResponse } from './types.js';
import { MAX_BULK_CONCURRENCY, MAX_BULK_DATES } from './types.js';

// `_internal` é acessado dentro das funções (nunca no topo do módulo) porque
// `index.ts` e `bulk.ts` formam um ciclo de import (`index.ts` reexporta
// `getAPODBulk`, e este arquivo reaproveita helpers internos de `index.ts`) — ler
// `_internal` no nível de módulo poderia rodar antes de `index.ts` terminar de
// inicializar suas próprias exportações, dependendo da ordem de bundling.

/** Casa exatamente o formato `YYYY-MM-DD`. Usado para validar `startDate`/`endDate` antes de ir para a URL. */
const SAFE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/** Constrói uma `ApodResponse` completa a partir de um item bruto do array retornado por `start_date`/`end_date`. */
function responseFromRawItem(raw: Record<string, unknown>): ApodResponse {
  const response = _internal.emptyResponse();
  response.error = false;
  response.nasa = { ...response.nasa, ...raw } as ApodData;
  response.date = (response.nasa.date as string) || response.date;
  response.best_image = _internal.deriveThumbnailAndBestImage(response.nasa);
  return response;
}

/**
 * Roda `tasks` respeitando um limite de concorrência `limit`, sem nunca deixar uma
 * tarefa individual derrubar as outras — cada resultado (sucesso ou falha) é resolvido
 * na posição correspondente do array de saída. Implementado como um pool de workers
 * simples: cada "worker" consome o próximo índice disponível até a fila acabar, então
 * nunca há mais que `limit` chamadas em voo ao mesmo tempo, não importa quantas `tasks`
 * existam — é isso que torna o lote seguro para a cota de requisições da API da NASA e
 * para os próprios recursos do processo que está rodando o pacote.
 */
async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= tasks.length) return;
      results[current] = await tasks[current]();
    }
  }

  const workerCount = Math.max(1, Math.min(limit, tasks.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

/**
 * Busca a "Foto Astronômica do Dia" (APOD) da NASA para várias datas de uma vez, de
 * forma segura e responsável:
 *
 * - **Intervalo contíguo** (`startDate`/`endDate`): vira **uma única** requisição à API
 *   da NASA, usando os parâmetros nativos `start_date`/`end_date` — não uma requisição
 *   por dia. É o caminho recomendado para lotes grandes.
 * - **Datas específicas e não-contíguas** (`dates`): cada uma vira uma chamada a
 *   `getAPOD()` internamente, mas rodando em um pool com concorrência limitada
 *   (`concurrency`, no máximo `MAX_BULK_CONCURRENCY`) — nunca todas de uma vez — para
 *   não sobrecarregar a API nem estourar o limite de requisições/hora da `apiKey`.
 *
 * Em ambos os casos:
 * - O tamanho do lote é sempre limitado (`maxDates`, no máximo `MAX_BULK_DATES`); um
 *   pedido maior que isso é truncado, nunca rejeitado com exceção — `truncated: true`
 *   avisa quando isso acontece.
 * - Datas duplicadas em `dates` são removidas antes de contar para o limite.
 * - Uma data individual falhar (erro de rede, erro da API, data malformada) nunca
 *   derruba o lote inteiro nem lança exceção — o item correspondente em `results` só
 *   tem `error: true` (com a mesma resposta "sempre útil" de `getAPOD()`, incluindo o
 *   fallback com uma foto de exemplo).
 *
 * @example
 * ```ts
 * // Intervalo contíguo — 1 única requisição HTTP
 * const week = await getAPODBulk({ startDate: '2024-01-01', endDate: '2024-01-07' });
 *
 * // Datas específicas, não-contíguas — até `concurrency` requisições em paralelo
 * const picks = await getAPODBulk({ dates: ['2024-01-01', '2024-06-15', '2023-12-25'] });
 * ```
 */
export async function getAPODBulk(options: ApodBulkOptions = {}): Promise<ApodBulkResponse> {
  const apiKey = options.apiKey ?? 'DEMO_KEY';
  const timeout = options.timeout ?? 15000;
  const maxDates = Math.max(1, Math.min(options.maxDates ?? MAX_BULK_DATES, MAX_BULK_DATES));
  const concurrency = Math.max(1, Math.min(options.concurrency ?? MAX_BULK_CONCURRENCY, MAX_BULK_CONCURRENCY));

  const usingRange = Boolean(options.startDate || options.endDate);
  const usingDates = Boolean(options.dates && options.dates.length > 0);

  if (usingRange && usingDates) {
    throw new TypeError('getAPODBulk: use "dates" OU "startDate"/"endDate", não os dois ao mesmo tempo.');
  }

  if (usingRange) {
    return getAPODRange({ apiKey, timeout, maxDates, startDate: options.startDate, endDate: options.endDate });
  }

  return getAPODForDates({ apiKey, timeout, maxDates, concurrency, dates: options.dates ?? [] });
}

/** Caminho `startDate`/`endDate`: uma única requisição HTTP para todo o intervalo. */
async function getAPODRange(params: {
  apiKey: string;
  timeout: number;
  maxDates: number;
  startDate?: string;
  endDate?: string;
}): Promise<ApodBulkResponse> {
  const { apiKey, timeout, maxDates } = params;

  const endDate = SAFE_DATE_RE.test(params.endDate ?? '') ? (params.endDate as string) : todayISO();
  const { date: normalizedStart } = normalizeDate(params.startDate ?? '');
  const startDate = SAFE_DATE_RE.test(params.startDate ?? '') ? (params.startDate as string) : normalizedStart;

  // Corta o intervalo no cliente antes de disparar a requisição: evita pedir para a
  // NASA um intervalo gigantesco (ex.: `startDate: '1996-01-01'`) que devolveria um
  // array com milhares de entradas de uma vez, o que seria irresponsável tanto para a
  // API da NASA quanto para a memória do processo que consome este pacote.
  const cappedEndDate = capRangeEnd(startDate, endDate, maxDates);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const results: ApodBulkItem[] = [];
  let truncated = cappedEndDate !== endDate;

  try {
    const url = `https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(cappedEndDate)}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    const body = (await res.json()) as unknown;

    if (Array.isArray(body)) {
      for (const raw of body as Array<Record<string, unknown>>) {
        const response = responseFromRawItem(raw);
        response.code = res.status;
        response.explain = _internal.HTTP_CODES[String(res.status)];
        results.push({ date: response.date, response });
      }
    } else {
      // A NASA respondeu, mas não com um array (chave inválida, limite excedido, intervalo
      // inválido, etc.) — um único item de erro representa o lote inteiro, com a mesma
      // resposta "sempre útil" usada em `getAPOD()`, em vez de deixar `results` vazio.
      const errorBody = body as Record<string, unknown>;
      const response = _internal.emptyResponse();
      response.code = res.status;
      response.explain = _internal.HTTP_CODES[String(res.status)];
      response.error = true;
      if ('code' in errorBody) {
        response.code = errorBody.code as number;
        response.error_msg = (errorBody.msg as string) ?? false;
        response.explain = _internal.HTTP_CODES[String(response.code)];
      } else if ('error' in errorBody) {
        const err = errorBody.error as { message?: string; code?: string };
        response.error_msg = err?.message ?? false;
        response.dev_msg = err?.code ?? false;
      } else {
        response.error_msg = 'A API da NASA retornou um formato inesperado para start_date/end_date.';
      }
      _internal.fillWithFallback(response);
      results.push({ date: startDate, response });
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    const response = _internal.emptyResponse();
    response.error = true;
    response.code = error.code ?? 500;
    response.error_msg = error.message;
    response.explain = _internal.HTTP_CODES[String(response.code)] ?? _internal.HTTP_CODES['500'];
    _internal.fillWithFallback(response);
    results.push({ date: startDate, response });
  } finally {
    clearTimeout(timer);
  }

  const failedCount = results.reduce((count, item) => count + (item.response.error ? 1 : 0), 0);

  return {
    results,
    requested: results.length,
    failed: failedCount,
    truncated,
  };
}

/** Corta `endDate` para que o intervalo `[startDate, endDate]` nunca exceda `maxDates` dias. */
function capRangeEnd(startDate: string, endDate: string, maxDates: number): string {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return endDate;
  }

  const oneDayMs = 24 * 60 * 60 * 1000;
  const spanDays = Math.round((end.getTime() - start.getTime()) / oneDayMs) + 1;

  if (spanDays <= maxDates) {
    return endDate;
  }

  const cappedEnd = new Date(start.getTime() + (maxDates - 1) * oneDayMs);
  return cappedEnd.toISOString().split('T')[0];
}

/** Caminho `dates`: uma chamada a `getAPOD()` por data, em um pool com concorrência limitada. */
async function getAPODForDates(params: {
  apiKey: string;
  timeout: number;
  maxDates: number;
  concurrency: number;
  dates: string[];
}): Promise<ApodBulkResponse> {
  const { apiKey, timeout, maxDates, concurrency, dates } = params;

  // Dedupe preservando a ordem de primeira ocorrência, e só então aplica o limite —
  // assim datas repetidas não "gastam" espaço do lote nem geram requisições duplicadas.
  const uniqueDates = Array.from(new Set(dates));
  const truncated = uniqueDates.length > maxDates;
  const boundedDates = uniqueDates.slice(0, maxDates);

  // getAPOD é importado estaticamente do próprio ./index.js — como bulk.ts não é
  // importado de volta por index.ts (ele é reexportado a partir de um módulo separado,
  // ver src/index.ts no fim do arquivo), não há ciclo de módulos aqui.
  const tasks = boundedDates.map((rawDate) => async () => {
    const response = await getAPOD({ apiKey, date: rawDate, timeout });
    // `response.date` reflete a data normalizada/corrigida (ex.: uma data futura vira
    // "hoje", um erro vira a data do fallback). Para quem está iterando o lote, é mais
    // útil `date` aqui sempre corresponder à data efetivamente pedida — os detalhes de
    // correção/erro continuam disponíveis em `response.data_msg`/`response.error_msg`.
    return { date: rawDate, response } satisfies ApodBulkItem;
  });

  const results = await runWithConcurrency(tasks, concurrency);
  const failedCount = results.reduce((count, item) => count + (item.response.error ? 1 : 0), 0);

  return {
    results,
    requested: results.length,
    failed: failedCount,
    truncated,
  };
}
