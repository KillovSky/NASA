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
  - [O que mudou na v2](#o-que-mudou-na-v2)
  - [Uso (TypeScript / ESM)](#uso-typescript--esm)
  - [Uso (CommonJS)](#uso-commonjs)
  - [CLI](#cli)
  - [Opções (`ApodOptions`)](#opções-apodoptions)
  - [Formato da resposta (`ApodResponse`)](#formato-da-resposta-apodresponse)
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

## O que mudou na v2

- Reescrito em TypeScript, compilado para ESM + CommonJS + `.d.ts`.
- `https.get` manual trocado por `fetch` nativo (Node ≥ 18), sem dependências.
- Lógica de correção de datas (`YYYY-MM-DD`, limite 1996–hoje) extraída para uma função mais pura e testável (`normalizeDate`), mas com o mesmo comportamento defensivo do módulo v1.x.x.
- Download de imagem/thumbnail reescrito com `fetch` + `fs` (antes usava `http`/`https` manual), agora com validação de caminho e de protocolo (veja [Segurança](#segurança)).
- CLI própria (`nasa-apod`).

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

```bash
nasa-apod
nasa-apod --date 2024-01-01
nasa-apod --download --path ./pics
nasa-apod --json
nasa-apod --help
```

| Opção             | Descrição                                                       |
| ----------------- | ------------------------------------------------------------------ |
| `--key <apiKey>`  | Chave da API da NASA (padrão: `DEMO_KEY`, com limite de requisições). |
| `--date <data>`   | Data no formato `YYYY-MM-DD` (padrão: hoje).                       |
| `--download`      | Baixa a imagem/miniatura para o disco.                              |
| `--path <pasta>`  | Pasta de destino do download (padrão: `./NASA_IMAGES/`).           |
| `--json`          | Imprime a resposta `ApodResponse` completa, em JSON.                |
| `-h`, `--help`    | Mostra a mensagem de ajuda.                                         |

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
| `nasa`       | `ApodData`                      | Os dados brutos retornados pela API da NASA (título, explicação, URLs, etc.). |

```ts
const apod = await getAPOD({ date: '2024-01-01' });

if (apod.error) {
  console.error(apod.error_msg);
} else {
  console.log(apod.nasa.title);
  console.log(apod.nasa.explanation);
  console.log(apod.best_image); // HD, padrão, ou miniatura de vídeo — o que estiver disponível
}
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
