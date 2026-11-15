/** Descrição de um código de status HTTP (tabela em httpCodes.json). */
export interface HttpCodeExplain {
  code: string;
  why: string;
}

/**
 * Um APOD como a API da NASA devolve, mais alguns campos calculados pelo módulo
 * (`explanation_text`, `credit_text` e `video_url`). Campo ausente vira `false`.
 */
export interface ApodData {
  /** Data do APOD, `YYYY-MM-DD`. */
  date: string | false;
  /** ID do post no WordPress da NASA. */
  post_id: number | false;
  title: string | false;
  /** Endereço da página do APOD em science.nasa.gov. */
  permalink: string | false;
  /** `image`, `video` ou `iframe`. */
  media_type: string | false;
  /** Explicação como vem da API, em HTML. */
  explanation: string | false;
  /** A mesma explicação em texto puro, sem o rótulo "Explanation:" e sem a dica do dia seguinte. */
  explanation_text: string | false;
  /** Crédito como vem da API, pode conter HTML. */
  credit: string | false;
  credit_text: string | false;
  copyright: string | false;
  /** Texto alternativo da imagem. */
  alt: string | false;
  /** Na API nova, igual ao `permalink`: é a página do post, não a imagem. */
  url: string | false;
  /** Imagem em tamanho grande. Em vídeos, é a imagem de capa. */
  hdurl: string | false;
  /** Documento HTML completo da página, como string. */
  basic_html: string | false;
  basic_html_url: string | false;
  /** Endereço do vídeo (MP4 ou iframe), extraído de `basic_html`. */
  video_url: string | false;
  [key: string]: unknown;
}

export interface ApodOptions {
  /** Opcional. A API nova não exige chave; se vier preenchida, é enviada como `api_key`. */
  apiKey?: string;
  /** `YYYY-MM-DD`. Sem data, busca o APOD mais recente. Datas inválidas são corrigidas e avisadas em `data_msg`. */
  date?: string;
  /** Baixa a imagem para o disco. */
  download?: boolean;
  /** Pasta do download. Padrão: `./NASA_IMAGES/`. */
  downloadPath?: string;
  /** Tempo limite da requisição, em ms. Padrão: 15000. */
  timeout?: number;
}

export interface ApodResponse {
  date: string;
  error: boolean;
  code: number | string;
  explain: HttpCodeExplain | undefined;
  /** Código técnico do erro, quando a API informa um (ex.: `rest_no_route`). */
  dev_msg: string | false;
  /** Aviso quando a data pedida precisou ser corrigida. */
  data_msg: string | false;
  error_msg: string | false;
  /** Melhor imagem disponível: `hdurl` ou, na falta dela, a miniatura de um vídeo do YouTube/Vimeo. */
  best_image: string | false;
  /** Resultado do download, quando `download: true`. */
  download: string | false;
  /** `true` quando `nasa` é um exemplo embutido no módulo porque a requisição falhou. */
  fallback: boolean;
  nasa: ApodData;
}

/** Máximo de datas por chamada de `getAPODBulk()`. */
export const MAX_BULK_DATES = 366;

/** Máximo de requisições simultâneas em `getAPODBulk({ dates })`. */
export const MAX_BULK_CONCURRENCY = 10;

export interface ApodBulkOptions {
  apiKey?: string;
  /** Datas avulsas (`YYYY-MM-DD`). Use isto ou `startDate`/`endDate`, nunca os dois. Repetidas são ignoradas. */
  dates?: string[];
  /** Início de um intervalo contínuo. */
  startDate?: string;
  /** Fim do intervalo. Padrão: hoje. */
  endDate?: string;
  /** Limite de datas nesta chamada. Nunca passa de `MAX_BULK_DATES`. */
  maxDates?: number;
  /** Requisições simultâneas ao usar `dates`. Nunca passa de `MAX_BULK_CONCURRENCY`. */
  concurrency?: number;
  /** Tempo limite de cada requisição, em ms. Padrão: 15000. */
  timeout?: number;
}

export interface ApodBulkItem {
  date: string;
  response: ApodResponse;
}

export interface ApodBulkResponse {
  results: ApodBulkItem[];
  /** Quantas datas entraram no lote, já sem repetidas e dentro do limite. */
  requested: number;
  /** Quantas dessas terminaram com `error: true`. */
  failed: number;
  /** `true` se o pedido passou do limite e foi cortado. */
  truncated: boolean;
}
