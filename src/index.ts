import fs from 'node:fs';
import path from 'node:path';
import httpCodes from './httpCodes.json' with { type: 'json' };
import fallbackApods from './fallbackApods.json' with { type: 'json' };
import { normalizeDate } from './dateUtils.js';
import type { ApodData, ApodOptions, ApodResponse, HttpCodeExplain } from './types.js';

export type { ApodData, ApodOptions, ApodResponse, HttpCodeExplain };
export { normalizeDate, MIN_YEAR } from './dateUtils.js';
export type { NormalizedDate } from './dateUtils.js';

const HTTP_CODES = httpCodes as unknown as Record<string, HttpCodeExplain>;
const FALLBACK_APODS = fallbackApods as unknown as ApodData[];

/** Sorteia um dos exemplos reais de APOD para usar como base de uma resposta de erro. */
function pickFallbackApod(): ApodData {
  const sample = FALLBACK_APODS[Math.floor(Math.random() * FALLBACK_APODS.length)];
  return { ...sample };
}

/**
 * Deriva a URL de miniatura de um vídeo do YouTube a partir da URL do vídeo.
 *
 * A URL vem da resposta da API da NASA (dado de rede, não confiável). Por
 * isso a regex evita `.*` no início/fim combinado com alternação — esse
 * padrão pode degradar para tempo polinomial em entradas adversariais
 * (CodeQL sinaliza como "polynomial regular expression used on uncontrolled
 * data"). Como o objetivo é só achar a primeira ocorrência de um dos
 * marcadores em qualquer posição da string, a busca funciona igual sem as
 * âncoras `.*` — `RegExp.exec` já procura a string inteira por padrão.
 */
const YOUTUBE_ID_RE = /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/;

export function youtubeThumbnail(url: string): string | false {
  const normalized = url.startsWith('//') ? `https:${url}` : url;
  const match = YOUTUBE_ID_RE.exec(normalized);
  return match?.[1] ? `https://img.youtube.com/vi/${match[1]}/0.jpg` : false;
}

/**
 * Deriva a URL de miniatura de um vídeo do Vimeo a partir da URL do vídeo.
 *
 * A URL vem da resposta da API da NASA (dado de rede, não confiável). A versão
 * anterior (`/vimeo.*\/(\d+)/i`) combinava `.*` guloso com um separador literal
 * repetível (`/`) — padrão que o CodeQL sinaliza como "polynomial regular
 * expression used on uncontrolled data" (ReDoS), pois o motor de regex pode
 * tentar reencaixar o `.*` um número polinomial de vezes em entradas
 * adversariais cheias de barras antes de desistir.
 *
 * O comportamento original era: aceitar a URL só se contiver "vimeo", e então
 * usar o *último* segmento puramente numérico do caminho como ID (o que
 * permite formatos como `vimeo.com/927766087`,
 * `player.vimeo.com/video/927766087` ou
 * `vimeo.com/groups/nome/videos/927766087`). Isso é reproduzido aqui sem
 * regex de custo não-linear: a URL é dividida por `/` (uma operação O(n),
 * sem backtracking) e percorrida de trás para frente até achar um segmento
 * só de dígitos.
 */
