# Changelog

As mudanças notáveis do projeto ficam neste arquivo.
O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [3.0.0] - 2026-11-15

A NASA migrou o APOD para a API do WordPress (`science.nasa.gov/wp-json/wp/v2/apod-basic`) e vai desligar a antiga em 1º de dezembro de 2026. Esta versão passa a usar a nova.

### Alterado
- Todas as requisições vão para `https://science.nasa.gov/wp-json/wp/v2/apod-basic`. A chave de API deixou de ser necessária; `apiKey` continua aceita e, se informada, é enviada como `api_key`.
- Data única: usa a rota `/apod-basic/{YYMMDD}`. Sem data, pede `?per_page=1` para pegar o APOD mais recente.
- `getAPODBulk()` com `startDate`/`endDate` usa `date_from`/`date_to` e percorre as páginas de 25 itens. Os resultados vêm em ordem crescente de data.
- `nasa.url` agora é a página do APOD (igual a `nasa.permalink`) e não o arquivo da imagem. `best_image` usa `hdurl`.
- `explanation` e `credit` chegam em HTML, como a API entrega.
- Erros do WordPress (`{ code, message }`) são lidos em `error_msg` e `dev_msg`. Resposta que não é JSON, como uma página 502, também vira erro com o status.
- Quando a requisição falha, o download não é mais tentado.
- Os exemplos de `src/fallbackApods.json` foram trocados por APODs reais no formato novo.
- O código foi reorganizado em `api.ts`, `apod.ts`, `bulk.ts`, `download.ts`, `media.ts` e `text.ts`. O objeto `_internal` e o ciclo de importação entre `index.ts` e `bulk.ts` deixaram de existir.
- Os testes foram reescritos para o formato novo.

### Adicionado
- Campos novos em `nasa`: `post_id`, `permalink`, `alt`, `basic_html`, `basic_html_url`, `explanation_text`, `credit_text` e `video_url`.
- `video_url` é lido de `basic_html` (MP4 da NASA ou iframe do YouTube/Vimeo).
- Exportações novas: `toLegacyDate()` e `htmlToText()`.
- Download: confere o status HTTP antes de gravar o arquivo.

### Segurança
- `htmlToText()` remove tags com uma passada pelos caracteres, e não com `replace` e regex, que deixava sobrar tags em entradas como `<<b>script>` (CodeQL #2).

### Removido
- `service_version` e `thumbnail_url`. A API nova não oferece `concept_tags`, `hd` nem `thumbs`.

[3.0.0]: https://github.com/KillovSky/NASA/releases/tag/v3.0.0

## [2.0.1] - 2026-09-08

### Segurança
- Corrigida a regex de `vimeoThumbnail` que podia ficar lenta com entradas montadas de propósito (ReDoS), apontada pelo [CodeQL #1](https://github.com/KillovSky/NASA/security/code-scanning/1).

### Adicionado
- `getAPODBulk()`: busca várias datas, por intervalo (`startDate`/`endDate`) ou por lista (`dates`), com limite de tamanho (`MAX_BULK_DATES`) e de concorrência (`MAX_BULK_CONCURRENCY`). Também na CLI, com `--start`, `--end`, `--dates`, `--max` e `--concurrency`.
- Quando a requisição falha, `nasa` e `best_image` recebem um APOD de exemplo e `fallback` fica `true`, como na 1.x.

[2.0.1]: https://github.com/KillovSky/NASA/releases/tag/v2.0.1

## [2.0.0] - 2026-09-08

### Segurança
- O nome do arquivo baixado só aceita datas no formato `YYYY-MM-DD`, e o caminho final é conferido contra a pasta de destino.
- Só URLs `http:` e `https:` são baixadas.
- A regex de `youtubeThumbnail` foi reescrita para não ter custo polinomial.

### Adicionado
- Reescrita em TypeScript, com ESM, CommonJS e `.d.ts`.
- CLI `nasa-apod`.
- Download da imagem para o disco.
- Miniatura automática para vídeos do YouTube e do Vimeo.
- Testes com `node:test` e CI no GitHub Actions.

### Alterado
- `https.get` foi trocado por `fetch`, que exige Node 18 ou mais novo.
- A correção de datas virou a função `normalizeDate`.

[2.0.0]: https://github.com/KillovSky/NASA/releases/tag/v2.0.0
