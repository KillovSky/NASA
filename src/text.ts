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

/**
 * Remove as tags de um trecho de HTML. Faz uma passada só pelos caracteres em vez de
 * usar `replace` com regex: com regex, entradas como `<<b>script>` deixam uma tag
 * nova para trás depois da remoção. Aqui um `<` só fica como texto quando vem seguido
 * de espaço, dígito, `=` ou do fim da string (como em "1 < 2"); qualquer outro `<`
 * abre uma tag, que vai até o próximo `>`. `<br>` vira quebra de linha.
 */
function stripTags(html: string): string {
  let out = '';
  let i = 0;

  while (i < html.length) {
    const ch = html[i];
    if (ch !== '<' || /^[\s\d=]?$/.test(html[i + 1] ?? '')) {
      out += ch;
      i += 1;
      continue;
    }

    const end = html.indexOf('>', i + 1);
    if (end === -1) break; // tag sem fechamento: descarta o resto
    if (/^<br[\s/>]/i.test(html.slice(i, end + 1))) out += '\n';
    i = end + 1;
  }

  return out;
}

/** Tira as tags de um trecho de HTML e decodifica as entidades. `<br>` vira quebra de linha. */
export function htmlToText(html: string): string {
  return decodeEntities(stripTags(html))
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
