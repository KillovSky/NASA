# Contribuindo com o @killovsky/nasa

Obrigado por considerar contribuir! Este documento resume como configurar o ambiente, os padrões do projeto e como enviar mudanças.

## Antes de começar

- Dê uma olhada nas [issues abertas](https://github.com/KillovSky/NASA/issues) para não duplicar trabalho.
- Para mudanças grandes ou que alterem a API pública, abra uma issue de discussão antes de codificar — evita retrabalho.
- Leia o [Código de Conduta](./CODE_OF_CONDUCT.md).

## Requisitos

- Node.js ≥ 18 (o mesmo mínimo declarado em `engines` no `package.json`)
- npm
- Opcionalmente, uma chave de API da NASA própria (obtida em [api.nasa.gov](https://api.nasa.gov)) para testar manualmente contra a API real sem esbarrar no limite da `DEMO_KEY`

Nenhuma dependência de execução é usada no pacote publicado (`dist/`); as `devDependencies` servem só para build/testes locais.

## Configurando o ambiente

```bash
git clone https://github.com/KillovSky/NASA.git
cd NASA
npm install
```

## Fluxo de desenvolvimento

```bash
npm run dev     # tsup em modo watch, recompila a cada mudança em src/
npm run build   # build único (ESM + CJS + .d.ts) em dist/
npm test        # builda o pacote e roda a suíte de testes (node --test via tsx)
npm run test:watch
```

Os testes importam sempre de `dist/index.js` (o pacote já compilado), nunca direto de `src/*.ts` — por isso `npm test` sempre builda antes (`pretest`). Se você mudar algo em `src/` e rodar os testes sem rebuildar, vai estar testando código velho.

**Importante:** a suíte de testes **não** faz nenhuma chamada de rede de verdade — todo `fetch` é substituído (`globalThis.fetch = ...`) dentro de cada teste. Isso é proposital: testes que dependem da API real da NASA estar no ar (e não estourar o limite de requisições da `DEMO_KEY`) são frágeis e não devem rodar em CI. Se você adicionar um teste novo que precise simular uma resposta da API, siga o padrão já usado em `tests/apod.test.ts` (funções `mockSequence`/`jsonResponse`).

## Padrões do projeto

- **TypeScript estrito** — o `tsconfig.json` usa `strict: true`; evite `any` e type assertions desnecessárias.
- **Zero dependências de runtime** — não adicione nenhum pacote em `dependencies` sem discutir antes na issue/PR. O objetivo do projeto é continuar funcionando só com `fetch` nativo.
- **Cuidado extra com dados vindos da API** — qualquer campo da resposta da NASA (`nasa.date`, `nasa.url`, `nasa.hdurl`, etc.) é, por definição, dado não confiável (vem de rede). Se uma mudança fizer esse dado influenciar um caminho de arquivo (`fs.*`) ou uma nova requisição de rede (`fetch`), ela precisa validar/sanitizar esse dado antes — veja como `downloadImage()` em `src/index.ts` trata a data e a URL da imagem, e o item "Segurança" abaixo.
- **Documentação em português (pt-BR)** — comentários JSDoc, mensagens de erro e o `readme.md` seguem o padrão do projeto; mantenha consistência com o que já existe.

## Segurança

Antes de abrir um PR que toque em `downloadImage()`, no parsing da resposta da API, ou em qualquer regex aplicada a dados vindos de rede (como as de `youtubeThumbnail`/`vimeoThumbnail`), releia a seção "Superfície de risco deste pacote" em [SECURITY.md](./SECURITY.md). Padrões comuns a evitar:

- Montar um caminho de arquivo (`path.join`, `fs.writeFileSync`, etc.) a partir de uma string vinda da resposta da API sem validar o formato esperado primeiro.
- Passar uma URL vinda da resposta da API direto para `fetch()` sem checar o protocolo (`http:`/`https:`).
- Regex com quantificadores ambíguos (ex.: `.*` no início **e** no fim, ou grupos aninhados) aplicadas sobre uma string de origem externa — isso é o padrão que ferramentas como o CodeQL sinalizam como "polynomial regular expression used on uncontrolled data".

## Testes

- Cubra qualquer comportamento novo ou alterado com testes em `tests/*.test.ts`.
- Mudanças em `normalizeDate` precisam de um caso de teste cobrindo o novo comportamento em `tests/dateUtils.test.ts`.
- Mudanças em `getAPOD`/`downloadImage` precisam de um caso mockado em `tests/apod.test.ts`; se a mudança for relacionada a segurança (item acima), adicione também um teste de regressão explícito (veja os testes com prefixo `REGRESSÃO` já existentes como referência de formato).
- Rode `npm test` localmente antes de abrir o PR — o CI roda a mesma suíte.

## Enviando um Pull Request

1. Faça um fork e crie uma branch a partir de `main`: `git checkout -b minha-mudanca`.
2. Faça commits pequenos e com mensagens claras (não é obrigatório Conventional Commits, mas ajuda).
3. Garanta que `npm test` passa.
4. Abra o PR preenchendo o [template](./.github/PULL_REQUEST_TEMPLATE/pull_request_template.md) — descreva o que mudou, por quê, e como testar.
5. Atualize o `readme.md` se a mudança afetar a API pública, a CLI ou o comportamento documentado.

## Reportando bugs e sugerindo funcionalidades

Use os templates de issue do GitHub (bug ou funcionalidade). Para vulnerabilidades de segurança, **não abra uma issue pública** — siga o processo descrito em [SECURITY.md](./SECURITY.md).

## Dúvidas

Se algo aqui não estiver claro, abra uma issue com a tag `question` ou use um dos canais listados no template de issues.
