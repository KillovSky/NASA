import httpCodes from './httpCodes.json' with { type: 'json' };
import fallbackApods from './fallbackApods.json' with { type: 'json' };
import { extractVideoUrl, videoThumbnail } from './media.js';
import { explanationToText, htmlToText } from './text.js';
import type { ApodData, ApodResponse, HttpCodeExplain } from './types.js';

export const APOD_URL = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic';

/** Máximo de itens por página que a API aceita. */
export const PAGE_SIZE = 25;

export const HTTP_CODES = httpCodes as unknown as Record<string, HttpCodeExplain>;
const FALLBACK_APODS = fallbackApods as unknown as Array<Record<string, unknown>>;

export function buildUrl(pathSuffix: string, params: Record<string, string | number | undefined>): string {
  const url = new URL(`${APOD_URL}${pathSuffix}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface Reply {
  status: number;
  body: unknown;
  /** Valor do cabeçalho `X-WP-TotalPages`, quando existe. */
  totalPages: number | null;
}

export async function requestApod(url: string, timeout: number): Promise<Reply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }

    const pages = Number(res.headers?.get('x-wp-totalpages'));
    return { status: res.status, body, totalPages: Number.isFinite(pages) && pages > 0 ? pages : null };
  } finally {
    clearTimeout(timer);
  }
}

export interface Failure {
  status: number | string;
  message: string | false;
  devMessage: string | false;
}

/**
 * Diz se a resposta é um erro. O WordPress devolve `{ code, message, data: { status } }`;
 * o gateway do api.nasa.gov, quando está na frente, devolve `{ error: { code, message } }`.
 */
export function readFailure(reply: Reply): Failure | null {
  const { status, body } = reply;

  if (isRecord(body) && typeof body.code === 'string' && 'message' in body) {
    return { status, message: String(body.message), devMessage: body.code };
  }

  if (isRecord(body) && isRecord(body.error)) {
    const err = body.error as { message?: string; code?: string };
    return { status, message: err.message ?? false, devMessage: err.code ?? false };
  }

  if (status < 200 || status >= 300) {
    return { status, message: `A NASA respondeu com o status ${status}.`, devMessage: false };
  }

  if (body === null) {
    return { status, message: 'A resposta da NASA não é um JSON válido.', devMessage: false };
  }

  return null;
}

export function failureFromError(err: unknown): Failure {
  const error = err as NodeJS.ErrnoException;
  return { status: error.code ?? 500, message: error.message, devMessage: false };
}

function str(value: unknown): string | false {
  return typeof value === 'string' && value !== '' ? value : false;
}

/** Normaliza um item cru da API: campos ausentes viram `false` e os campos calculados são preenchidos. */
export function parseItem(raw: Record<string, unknown>): ApodData {
  const explanation = str(raw.explanation);
  const credit = str(raw.credit);
  const html = str(raw.basic_html);

  return {
    ...raw,
    date: str(raw.date),
    post_id: typeof raw.post_id === 'number' ? raw.post_id : false,
    title: str(raw.title),
    permalink: str(raw.permalink),
    media_type: str(raw.media_type),
    explanation,
    explanation_text: explanation ? explanationToText(explanation) : false,
    credit,
    credit_text: credit ? htmlToText(credit) : false,
    copyright: str(raw.copyright),
    alt: str(raw.alt),
    url: str(raw.url),
    hdurl: str(raw.hdurl),
    basic_html: html,
    basic_html_url: str(raw.basic_html_url),
    video_url: str(raw.video_url) || (html ? extractVideoUrl(html) : false),
  };
}

export function bestImage(nasa: ApodData): string | false {
  if (nasa.hdurl) return nasa.hdurl;
  if (nasa.video_url) return videoThumbnail(nasa.video_url);
  return false;
}

/** A API devolve uma lista nas rotas de listagem e um objeto na rota de data única. */
export function toItems(body: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(body)) return body.filter(isRecord);
  if (isRecord(body) && 'date' in body) return [body];
  return [];
}

export function emptyResponse(): ApodResponse {
  return {
    date: new Date().toISOString().split('T')[0],
    error: false,
    code: 200,
    explain: HTTP_CODES['200'],
    dev_msg: false,
    data_msg: false,
    error_msg: false,
    best_image: false,
    download: false,
    fallback: false,
    nasa: parseItem({}),
  };
}

export function responseFromItem(raw: Record<string, unknown>, status: number): ApodResponse {
  const response = emptyResponse();
  response.code = status;
  response.explain = HTTP_CODES[String(status)];
  response.nasa = parseItem(raw);
  response.date = response.nasa.date || response.date;
  response.best_image = bestImage(response.nasa);
  return response;
}

/** Marca a resposta como erro e preenche `nasa` com um dos exemplos embutidos. */
export function applyFailure(response: ApodResponse, failure: Failure): void {
  response.error = true;
  response.code = failure.status;
  response.explain = HTTP_CODES[String(failure.status)] ?? HTTP_CODES['500'];
  response.error_msg = failure.message;
  response.dev_msg = failure.devMessage;

  const sample = FALLBACK_APODS[Math.floor(Math.random() * FALLBACK_APODS.length)];
  response.fallback = true;
  response.nasa = parseItem(sample);
  response.best_image = bestImage(response.nasa);
}
