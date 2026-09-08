/** Entrada de explicação de um status HTTP. */
export interface HttpCodeExplain {
  code: string;
  why: string;
}

/** Dados brutos da "Foto Astronômica do Dia" (APOD), como devolvidos pela API da NASA. */
export interface ApodData {
  /** Data da foto, no formato `YYYY-MM-DD`. */
  date: string | false;
  /** Explicação/texto descritivo escrito pelos astrônomos da NASA. */
  explanation: string | false;
  /** URL da imagem em alta resolução, quando disponível. */
  hdurl: string | false;
  /** Tipo de mídia: `"image"` ou `"video"`. */
  media_type: string | false;
  /** Versão do serviço da API da NASA. */
  service_version: string | false;
  /** Título da foto/vídeo do dia. */
  title: string | false;
  /** URL da imagem (ou vídeo) em resolução padrão. */
  url: string | false;
  /** Créditos de direitos autorais, quando aplicável. */
  copyright: string | false;
  /** URL da miniatura, gerada automaticamente para vídeos do YouTube/Vimeo quando a NASA não fornece uma. */
  thumbnail_url: string | false;
  [key: string]: unknown;
}

/** Opções aceitas por `getAPOD()`. */
export interface ApodOptions {
  /** Chave da API da NASA. Padrão: a chave pública `DEMO_KEY` (com limite de requisições). */
  apiKey?: string;
  /** Data no formato `YYYY-MM-DD`. Padrão: hoje. Datas inválidas/fora do intervalo são corrigidas automaticamente. */
  date?: string;
  /** Quando `true`, baixa a imagem (ou miniatura, para vídeos) para o disco. */
  download?: boolean;
  /** Pasta de destino dos downloads. Padrão: `./NASA_IMAGES/`. */
  downloadPath?: string;
  /** Timeout da requisição, em milissegundos. Padrão: 15000. */
  timeout?: number;
}

/** O objeto de resposta completo retornado por `getAPOD()`. */
export interface ApodResponse {
  date: string;
  error: boolean;
  code: number | string;
  explain: HttpCodeExplain | undefined;
  dev_msg: string | false;
  data_msg: string | false;
  error_msg: string | false;
  /** A melhor URL de imagem disponível: HD para fotos, miniatura para vídeos. */
  best_image: string | false;
  /** Mensagem de status do download, quando `download: true` foi usado. */
  download: string | false;
  /**
   * `true` quando `nasa` não veio da API (a requisição falhou, deu timeout, ou a API
   * retornou algo inesperado) e foi preenchido com um exemplo real de APOD para que a
   * resposta continue útil e utilizável mesmo em caso de erro. Confira `error`/`error_msg`
   * para saber o que de fato deu errado.
   */
  fallback: boolean;
  /**
   * Os dados retornados pela API da NASA. Se a requisição falhar (`error: true`), este
   * campo é preenchido com um exemplo real de APOD (e `fallback` fica `true`) em vez de
   * ficar vazio, para que o consumidor do módulo sempre receba uma resposta funcional.
   */
  nasa: ApodData;
}

/** Limite máximo de datas aceitas em uma única chamada a `getAPODBulk()`. */
export const MAX_BULK_DATES = 366;

/** Limite máximo de requisições feitas em paralelo por `getAPODBulk()`. */
export const MAX_BULK_CONCURRENCY = 10;

/** Opções aceitas por `getAPODBulk()`. */
export interface ApodBulkOptions {
  /** Chave da API da NASA. Padrão: a chave pública `DEMO_KEY` (com limite de requisições). */
  apiKey?: string;
  /**
   * Lista de datas específicas (`YYYY-MM-DD`), para lotes não-contíguos — ex.:
   * `['2024-01-01', '2024-06-15', '2023-12-25']`. Use isso OU `startDate`/`endDate`,
   * não ambos. Duplicatas são removidas automaticamente. Limitado a `MAX_BULK_DATES`
   * datas por chamada.
   */
  dates?: string[];
  /**
   * Início de um intervalo contínuo de datas (`YYYY-MM-DD`), usado com `endDate`.
   * Quando ambos são informados, o pacote faz uma única requisição à API da NASA
   * (usando os parâmetros nativos `start_date`/`end_date`), muito mais eficiente e
   * responsável com a cota de requisições do que uma chamada por dia.
   */
  startDate?: string;
  /** Fim do intervalo, usado com `startDate`. Padrão: hoje. */
  endDate?: string;
  /**
   * Tamanho máximo do lote de fato aceito nesta chamada. Nunca pode passar de
   * `MAX_BULK_DATES`; serve para o consumidor impor um limite mais baixo ainda,
   * se quiser. Padrão: `MAX_BULK_DATES`.
   */
  maxDates?: number;
  /**
   * Quantas datas são buscadas em paralelo, quando `dates` é usado (`startDate`/`endDate`
   * sempre vira uma única requisição, então isso não se aplica a esse caso). Nunca pode
   * passar de `MAX_BULK_CONCURRENCY`, para não sobrecarregar a API da NASA nem estourar o
   * limite de requisições por hora da `apiKey`. Padrão: `MAX_BULK_CONCURRENCY`.
   */
  concurrency?: number;
  /** Timeout de cada requisição individual, em milissegundos. Padrão: 15000. */
  timeout?: number;
}

/** Uma entrada do resultado de `getAPODBulk()`: a data pedida, mais a resposta correspondente. */
export interface ApodBulkItem {
  /** A data efetivamente associada a este item (`YYYY-MM-DD`). */
  date: string;
  /** A resposta para esta data — tem exatamente a mesma forma do retorno de `getAPOD()`. */
  response: ApodResponse;
}

/** O objeto de resposta completo retornado por `getAPODBulk()`. */
export interface ApodBulkResponse {
  /** Uma entrada por data pedida (após dedupe/limite), na ordem em que foram resolvidas. */
  results: ApodBulkItem[];
  /** Quantas datas foram efetivamente pedidas (após dedupe e aplicação do limite). */
  requested: number;
  /** Quantas datas, dentre as pedidas, tiveram `error: true` na resposta. */
  failed: number;
  /**
   * `true` se o lote pedido excedia o limite máximo (`maxDates`/`MAX_BULK_DATES`) e
   * precisou ser cortado. Quando `true`, `results` cobre só as primeiras `requested` datas.
   */
  truncated: boolean;
}

