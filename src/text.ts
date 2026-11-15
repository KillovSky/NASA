const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const code = parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/** Tira as tags de um trecho de HTML e decodifica as entidades. `<br>` vira quebra de linha. */
export function htmlToText(html: string): string {
  const withoutTags = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '');
  return decodeEntities(withoutTags)
    .replace(/[ \t\u00a0]+/g, ' ')
    .trim();
}

/**
 * Texto puro da explicação de um APOD. A API manda o rótulo "Explanation:" no começo
 * e a dica da foto de amanhã no fim; os dois saem daqui.
 */
export function explanationToText(html: string): string {
  let text = htmlToText(html).replace(/^Explanation:\s*/, '');
  const tomorrow = text.search(/Tomorrow['’]s picture:/i);
  if (tomorrow >= 0) text = text.slice(0, tomorrow);
  return text.trim();
}
