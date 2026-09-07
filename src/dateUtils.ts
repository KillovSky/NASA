/**
 * O arquivo APOD da NASA começa em 1995, mas não tem dados para o ano inteiro,
 * então limitamos de forma conservadora o ano mínimo aceito para 1996 (assim
 * deu para manter o comportamento do módulo v1.x.x).
 */
export const MIN_YEAR = 1996;

/** Resultado de `normalizeDate()`: a data já corrigida, mais um aviso opcional explicando o que foi ajustado. */
export interface NormalizedDate {
  date: string;
  warning: string | null;
}

function todayParts(): [string, string, string] {
  const iso = new Date().toISOString().split('T')[0];
  return iso.split('-') as [string, string, string];
}

/** Quantos dias tem um mês em um determinado ano (considerando anos bissextos para fevereiro). */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Valida e normaliza uma string de data `YYYY-MM-DD` contra o intervalo suportado
 * pela NASA, ajustando para a data de hoje (e reportando um aviso) sempre que a
 * entrada estiver fora do intervalo, malformada, ou for uma data de calendário
 * que não existe (ex: "2024-02-30").
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

  // Checa contra o número real de dias do mês (considerando anos bissextos),
  // não apenas "≤ 31" — `new Date('2024-02-30')` não retorna Invalid Date, ele
  // rola silenciosamente para 1º de março, então essa validação não pode
  // depender só do parsing do `Date` no final da função.
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
