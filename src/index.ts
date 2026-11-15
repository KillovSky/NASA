import { HTTP_CODES } from './api.js';
import { getAPOD } from './apod.js';

export { getAPOD } from './apod.js';
export { getAPODBulk } from './bulk.js';
export { normalizeDate, toLegacyDate, MIN_YEAR } from './dateUtils.js';
export { youtubeThumbnail, vimeoThumbnail } from './media.js';
export { htmlToText } from './text.js';
export { MAX_BULK_CONCURRENCY, MAX_BULK_DATES } from './types.js';
export type { NormalizedDate } from './dateUtils.js';
export type {
  ApodBulkItem,
  ApodBulkOptions,
  ApodBulkResponse,
  ApodData,
  ApodOptions,
  ApodResponse,
  HttpCodeExplain,
} from './types.js';

/** Tabela com a explicação dos códigos de status HTTP. */
export function getHttpCodes() {
  return HTTP_CODES;
}

export default { getAPOD, getHttpCodes };
