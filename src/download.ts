import fs from 'node:fs';
import path from 'node:path';
import type { ApodResponse } from './types.js';

const SAFE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Baixa `best_image` para a pasta indicada e devolve uma mensagem com o resultado.
 *
 * O nome do arquivo usa a data que veio da API, então ela só é aceita se tiver
 * exatamente o formato YYYY-MM-DD; senão entra a data de hoje. A URL só é buscada
 * se for http ou https.
 */
export async function downloadImage(response: ApodResponse, downloadPathInput: string): Promise<string | false> {
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
  const dateForFilename = SAFE_DATE_RE.test(rawDate) ? rawDate : new Date().toISOString().split('T')[0];

  const downPath = path.join(resolvedDir, `${dateForFilename}.jpg`);
  if (path.relative(resolvedDir, downPath).startsWith('..')) {
    return 'Caminho de download inválido.';
  }

  if (fs.existsSync(downPath)) {
    return 'A imagem já havia sido baixada antes, você pode conferir no caminho especificado.';
  }

  const res = await fetch(imageUrl);
  if (!res.ok) {
    return `Não foi possível baixar a imagem (status ${res.status}), você pode tentar acessando o link no JSON.`;
  }
  fs.writeFileSync(downPath, Buffer.from(await res.arrayBuffer()));

  return `Download concluído, salvo em ${downPath}`;
}