export function vimeoThumbnail(url: string): string | false {
  if (!/vimeo/i.test(url)) return false;

  const withoutQuery = url.split(/[?#]/, 1)[0] ?? url;
  const segments = withoutQuery.split('/');

  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const segment = segments[i];
    if (segment.length > 0 && /^\d+$/.test(segment)) {
      return `https://vumbnail.com/${segment}.jpg`;
    }
  }

  return false;
}

/**
 * Deriva `thumbnail_url` (quando ausente e a mídia for vídeo do YouTube/Vimeo) e
 * `best_image` para um objeto `ApodData`, mutando-o. Compartilhada por `getAPOD()` e
 * `getAPODBulk()` para os dois terem exatamente o mesmo comportamento de derivação.
 */
function deriveThumbnailAndBestImage(nasa: ApodData): string | false {
  if (!nasa.thumbnail_url) {
    if (nasa.media_type === 'video' && typeof nasa.url === 'string') {
      if (nasa.url.includes('youtu')) {
        nasa.thumbnail_url = youtubeThumbnail(nasa.url);
      } else if (nasa.url.includes('vimeo')) {
        nasa.thumbnail_url = vimeoThumbnail(nasa.url);
      } else {
        nasa.thumbnail_url = false;
      }
    } else {
      nasa.thumbnail_url = false;
    }
  }

  if (nasa.media_type === 'image') {
    return (nasa.hdurl as string) || (nasa.url as string) || false;
  }
  if (nasa.thumbnail_url) {
    return nasa.thumbnail_url as string;
  }
  return false;
}

/** Cria o esqueleto de uma `ApodResponse` "vazia" (usado antes de saber se deu certo ou não). */
function emptyResponse(): ApodResponse {
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
    nasa: {
      date: false,
      explanation: false,
      hdurl: false,
      media_type: false,
      service_version: false,
      title: false,
      url: false,
      copyright: false,
      thumbnail_url: false,
    },
  };
}

/** Preenche `response` com um exemplo de fallback (dados + thumbnail + best_image), marcando `fallback: true`. */
function fillWithFallback(response: ApodResponse): void {
  response.fallback = true;
  response.nasa = pickFallbackApod();
  response.best_image = deriveThumbnailAndBestImage(response.nasa);
}

/**
 * Busca a "Foto Astronômica do Dia" (APOD) da NASA.
 *
 * @example
 * ```ts
 * const apod = await getAPOD({ date: '2024-01-01' });
 * console.log(apod.best_image);
 * ```
 */
