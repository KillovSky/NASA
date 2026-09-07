# Política de Segurança

## Versões Suportadas

| Versão  | Suporte de Segurança |
|---------|----------------------|
| 2.x.x   | ✅ Ativa              |
| 1.x.x   | ❌ Sem suporte (legado) |

Recomendamos sempre usar a versão mais recente da série `2.x` e acima.

## Reportar uma Vulnerabilidade

**Não abra uma issue pública** para vulnerabilidades de segurança.

Reporte vulnerabilidades de forma privada através de um dos canais abaixo:

1. **GitHub Security Advisories** (preferido):
   Acesse a aba [Security](https://github.com/KillovSky/NASA/security/advisories/new)
   do repositório e clique em *"Report a vulnerability"*.

2. **Redes Sociais Privadas** (contato direto com o mantenedor):
   [linktr.ee/killovsky](https://linktr.ee/killovsky)

### O que incluir no reporte

- Descrição clara da vulnerabilidade
- Passos para reproduzir (proof-of-concept, se possível)
- Impacto potencial estimado
- Versão afetada
- Sugestão de correção (opcional, mas bem-vinda)

## Superfície de risco deste pacote

Diferente de um cliente de API simples, este módulo pode **escrever arquivos em disco** (opção `download`) a partir de dados retornados pela API da NASA. Isso significa que dois pontos merecem atenção redobrada em qualquer contribuição:

- **Nome/caminho do arquivo baixado** — nunca deve ser montado diretamente a partir de um campo vindo da resposta da API (`nasa.date`, ou qualquer outro) sem validação estrita de formato. O comportamento atual valida a data contra `^\d{4}-\d{2}-\d{2}$` antes de usá-la no caminho, e confere que o caminho final continua dentro da pasta de destino.
- **URL da imagem baixada** — só `http:`/`https:` são aceitos antes de qualquer `fetch`. Mudanças que voltem a passar uma URL não validada diretamente para `fetch()`/`fs.writeFileSync()` não serão aceitas.

Se você encontrar uma forma de contornar essas proteções, isso é justamente o tipo de problema que deve ser reportado de forma privada, como descrito acima.
