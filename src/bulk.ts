import { getAPOD } from './apod.js';
import { normalizeDate, toLegacyDate } from './dateUtils.js';
import {
  applyFailure,
  buildUrl,
  emptyResponse,
  failureFromError,
  PAGE_SIZE,
  readFailure,
  requestApod,
  responseFromItem,
  toItems,
} from './api.js';
import type { ApodBulkItem, ApodBulkOptions, ApodBulkResponse } from './types.js';
import { MAX_BULK_CONCURRENCY, MAX_BULK_DATES } from './types.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Roda as tarefas com no máximo `limit` em andamento e guarda cada resultado na sua posição. */
async function runWithConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await tasks[current]();
    }
  }

  const workerCount = Math.max(1, Math.min(limit, tasks.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

/** Encurta `endDate` para o intervalo não passar de `maxDates` dias. */
function capRangeEnd(startDate: string, endDate: string, maxDates: number): string {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return endDate;
  }

  const spanDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  if (spanDays <= maxDates) return endDate;

  return new Date(start.getTime() + (maxDates - 1) * DAY_MS).toISOString().split('T')[0];
}

/**
 * Busca vários APODs.
 *
 * Com `startDate`/`endDate` usa a listagem da API (`date_from`/`date_to`), 25 itens por
 * página, então um mês inteiro são 2 requisições. Com `dates`, faz uma requisição por
 * data, no máximo `concurrency` ao mesmo tempo.
 *
 * O lote nunca passa de `maxDates` (teto `MAX_BULK_DATES`); o que passar é cortado e
 * `truncated` fica `true`. Uma data com problema não derruba as outras: o item dela
 * vem com `error: true`.
 *
 * @example
 * const week = await getAPODBulk({ startDate: '2026-09-01', endDate: '2026-09-07' });
 * const picks = await getAPODBulk({ dates: ['2026-09-01', '2026-06-15'] });
 */
export async function getAPODBulk(options: ApodBulkOptions = {}): Promise<ApodBulkResponse> {
  const timeout = options.timeout ?? 15000;
  const maxDates = Math.max(1, Math.min(options.maxDates ?? MAX_BULK_DATES, MAX_BULK_DATES));
  const concurrency = Math.max(1, Math.min(options.concurrency ?? MAX_BULK_CONCURRENCY, MAX_BULK_CONCURRENCY));

  const usingRange = Boolean(options.startDate || options.endDate);
  const usingDates = Boolean(options.dates && options.dates.length > 0);

  if (usingRange && usingDates) {
    throw new TypeError('getAPODBulk: use "dates" OU "startDate"/"endDate", não os dois ao mesmo tempo.');
  }

  if (usingRange) {
    return getRange({ apiKey: options.apiKey, timeout, maxDates, startDate: options.startDate, endDate: options.endDate });
  }

  return getDates({ apiKey: options.apiKey, timeout, maxDates, concurrency, dates: options.dates ?? [] });
}

function summarize(results: ApodBulkItem[], truncated: boolean): ApodBulkResponse {
  return {
    results,
    requested: results.length,
    failed: results.filter((item) => item.response.error).length,
    truncated,
  };
}

async function getRange(params: {
  apiKey?: string;
  timeout: number;
  maxDates: number;
  startDate?: string;
  endDate?: string;
}): Promise<ApodBulkResponse> {
  const { apiKey, timeout, maxDates } = params;

  const startDate = normalizeDate(params.startDate ?? '').date;
  const endDate = normalizeDate(params.endDate ?? '').date;
  const cappedEnd = capRangeEnd(startDate, endDate, maxDates);

  const results: ApodBulkItem[] = [];

  try {
    let page = 1;
    let totalPages: number | null = null;

    while (true) {
      const reply = await requestApod(
        buildUrl('', {
          date_from: toLegacyDate(startDate) ?? undefined,
          date_to: toLegacyDate(cappedEnd) ?? undefined,
          per_page: PAGE_SIZE,
          page,
          api_key: apiKey,
        }),
        timeout,
      );

      const failure = readFailure(reply);
      if (failure) {
        const response = emptyResponse();
        applyFailure(response, failure);
        results.push({ date: startDate, response });
        break;
      }

      const items = toItems(reply.body);
      for (const raw of items) {
        const response = responseFromItem(raw, reply.status);
        results.push({ date: response.date, response });
      }

      totalPages = reply.totalPages ?? totalPages;
      const lastPage = items.length < PAGE_SIZE || (totalPages !== null && page >= totalPages);
      if (lastPage || results.length >= maxDates) break;
      page += 1;
    }

    if (results.length === 0) {
      const response = emptyResponse();
      applyFailure(response, { status: 404, message: 'A NASA não tem APODs neste intervalo.', devMessage: false });
      results.push({ date: startDate, response });
    }
  } catch (err) {
    const response = emptyResponse();
    applyFailure(response, failureFromError(err));
    results.push({ date: startDate, response });
  }

  results.sort((a, b) => a.date.localeCompare(b.date));

  return summarize(results, cappedEnd !== endDate);
}

async function getDates(params: {
  apiKey?: string;
  timeout: number;
  maxDates: number;
  concurrency: number;
  dates: string[];
}): Promise<ApodBulkResponse> {
  const { apiKey, timeout, maxDates, concurrency, dates } = params;

  const uniqueDates = Array.from(new Set(dates));
  const truncated = uniqueDates.length > maxDates;

  const tasks = uniqueDates.slice(0, maxDates).map((rawDate) => async (): Promise<ApodBulkItem> => {
    const response = await getAPOD({ apiKey, date: rawDate, timeout });
    // `response.date` pode ter sido corrigida; aqui fica a data que foi pedida.
    return { date: rawDate, response };
  });

  return summarize(await runWithConcurrency(tasks, concurrency), truncated);
}
