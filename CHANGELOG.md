# Changelog

Todas as mudanças notáveis deste projeto são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/),
e este projeto segue [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [2.0.0] - 2026-09-08

### Segurança
- **Path injection no download de imagem**: `dateForFilename` (usado para nomear o arquivo salvo em `downloadImage()`) vinha direto de `nasa.date`, um campo da resposta da API — dado de rede, não confiável. Um valor malformado (ex.: `"../../../../etc/cron.d/x"`) podia, em tese, escrever fora da pasta de destino. Agora esse valor é validado estritamente contra `^\d{4}-\d{2}-\d{2}$` antes de virar parte do caminho, com fallback para um timestamp gerado localmente, e há uma checagem adicional garantindo que o caminho final permanece dentro da pasta de destino.
- **Download de URL sem validar protocolo**: `response.best_image` (derivado da resposta da API) era passado direto para `fetch()`, sem checar o esquema da URL. Agora só `http:`/`https:` são aceitos antes de qualquer requisição.
- **Regex polinomial em dado não confiável (ReDoS)**: `youtubeThumbnail()` usava uma regex com `.*` no início *e* no fim combinado com alternação sobre a URL do vídeo (dado de rede), o que pode degradar para tempo polinomial em entradas adversariais. Reescrita para uma forma linear equivalente, sem as âncoras `.*` desnecessárias.
- `date` agora também passa por `encodeURIComponent()` ao montar a URL da requisição (por consistência e defesa em profundidade; `apiKey` já era codificada).

### Adicionado
- Reescrita completa em TypeScript, compilado para ESM + CommonJS + `.d.ts`.
- CLI própria (`nasa-apod`).
- Suporte a download da imagem/miniatura para o disco.
- Derivação automática de miniatura para vídeos do YouTube/Vimeo quando a NASA não fornece uma.
- Suíte de testes (`tests/*.test.ts`, `node:test` via `tsx`) cobrindo `normalizeDate`, `getAPOD` (sucesso, erros da API, falha de rede, derivação de thumbnail de vídeo) e `downloadImage`, incluindo testes de regressão explícitos para as três correções de segurança acima.
- `youtubeThumbnail`/`vimeoThumbnail` agora são exportados publicamente (antes eram funções internas), para permitir testá-los isoladamente e reutilizá-los fora do fluxo de `getAPOD()`.
- `normalizeDate`/`MIN_YEAR`/`NormalizedDate` agora são exportados publicamente pelo pacote.
- Workflow de CI (`.github/workflows/ci.yml`) rodando a suíte de testes em matriz de Node 18/20/22/24 a cada push/PR.
- Workflow de publish (`.github/workflows/publish.yml`) para publicar no npm a partir de uma release do GitHub.
- Documentação de comunidade: `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CITATION.cff`, templates de issue e de pull request.

### Alterado
- `https.get` manual trocado por `fetch` nativo (Node ≥ 18), sem dependências de execução.
- Lógica de correção de datas (`YYYY-MM-DD`, limite 1996–hoje) extraída para uma função pura (`normalizeDate`), com o mesmo comportamento defensivo do módulo original.
- `npm test` deixou de executar uma chamada real à API da NASA (`node dist/cli.js --date ... --json`) e passou a rodar a suíte de testes de verdade, sem tocar rede.

[2.0.0]: https://github.com/KillovSky/NASA/releases/tag/v2.0.0
