/** O APOD começa em junho de 1995; o módulo aceita a partir de 1996 desde a v1. */
export const MIN_YEAR = 1996;

/** Data já corrigida e, se algo foi ajustado, um aviso dizendo o quê. */
export interface NormalizedDate {
  date: string;
  warning: string | null;
}

function todayParts(): [string, string, string] {
  const iso = new Date().toISOString().split('T')[0];
  return iso.split('-') as [string, string, string];
}

/** Dias de um mês, contando ano bissexto. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Confere uma data `YYYY-MM-DD` contra o intervalo do APOD. O que estiver fora do
 * intervalo, mal formado ou inexistente (como 2024-02-30) é corrigido, com um aviso.
 */
export function normalizeDate(input: string): NormalizedDate {
  const [ty, tm, td] = todayParts();
  const todayDate = `${ty}-${tm}-${td}`;

  if (!input) {
    return { date: todayDate, warning: null };
  }

  if (!input.includes('-')) {
    return {
      date: todayDate,
      warning: `Data "${input}" não está no formato esperado (YYYY-MM-DD), usando a data de hoje (${todayDate}) na requisição...`,
    };
  }

  const parts = input.split('-');
  if (parts.length !== 3) {
    return { date: todayDate, warning: 'Data inválida, por favor insira no formato -> YYYY-MM-DD' };
  }

  let [y, m, d] = parts;
  let warning: string | null = null;

  const yNum = Number(y);
  const mNum = Number(m);
  const dNum = Number(d);

  if (!Number.isFinite(yNum) || yNum > Number(ty) || yNum < MIN_YEAR) {
    warning = `Ano inválido, o ano mínimo é "${MIN_YEAR}" e o máximo é ${ty}, usando ${ty} na requisição...`;
    y = ty;
  }

  if (!Number.isFinite(mNum) || mNum < 1 || mNum > 12 || (y === ty && mNum > Number(tm))) {
    const msg = `Mês inválido, você definiu uma data futura, o mês máximo neste ano é ${tm}, usando ${tm} na requisição...`;
    warning = warning ? `${warning}\n${msg}` : msg;
    m = tm;
  }

  // `new Date('2024-02-30')` não dá erro, vira 1º de março. Por isso o dia é
  // conferido contra a quantidade real de dias do mês.
  const maxDayInMonth = daysInMonth(Number(y), Number(m));

  if (!Number.isFinite(dNum) || dNum < 1 || dNum > maxDayInMonth || (y === ty && m === tm && dNum > Number(td))) {
    const limit = y === ty && m === tm ? td : String(maxDayInMonth).padStart(2, '0');
    const msg = `Dia inválido, o dia máximo para ${y}-${String(m).padStart(2, '0')} é ${limit}, usando ${limit} na requisição...`;
    warning = warning ? `${warning}\n${msg}` : msg;
    d = limit;
  }

  const candidate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  if (Number.isNaN(new Date(candidate).getTime())) {
    return { date: todayDate, warning: 'Data inválida, por favor insira no formato -> YYYY-MM-DD' };
  }

  return { date: candidate, warning };
}

/**
 * Converte `YYYY-MM-DD` para o código `YYMMDD` que a API nova usa nas rotas e nos
 * filtros (`2026-09-11` vira `260911`). Devolve `null` se a data não tiver esse formato.
 */
export function toLegacyDate(isoDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return match ? `${match[1].slice(2)}${match[2]}${match[3]}` : null;
}
