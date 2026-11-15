# @killovsky/nasa

[![npm version](https://img.shields.io/npm/v/@killovsky/nasa.svg)](https://www.npmjs.com/package/@killovsky/nasa)
[![CI](https://github.com/KillovSky/NASA/actions/workflows/ci.yml/badge.svg)](https://github.com/KillovSky/NASA/actions/workflows/ci.yml)
[![npm downloads](https://img.shields.io/npm/dm/@killovsky/nasa.svg)](https://www.npmjs.com/package/@killovsky/nasa)
[![license](https://img.shields.io/npm/l/@killovsky/nasa.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/@killovsky/nasa.svg)](./package.json)

Cliente para o APOD (Astronomy Picture of the Day) da NASA. Não tem dependências, funciona em ESM e CommonJS, traz os tipos do TypeScript e uma CLI.

Desde a 3.0.0 o módulo usa a API nova do APOD, baseada em WordPress (`science.nasa.gov/wp-json/wp/v2/apod-basic`). A API antiga do api.nasa.gov sai do ar em 1º de dezembro de 2026. Quem vem da 2.x deve ler a seção [Migrando da 2.x](#migrando-da-2x).

## Instalação

```bash
npm i @killovsky/nasa
npm i -g @killovsky/nasa   # para usar a CLI em qualquer pasta
```

## Uso

```ts
import { getAPOD } from '@killovsky/nasa';

const apod = await getAPOD({ date: '2026-09-11' });
console.log(apod.nasa.title, apod.best_image);
```

CommonJS:

```js
const { getAPOD } = require('@killovsky/nasa');
getAPOD().then((apod) => console.log(apod.best_image));
```

Sem `date`, `getAPOD()` traz o APOD mais recente.

## CLI

```bash
nasa-apod
nasa-apod --date 2026-09-11
nasa-apod --download --path ./fotos
nasa-apod --json
nasa-apod --start 2026-09-01 --end 2026-09-07 --json
nasa-apod --dates "2026-09-01,2025-05-05,2024-12-25"
```

No PowerShell, coloque as datas de `--dates` entre aspas por causa da vírgula.

| Opção | Descrição |
| --- | --- |
| `--key <apiKey>` | Chave da API da NASA. Opcional, a API atual não exige. |
| `--date <data>` | Data `YYYY-MM-DD`. Padrão: o APOD mais recente. |
| `--download` | Baixa a imagem para o disco. |
| `--path <pasta>` | Pasta do download. Padrão: `./NASA_IMAGES/`. |
| `--start <data>` | Início de um intervalo, usado com `--end`. |
| `--end <data>` | Fim do intervalo. Padrão: hoje. |
| `--dates <lista>` | Datas avulsas separadas por vírgula. |
| `--max <n>` | Limite de datas no lote (teto: 366). |
| `--concurrency <n>` | Requisições simultâneas com `--dates` (teto: 10). |
| `--json` | Imprime a resposta completa em JSON. |
| `-h`, `--help` | Mostra a ajuda. |

`--start`, `--end` e `--dates` ativam o modo de lote. Sem eles a CLI busca uma data só.

## Opções de `getAPOD()`

| Campo | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `date` | `string` | APOD mais recente | `YYYY-MM-DD`. Se estiver fora do intervalo 1996 até hoje ou mal formada, é corrigida e o motivo vai em `data_msg`. |
| `apiKey` | `string` | nenhum | Opcional. Se informada, é enviada como `api_key`. |
| `download` | `boolean` | `false` | Baixa a imagem para o disco. |
| `downloadPath` | `string` | `./NASA_IMAGES/` | Pasta do download. |
| `timeout` | `number` | `15000` | Tempo limite, em ms. |

## Resposta

`getAPOD()` não lança exceção. Erro de rede, tempo esgotado e erro da NASA ficam no próprio objeto:

| Campo | Descrição |
| --- | --- |
| `date` | Data do APOD (`YYYY-MM-DD`). |
| `error` | `true` se a requisição falhou. |
| `code` | Status HTTP, ou o código do erro de rede (por exemplo `ECONNREFUSED`). |
| `explain` | Explicação do status, vinda de uma tabela do pacote. |
| `error_msg` | Mensagem de erro, quando há. |
| `dev_msg` | Código técnico do erro, quando a API informa (por exemplo `rest_no_route`). |
| `data_msg` | Aviso de que a data pedida foi corrigida. |
| `best_image` | Melhor imagem disponível. |
| `download` | Resultado do download, quando pedido. |
| `fallback` | `true` se `nasa` é um exemplo embutido no pacote. |
| `nasa` | Os dados do APOD, descritos abaixo. |

Campos de `nasa`:

| Campo | Descrição |
| --- | --- |
| `date`, `post_id`, `title` | Data, ID do post no WordPress e título. |
| `media_type` | `image`, `video` ou `iframe`. |
| `explanation` | Explicação em HTML, como a API entrega. |
| `explanation_text` | A mesma explicação em texto puro, sem o rótulo "Explanation:" e sem a dica do dia seguinte. |
| `credit`, `credit_text` | Crédito em HTML e em texto puro. |
| `copyright`, `alt` | Direitos autorais e texto alternativo da imagem. |
| `permalink`, `url` | Página do APOD em science.nasa.gov. Os dois têm o mesmo valor. |
| `hdurl` | Imagem em tamanho grande. Em vídeos, é a imagem de capa. |
| `video_url` | Endereço do vídeo (MP4 ou iframe), lido de `basic_html`. `false` se não há vídeo. |
| `basic_html`, `basic_html_url` | Página completa do APOD em HTML e o endereço dela em texto puro. |

Campo que a API não mandar vira `false`. `explanation_text`, `credit_text` e `video_url` são calculados pelo módulo.

```ts
const apod = await getAPOD({ date: '2026-09-11' });

if (apod.error) {
  console.error(apod.error_msg);
  // apod.nasa tem um exemplo embutido, e apod.fallback é true
} else {
  console.log(apod.nasa.title);
  console.log(apod.nasa.explanation_text);
  console.log(apod.best_image);
}
```

Quando a requisição falha, `nasa` e `best_image` recebem um dos APODs de exemplo guardados em `src/fallbackApods.json` e `fallback` fica `true`. Assim um app que mostra a "foto do dia" sempre tem algo para exibir. Confira `error` antes de tratar o resultado como o APOD pedido.

## Vários APODs de uma vez

```ts
import { getAPODBulk } from '@killovsky/nasa';

// Intervalo: usa a listagem da API (date_from/date_to)
const week = await getAPODBulk({ startDate: '2026-09-01', endDate: '2026-09-07' });

// Datas avulsas: uma requisição por data
const picks = await getAPODBulk({ dates: ['2026-09-01', '2026-06-15', '2025-12-25'] });

for (const { date, response } of week.results) {
  if (response.error) console.error(date, response.error_msg);
  else console.log(date, response.nasa.title, response.best_image);
}

console.log(`${week.requested} pedidas, ${week.failed} com erro, cortado: ${week.truncated}`);
```

Use `dates` ou `startDate`/`endDate`, nunca os dois juntos (lança `TypeError`).

A listagem da API traz no máximo 25 itens por página, então um intervalo de 30 dias faz 2 requisições. No modo de intervalo os resultados vêm em ordem crescente de data.

| Campo | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `dates` | `string[]` | nenhum | Datas avulsas. Repetidas são ignoradas. |
| `startDate` | `string` | nenhum | Início do intervalo. |
| `endDate` | `string` | hoje | Fim do intervalo. |
| `maxDates` | `number` | `366` | Limite de datas. Nunca passa de `MAX_BULK_DATES` (366). |
| `concurrency` | `number` | `10` | Requisições simultâneas com `dates`. Nunca passa de `MAX_BULK_CONCURRENCY` (10). |
| `apiKey` | `string` | nenhum | Igual a `getAPOD()`. |
| `timeout` | `number` | `15000` | Tempo limite de cada requisição, em ms. |

Cada item de `results` tem a forma `{ date, response }`, e `response` é igual ao retorno de `getAPOD()`. Uma data com problema não derruba as outras. Se o pedido passar do limite, ele é cortado e `truncated` vem `true`.

## Download de imagens

```ts
const apod = await getAPOD({ download: true, downloadPath: './fotos' });
console.log(apod.download); // "Download concluído, salvo em ..."
```

- Sem `downloadPath`, a pasta `./NASA_IMAGES/` é criada.
- O arquivo é salvo como `<data>.jpg`. Se já existir, não é sobrescrito.
- Se a requisição à API falhou, nada é baixado.

## Vídeos

Quando `media_type` é `video` ou `iframe`, o endereço do vídeo fica em `nasa.video_url`. Os vídeos hospedados pela NASA são MP4. Se `hdurl` estiver vazio e o vídeo for do YouTube ou do Vimeo, `best_image` usa a miniatura dele. As duas funções também podem ser usadas direto:

```ts
import { youtubeThumbnail, vimeoThumbnail } from '@killovsky/nasa';

youtubeThumbnail('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
// 'https://img.youtube.com/vi/dQw4w9WgXcQ/0.jpg'

vimeoThumbnail('https://vimeo.com/927766087');
// 'https://vumbnail.com/927766087.jpg'
```

## Migrando da 2.x

- A API trocou de endereço. Chave não é mais necessária, `apiKey` continua aceita mas é opcional.
- `nasa.url` agora é a página do APOD, e não o arquivo da imagem. Para a imagem use `nasa.hdurl` ou `best_image`.
- `explanation` e `credit` agora vêm em HTML. Para texto puro use `explanation_text` e `credit_text`.
- Sem `date`, `getAPOD()` pede o APOD mais recente em vez de "hoje" em UTC, o que evita erro nas horas em que o dia UTC já virou e o APOD ainda não foi publicado.
- Campos novos: `post_id`, `permalink`, `alt`, `basic_html`, `basic_html_url`, `video_url`.
- Campos removidos: `service_version` e `thumbnail_url`. A API nova também não oferece mais `concept_tags`, `hd` nem `thumbs`.
- Em `getAPODBulk()`, intervalos grandes fazem uma requisição por página de 25 itens, e não uma só.
- Com erro, o download não é mais tentado.

## Segurança

O módulo grava arquivos em disco quando `download: true`, a partir de dados que vêm da rede:

- A data da resposta só entra no nome do arquivo se tiver o formato `YYYY-MM-DD`, e o caminho final é conferido contra a pasta de destino.
- Só URLs `http:` e `https:` são baixadas.
- O tamanho do lote e a concorrência de `getAPODBulk()` têm teto no próprio módulo.

Detalhes e como reportar uma vulnerabilidade: [SECURITY.md](./SECURITY.md).

## Contribuindo

Veja o [guia de contribuição](./CONTRIBUTING.md) e o [Código de Conduta](./CODE_OF_CONDUCT.md). O histórico de versões está em [CHANGELOG.md](./CHANGELOG.md).

## Licença

MIT, veja [LICENSE](./LICENSE).

Este projeto não é afiliado, endossado ou patrocinado pela NASA. "NASA" e "APOD" pertencem à National Aeronautics and Space Administration; este pacote é só um cliente aberto para a API pública dela.
