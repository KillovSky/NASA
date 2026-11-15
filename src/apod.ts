import { normalizeDate, toLegacyDate } from './dateUtils.js';
import { downloadImage } from './download.js';
import {
  applyFailure,
  buildUrl,
  emptyResponse,
  failureFromError,
  readFailure,
  requestApod,
  responseFromItem,
  toItems,
} from './api.js';
import type { ApodOptions, ApodResponse } from './types.js';

/**
 * Busca um APOD. Sem `date`, traz o mais recente.
 *
 * Não lança exceção: erro de rede, tempo esgotado ou resposta de erro da NASA
 * ficam em `error`/`error_msg`, e `nasa` recebe um exemplo embutido (`fallback: true`).
 *
 * @example
 * const apod = await getAPOD({ date: '2026-09-11' });
 * console.log(apod.nasa.title, apod.best_image);
 */
export async function getAPOD(options: ApodOptions = {}): Promise<ApodResponse> {
  const timeout = options.timeout ?? 15000;
  const response = emptyResponse();

  let url: string;
  if (options.date) {
    const { date, warning } = normalizeDate(options.date);
    if (warning) response.data_msg = warning;
    response.date = date;
    url = buildUrl(`/${toLegacyDate(date)}`, { api_key: options.apiKey });
  } else {
    url = buildUrl('', { per_page: 1, api_key: options.apiKey });
  }

  try {
    const reply = await requestApod(url, timeout);
    const failure = readFailure(reply);
    const [item] = failure ? [] : toItems(reply.body);

    if (failure) {
      applyFailure(response, failure);
    } else if (!item) {
      applyFailure(response, { status: 404, message: 'A NASA não tem APOD para esta data.', devMessage: false });
    } else {
      const parsed = responseFromItem(item, reply.status);
      parsed.data_msg = response.data_msg;
      Object.assign(response, parsed);
    }

    if (options.download && !response.error) {
      response.download = await downloadImage(response, options.downloadPath ?? '');
    }
  } catch (err) {
    applyFailure(response, failureFromError(err));
  }

  return response;
}
