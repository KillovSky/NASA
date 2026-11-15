const YOUTUBE_ID_RE = /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*)/;

export function youtubeThumbnail(url: string): string | false {
  const normalized = url.startsWith('//') ? `https:${url}` : url;
  const match = YOUTUBE_ID_RE.exec(normalized);
  return match?.[1] ? `https://img.youtube.com/vi/${match[1]}/0.jpg` : false;
}

// O ID do Vimeo é o último segmento só de dígitos do caminho. Separar por "/" evita uma
// regex com `.*`, que pode ficar lenta em URLs montadas de propósito.
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

/** Miniatura de um vídeo do YouTube ou do Vimeo a partir do endereço dele. */
export function videoThumbnail(videoUrl: string): string | false {
  if (videoUrl.includes('youtu')) return youtubeThumbnail(videoUrl);
  if (videoUrl.includes('vimeo')) return vimeoThumbnail(videoUrl);
  return false;
}

/**
 * Procura o endereço do vídeo no HTML da página do APOD: o `src` do primeiro
 * `<source>` (MP4 hospedado pela NASA) ou `<iframe>` (YouTube, Vimeo).
 */
export function extractVideoUrl(html: string): string | false {
  const tag = /<(?:source|iframe)\b[^>]*>/i.exec(html);
  if (!tag) return false;
  const src = /\ssrc\s*=\s*["']([^"']+)["']/i.exec(tag[0]);
  return src ? src[1] : false;
}
