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
  /** Os dados brutos retornados pela API da NASA. */
  nasa: ApodData;
}
