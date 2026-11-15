# Contribuindo

Obrigado pelo interesse! Aqui está o que você precisa para rodar o projeto e enviar mudanças.

Antes de começar, dê uma olhada nas [issues abertas](https://github.com/KillovSky/NASA/issues). Se a mudança for grande ou alterar a API pública, abra uma issue antes para conversarmos. E leia o [Código de Conduta](./CODE_OF_CONDUCT.md).

## Ambiente

Você precisa do Node.js 18 ou mais novo e do npm.

```bash
git clone https://github.com/KillovSky/NASA.git
cd NASA
npm install
```

## Comandos

```bash
npm run dev          # recompila a cada mudança em src/
npm run build        # gera dist/ (ESM, CJS e .d.ts)
npm test             # compila e roda os testes
npm run test:watch
```

Os testes importam de `dist/`, não de `src/`. Por isso `npm test` compila antes. Se rodar os testes sem compilar, você testa o código antigo.

Os testes não acessam a rede. Cada um troca o `fetch` por uma resposta falsa. Para criar um teste novo, use como base os helpers de `tests/helpers.ts` (`mockFetch`, `reply`, `apodItem`).

## Padrões

- TypeScript com `strict`. Evite `any`.
- O pacote não tem dependências de execução. Não adicione nenhuma sem combinar antes.
- Mensagens, comentários e documentação em português do Brasil.
- Tudo que vem da resposta da NASA é dado externo. Se um campo for virar caminho de arquivo ou endereço de uma nova requisição, valide antes. `src/download.ts` mostra como é feito hoje.
- Evite regex com `.*` nas pontas ou grupos aninhados em strings que vêm da rede. O CodeQL costuma apontar esse padrão.

## Pull Request

1. Faça um fork e crie uma branch a partir da `main`.
2. Cubra a mudança com testes em `tests/`.
3. Rode `npm test` e `npx tsc --noEmit`.
4. Atualize o `readme.md` e o `CHANGELOG.md` se a mudança afetar a API, a CLI ou o comportamento documentado.
5. Abra o PR seguindo o [template](./.github/PULL_REQUEST_TEMPLATE/pull_request_template.md).

Bugs e sugestões vão pelos templates de issue. Vulnerabilidades não devem virar issue pública, veja o [SECURITY.md](./SECURITY.md).
