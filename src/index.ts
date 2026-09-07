import fs from 'node:fs';
import path from 'node:path';
import httpCodes from './httpCodes.json' with { type: 'json' };
import { normalizeDate } from './dateUtils.js';
import type { ApodData, ApodOptions, ApodResponse, HttpCodeExplain } from './types.js';

export type { ApodData, ApodOptions, ApodResponse, HttpCodeExplain };
export { normalizeDate, MIN_YEAR } from './dateUtils.js';
export type { NormalizedDate } from './dateUtils.js';

const HTTP_CODES = httpCodes as unknown as Record<string, HttpCodeExplain>;

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

/** Deriva a URL de miniatura de um vídeo do Vimeo a partir da URL do vídeo. */
export function vimeoThumbnail(url: string): string | false {
  const match = /vimeo.*\/(\d+)/i.exec(url);
  return match?.[1] ? `https://vumbnail.com/${match[1]}.jpg` : false;
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

  const response: ApodResponse = {
    date: new Date().toISOString().split('T')[0],
    error: false,
    code: 200,
    explain: HTTP_CODES['200'],
    dev_msg: false,
    data_msg: false,
    error_msg: false,
    best_image: false,
    download: false,
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
    } else if ('error' in body) {
      const err = body.error as { message?: string; code?: string };
      response.error = true;
      response.error_msg = err.message ?? false;
      response.dev_msg = err.code ?? false;
    } else {
      response.error = false;
      response.nasa = { ...response.nasa, ...body } as ApodData;
      response.date = (response.nasa.date as string) || response.date;

      if (!response.nasa.thumbnail_url) {
        if (response.nasa.media_type === 'video' && typeof response.nasa.url === 'string') {
          if (response.nasa.url.includes('youtu')) {
            response.nasa.thumbnail_url = youtubeThumbnail(response.nasa.url);
          } else if (response.nasa.url.includes('vimeo')) {
            response.nasa.thumbnail_url = vimeoThumbnail(response.nasa.url);
          } else {
            response.nasa.thumbnail_url = false;
          }
        } else {
          response.nasa.thumbnail_url = false;
        }
      }
    }

    if (response.nasa.media_type === 'image') {
      response.best_image = (response.nasa.hdurl as string) || (response.nasa.url as string) || false;
    } else if (response.nasa.thumbnail_url) {
      response.best_image = response.nasa.thumbnail_url as string;
    } else {
      response.best_image = false;
    }

    if (options.download) {
      response.download = await downloadImage(response, options.downloadPath ?? '');
    }
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    response.error = true;
    response.code = error.code ?? 500;
    response.error_msg = error.message;
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

export default { getAPOD, getHttpCodes };