export async function getAPOD(options: ApodOptions = {}): Promise<ApodResponse> {
  const apiKey = options.apiKey ?? 'DEMO_KEY';
  const timeout = options.timeout ?? 15000;

  const response = emptyResponse();

  const { date, warning } = normalizeDate(options.date ?? '');
  if (warning) response.data_msg = warning;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(`https://api.nasa.gov/planetary/apod?api_key=${encodeURIComponent(apiKey)}&date=${encodeURIComponent(date)}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    response.code = res.status;
    response.explain = HTTP_CODES[String(res.status)];

    const body = (await res.json()) as Record<string, unknown>;

    if ('code' in body) {
      response.error = true;
      response.code = body.code as number;
      response.error_msg = (body.msg as string) ?? false;
      response.explain = HTTP_CODES[String(response.code)];
      fillWithFallback(response);
    } else if ('error' in body) {
      const err = body.error as { message?: string; code?: string };
      response.error = true;
      response.error_msg = err.message ?? false;
      response.dev_msg = err.code ?? false;
      fillWithFallback(response);
    } else {
      response.error = false;
      response.nasa = { ...response.nasa, ...body } as ApodData;
      response.date = (response.nasa.date as string) || response.date;
      response.best_image = deriveThumbnailAndBestImage(response.nasa);
    }

    if (options.download) {
      response.download = await downloadImage(response, options.downloadPath ?? '');
    }
  } catch (err) {
    // Erro de rede, timeout (AbortError) ou resposta que não é um JSON válido.
    // Reproduz o comportamento da v1.x.x: mesmo aqui, a resposta continua útil —
    // `nasa`/`best_image` são preenchidos com um exemplo real de APOD (e
    // `fallback` marcado como `true`) em vez de ficarem vazios. `error`/`error_msg`/
    // `code` continuam contando exatamente o que aconteceu.
    const error = err as NodeJS.ErrnoException;
    response.error = true;
    response.code = error.code ?? 500;
    response.error_msg = error.message;
    response.explain = HTTP_CODES[String(response.code)] ?? HTTP_CODES['500'];
    fillWithFallback(response);
  } finally {
    clearTimeout(timer);
  }

  return response;
}

/** Casa exatamente o formato `YYYY-MM-DD` — usado para sanitizar o nome do arquivo de download. */
const SAFE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Baixa a melhor imagem/miniatura disponível para o disco e retorna uma mensagem de status.
 *
 * Duas validações de segurança acontecem aqui porque tanto o nome do arquivo
 * quanto a URL baixada derivam de dados que vieram pela rede (a resposta da
 * API da NASA) — ou seja, não são, estritamente falando, confiáveis:
 *
 * 1. **Nome do arquivo**: `response.nasa.date` (ou `response.date`) vira
 *    parte do caminho gravado em disco. Se não estiver estritamente no
 *    formato `YYYY-MM-DD`, ele é descartado e substituído por um timestamp
 *    gerado localmente — impede um "path traversal" (ex.: um valor como
 *    `"../../../etc/cron.d/x"` vindo da resposta) de escrever fora da pasta
 *    de destino.
 * 2. **URL da imagem**: só protocolos `http:`/`https:` são aceitos antes do
 *    `fetch`. Isso bloqueia esquemas como `file:` que, se a API alguma vez
 *    devolvesse (ou um MITM injetasse) uma URL desse tipo, poderiam expor
 *    conteúdo do sistema de arquivos local em vez de uma imagem real.
 */
async function downloadImage(response: ApodResponse, downloadPathInput: string): Promise<string | false> {
  let downloadPath = downloadPathInput;
  if (!downloadPath) {
    downloadPath = './NASA_IMAGES/';
    if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath, { recursive: true });
  }

  const resolvedDir = path.resolve(path.normalize(downloadPath));
  if (!fs.existsSync(resolvedDir)) {
    return 'O caminho especificado não existe, você pode tentar baixar acessando o link no JSON.';
  }

  if (!response.best_image) {
    return 'Aparentemente não há imagens para baixar nos dados enviados pela NASA.';
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(response.best_image);
  } catch {
    return 'A URL da imagem retornada pela NASA é inválida, você pode tentar baixar acessando o link no JSON.';
  }
  if (imageUrl.protocol !== 'http:' && imageUrl.protocol !== 'https:') {
    return 'A URL da imagem retornada pela NASA usa um protocolo não suportado, você pode tentar baixar acessando o link no JSON.';
  }

  const rawDate = (response.nasa.date as string) || response.date;
  const dateForFilename = SAFE_DATE_RE.test(rawDate)
    ? rawDate
    : new Date().toISOString().split('T')[0];

  const downPath = path.join(resolvedDir, `${dateForFilename}.jpg`);
  // Defesa em profundidade: garante que o caminho final continua dentro da
  // pasta de destino, mesmo que a sanitização acima seja alterada no futuro.
  if (path.relative(resolvedDir, downPath).startsWith('..')) {
    return 'Caminho de download inválido.';
  }

  if (fs.existsSync(downPath)) {
    return 'A imagem já havia sido baixada antes, você pode conferir no caminho especificado.';
  }

  const res = await fetch(imageUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(downPath, buffer);

  return `Download concluído, salvo em ${downPath}`;
}

/** Retorna as explicações de código de status HTTP incluídas no pacote. */
export function getHttpCodes() {
  return HTTP_CODES;
}

/**
 * @internal Não faz parte da API pública/estável do pacote — exportado só para ser
 * reaproveitado por `bulk.ts` dentro deste mesmo pacote, evitando duplicar a lógica de
 * segurança (derivação de thumbnail, fallback útil em caso de erro, tabela de códigos
 * HTTP) entre `getAPOD()` e `getAPODBulk()`.
 */
export const _internal = {
  HTTP_CODES,
  emptyResponse,
  fillWithFallback,
  deriveThumbnailAndBestImage,
};

export { getAPODBulk } from './bulk.js';
export type { ApodBulkItem, ApodBulkOptions, ApodBulkResponse } from './types.js';
export { MAX_BULK_CONCURRENCY, MAX_BULK_DATES } from './types.js';

export default { getAPOD, getHttpCodes };
