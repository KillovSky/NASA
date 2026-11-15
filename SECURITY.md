# Política de Segurança

## Versões com suporte

| Versão | Suporte |
| --- | --- |
| 3.x | Sim |
| 2.x | Não. Usa a API antiga do APOD, que sai do ar em 1º de dezembro de 2026. |
| 1.x | Não |

## Reportar uma vulnerabilidade

Não abra uma issue pública. Use um destes canais:

1. [GitHub Security Advisories](https://github.com/KillovSky/NASA/security/advisories/new) (preferido): na aba Security do repositório, clique em "Report a vulnerability".
2. Contato direto com o mantenedor: [linktr.ee/killovsky](https://linktr.ee/killovsky).

Inclua uma descrição do problema, como reproduzir, o impacto que você enxerga, a versão afetada e, se tiver, uma sugestão de correção.

## O que merece atenção

O módulo grava arquivos em disco (opção `download`) usando dados que vêm da API da NASA:

- O nome do arquivo usa a data da resposta, que só é aceita no formato `YYYY-MM-DD`. O caminho final também é conferido contra a pasta de destino.
- A imagem só é baixada se a URL for `http:` ou `https:`.

Mudanças que passem dados da resposta direto para `fs` ou `fetch()` sem essas conferências não serão aceitas. Se você achar um jeito de contornar alguma delas, reporte em privado pelos canais acima.
