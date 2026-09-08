# @killovsky/nasa

[![npm version](https://img.shields.io/npm/v/@killovsky/nasa.svg)](https://www.npmjs.com/package/@killovsky/nasa)
[![CI](https://github.com/KillovSky/NASA/actions/workflows/ci.yml/badge.svg)](https://github.com/KillovSky/NASA/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/@killovsky/nasa.svg)](https://www.npmjs.com/package/@killovsky/nasa)
[![license](https://img.shields.io/npm/l/@killovsky/nasa.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@killovsky/nasa.svg)](./package.json)

Cliente para a API **APOD** (Astronomy Picture of the Day) da NASA — sem dependências de terceiros, com CLI e suporte completo a TypeScript/ESM/CommonJS.

## Índice

- [@killovsky/nasa](#killovskynasa)
  - [Índice](#índice)
  - [Instalação](#instalação)
  - [Uso (TypeScript / ESM)](#uso-typescript--esm)
  - [Uso (CommonJS)](#uso-commonjs)
  - [CLI](#cli)
  - [Opções (`ApodOptions`)](#opções-apodoptions)
  - [Formato da resposta (`ApodResponse`)](#formato-da-resposta-apodresponse)
  - [Requisição em lote (`getAPODBulk`)](#requisição-em-lote-getapodbulk)
  - [Download de imagens](#download-de-imagens)
  - [Vídeos (YouTube/Vimeo) e geração de miniatura](#vídeos-youtubevimeo-e-geração-de-miniatura)
  - [Tratamento de erros](#tratamento-de-erros)
  - [Segurança](#segurança)
  - [Contribuindo](#contribuindo)
  - [Changelog](#changelog)
  - [Licença](#licença)

## Instalação

```bash
npm i @killovsky/nasa
npm i -g @killovsky/nasa   # para usar a CLI globalmente
```

## Uso (TypeScript / ESM)

```ts
import { getAPOD } from '@killovsky/nasa';

const apod = await getAPOD({ apiKey: 'DEMO_KEY', date: '2024-01-01' });
console.log(apod.nasa.title, apod.best_image);
```

## Uso (CommonJS)

```js
const { getAPOD } = require('@killovsky/nasa');
getAPOD().then((apod) => console.log(apod.best_image));
```

## CLI
- No powershell existe um problema ao usar "," nas datas, para se assegurar da busca correta de multiplas datas, insira as datas dentro de aspas duplas. Isso corrige.

```bash
nasa-apod
nasa-apod --date 2024-01-01
nasa-apod --download --path ./pics
nasa-apod --json
nasa-apod --start 2024-01-01 --end 2024-01-07 --json
nasa-apod --dates "2024-01-01,2023-05-05,2022-12-25"
nasa-apod --help
```

| Opção                | Descrição                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `--key <apiKey>`      | Chave da API da NASA (padrão: `DEMO_KEY`, com limite de requisições). |
| `--date <data>`       | Data no formato `YYYY-MM-DD` (padrão: hoje).                       |
| `--download`          | Baixa a imagem/miniatura para o disco.                              |
| `--path <pasta>`      | Pasta de destino do download (padrão: `./NASA_IMAGES/`).           |
| `--start <data>`      | Início de um intervalo contínuo, usado com `--end` (lote).          |
| `--end <data>`        | Fim do intervalo (padrão: hoje).                                    |
| `--dates <lista>`     | Datas específicas separadas por vírgula (lote).                    |
| `--max <n>`           | Limite de datas no lote (padrão/teto: 366).                        |
| `--concurrency <n>`   | Requisições em paralelo ao usar `--dates` (padrão/teto: 10).        |
| `--json`              | Imprime a resposta completa, em JSON.                               |
| `-h`, `--help`        | Mostra a mensagem de ajuda.                                         |

`--start`/`--end`/`--dates` ativam o modo de lote (veja [Requisição em lote](#requisição-em-lote-getapodbulk)); sem eles, a CLI busca uma única data.

## Opções (`ApodOptions`)

| Campo          | Tipo      | Padrão              | Descrição                                    |
| -------------- | --------- | ------------------- | ---------------------------------------------- |
| `apiKey`       | `string`  | `"DEMO_KEY"`        | Chave da API da NASA (obtenha uma em [api.nasa.gov](https://api.nasa.gov) — a `DEMO_KEY` pública tem limite de requisições compartilhado). |
| `date`         | `string`  | hoje                | Data `YYYY-MM-DD` (corrigida automaticamente, com aviso em `data_msg`, se fora do intervalo 1996–hoje ou malformada). |
| `download`     | `boolean` | `false`             | Baixa a imagem (ou thumbnail, para vídeos) para o disco. |
| `downloadPath` | `string`  | `"./NASA_IMAGES/"`  | Pasta de destino do download.                  |
| `timeout`      | `number`  | `15000`             | Timeout da requisição, em ms.                  |

## Formato da resposta (`ApodResponse`)

`getAPOD()` **nunca lança exceção** — falhas de rede, timeout, erros da API da NASA (chave inválida, limite de requisições excedido, etc.) e dados malformados são todos capturados e refletidos no próprio objeto de retorno:

| Campo        | Tipo                          | Descrição                                                                 |
| ------------ | ------------------------------ | -------------------------------------------------------------------------- |
| `date`       | `string`                       | Data efetivamente usada na requisição (`YYYY-MM-DD`).                     |
| `error`      | `boolean`                       | `true` se a requisição falhou ou a NASA retornou um erro.                 |
| `code`       | `number \| string`              | Código de status HTTP (ou código de erro de rede, ex.: `"ECONNREFUSED"`). |
| `explain`    | `HttpCodeExplain \| undefined`  | Explicação legível do código de status, vinda de uma tabela embutida no pacote. |
| `dev_msg`    | `string \| false`               | Código de erro técnico da API da NASA, quando presente.                    |
| `data_msg`   | `string \| false`               | Aviso sobre correção automática da `date` (ex.: data futura ajustada para hoje). |
| `error_msg`  | `string \| false`               | Mensagem de erro legível, quando `error` é `true`.                        |
| `best_image` | `string \| false`               | A melhor URL de imagem disponível: HD para fotos, miniatura para vídeos.  |
| `download`   | `string \| false`               | Mensagem de status do download, quando `download: true` foi usado.        |
| `fallback`   | `boolean`                       | `true` quando `nasa` não veio da API e foi preenchido com um exemplo, para a resposta continuar útil mesmo com erro — veja [Resposta sempre útil, mesmo com erro](#resposta-sempre-útil-mesmo-com-erro). |
| `nasa`       | `ApodData`                      | Os dados da API da NASA (título, explicação, URLs, etc.) — ou um exemplo, quando `fallback` é `true`. |

```ts
const apod = await getAPOD({ date: '2024-01-01' });

if (apod.error) {
  console.error(apod.error_msg); // Os valores como "apod.nasa" ainda estarão disponiveis em modo fallback
} else {
  console.log(apod.nasa.title);
  console.log(apod.nasa.explanation);
  console.log(apod.best_image); // HD, padrão, ou miniatura de vídeo — o que estiver disponível
}
```

- Em casos de falhas, o sistema devolve um objeto JSON válido com dados reais da NASA, serve como uma resposta de fallback que evita que dados invalidos sejam usados por aplicativos que usem esse módulo.

```ts
const apod = await getAPOD({ apiKey: 'chave-invalida' });

console.log(apod.error);      // true
console.log(apod.fallback);   // true
console.log(apod.nasa.title); // "SpaceX Rocket Launch Plume over California" (ou outro exemplo)
console.log(apod.best_image); // uma URL de imagem real, utilizável — nunca `false` só por causa do erro
```

Isso é útil para qualquer interface (um app, um bot, um bloco de "foto do dia" em uma página) que prefere sempre ter algo para mostrar em vez de lidar com um estado vazio só porque a API da NASA teve um problema momentâneo.

## Requisição em lote (`getAPODBulk`)

Para buscar várias datas de uma vez, de forma segura e responsável com a cota de requisições da API da NASA:

```ts
import { getAPODBulk } from '@killovsky/nasa';

// Intervalo contínuo — vira 1 única requisição HTTP (start_date/end_date nativos da API)
const week = await getAPODBulk({ startDate: '2024-01-01', endDate: '2024-01-07' });

// Datas específicas, não-contíguas — busca em paralelo, com concorrência limitada
const picks = await getAPODBulk({ dates: ['2024-01-01', '2024-06-15', '2023-12-25'] });

for (const { date, response } of week.results) {
  if (response.error) {
    console.error(date, response.error_msg);
  } else {
    console.log(date, response.nasa.title, response.best_image);
  }
}

console.log(`${week.requested} pedidas, ${week.failed} com erro, truncado: ${week.truncated}`);
```

Use **`dates`** OU **`startDate`/`endDate`**, nunca os dois na mesma chamada (`getAPODBulk` lança `TypeError` se você tentar).

| Campo         | Tipo       | Padrão | Descrição                                                                 |
| ------------- | ---------- | ------ | -------------------------------------------------------------------------- |
| `apiKey`      | `string`   | `"DEMO_KEY"` | Igual a `getAPOD()`.                                                  |
| `dates`       | `string[]` | —      | Lista de datas específicas. Duplicatas são removidas automaticamente.       |
| `startDate`   | `string`   | —      | Início de um intervalo contínuo, usado com `endDate`.                      |
| `endDate`     | `string`   | hoje   | Fim do intervalo, usado com `startDate`.                                    |
| `maxDates`    | `number`   | `366`  | Teto de datas no lote. Nunca passa de `MAX_BULK_DATES` (366), mesmo se você pedir mais. |
| `concurrency` | `number`   | `10`   | Requisições em paralelo (só se aplica ao caminho `dates`). Nunca passa de `MAX_BULK_CONCURRENCY` (10). |
| `timeout`     | `number`   | `15000`| Timeout de cada requisição individual, em ms.                              |

O formato da CLI equivalente:

```bash
nasa-apod --start 2024-01-01 --end 2024-01-07 --json
nasa-apod --dates 2024-01-01,2023-05-05,2022-12-25 --concurrency 5
```

## Download de imagens

```ts
const apod = await getAPOD({ download: true, downloadPath: './fotos' });
console.log(apod.download); // "Download concluído, salvo em fotos/2024-01-01.jpg"
```

- Se `downloadPath` não for informado, a pasta padrão `./NASA_IMAGES/` é criada automaticamente.
- Se a imagem daquela data já tiver sido baixada antes, o download é pulado (sem sobrescrever).
- O nome do arquivo é sempre `<data>.jpg`, onde `<data>` é validada antes de virar parte do caminho — veja [Segurança](#segurança).

## Vídeos (YouTube/Vimeo) e geração de miniatura

Quando o APOD do dia é um vídeo (`media_type: "video"`) e a NASA não retorna uma `thumbnail_url` própria, o pacote deriva uma automaticamente a partir da URL do vídeo, para YouTube e Vimeo:

```ts
import { youtubeThumbnail, vimeoThumbnail } from '@killovsky/nasa';

youtubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
// => 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg'

vimeoThumbnail('https://vimeo.com/927766087');
// => 'https://vumbnail.com/927766087.jpg'
```

Essa miniatura (quando derivada) também vira `best_image` automaticamente, já que não existe uma "URL de imagem HD" para um vídeo.

## Tratamento de erros

`getAPOD()` é desenhada para nunca lançar (`throw`) — confira sempre `error`/`error_msg` em vez de usar `try/catch`:

```ts
const apod = await getAPOD({ apiKey: 'chave-invalida' });
if (apod.error) {
  console.error(`Erro ${apod.code}: ${apod.error_msg}`);
}
```

Isso vale tanto para erros de rede (timeout, DNS, conexão recusada) quanto para erros retornados pela própria API da NASA (chave inválida, limite de requisições excedido, data fora do intervalo suportado, etc.).

## Segurança

Este pacote pode escrever arquivos em disco (`download: true`) a partir de dados que vêm de uma resposta de rede — a resposta da API da NASA. Duas proteções relevantes:

- **Nome do arquivo**: o campo de data retornado pela API só é usado no caminho do arquivo se estiver estritamente no formato `YYYY-MM-DD`; qualquer outro valor é substituído por um nome seguro gerado localmente, e o caminho final é sempre verificado contra a pasta de destino.
- **URL da imagem**: só `http:`/`https:` são aceitos antes de qualquer `fetch()` de download; outros esquemas (como `file:`) são rejeitados.
- **Extração de ID do Vimeo**: a URL do vídeo (dado de rede, não confiável) nunca é processada com uma regex de custo não-linear. A extração do ID numérico é feita dividindo a URL por `/` e percorrendo os segmentos — uma operação O(n), sem risco de ReDoS (corrigido na 2.0.1; veja o [Changelog](#changelog)).
- **Lote de datas (`getAPODBulk`)**: tamanho de lote e concorrência são sempre limitados no lado do cliente (`MAX_BULK_DATES`, `MAX_BULK_CONCURRENCY`), mesmo se valores maiores forem pedidos explicitamente — veja [Requisição em lote](#requisição-em-lote-getapodbulk).

Para detalhes completos e como reportar uma vulnerabilidade, veja [SECURITY.md](./SECURITY.md).

## Contribuindo

Contribuições são bem-vindas! Veja o [guia de contribuição](./CONTRIBUTING.md) para configurar o ambiente, rodar os testes e o fluxo de Pull Request. Ao participar, siga o [Código de Conduta](./CODE_OF_CONDUCT.md).

Para reportar vulnerabilidades de segurança, siga o processo em [SECURITY.md](./SECURITY.md) — não abra uma issue pública.

## Changelog

Veja [CHANGELOG.md](./CHANGELOG.md) para o histórico de versões.

## Licença

MIT — veja [LICENSE](./LICENSE).

---

Este projeto não é afiliado, endossado ou patrocinado pela NASA. "NASA" e "APOD" são marcas da *National Aeronautics and Space Administration*; este pacote é apenas um cliente de código aberto para a API pública delas.
