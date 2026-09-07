# Código de Conduta — @killovsky/nasa

## 1. Objetivo

O **@killovsky/nasa** é um projeto de código aberto que oferece um cliente Node.js/TypeScript e uma CLI para a API **APOD** (Astronomy Picture of the Day) da NASA.

Este Código de Conduta estabelece as expectativas para quem participa do desenvolvimento, manutenção, discussão ou divulgação do projeto, buscando manter um ambiente técnico, colaborativo e responsável.

A participação na comunidade implica o compromisso de agir de boa-fé, respeitar outras pessoas e contribuir para a qualidade e a segurança do projeto.

---

## 2. Princípios

A comunidade do projeto procura seguir alguns princípios fundamentais:

- **Colaboração**: contribuições devem buscar melhorar o projeto e ajudar outros desenvolvedores.
- **Clareza**: problemas, sugestões e críticas devem ser apresentados de forma objetiva e compreensível.
- **Respeito**: discordâncias técnicas são naturais e devem permanecer focadas nas ideias, código e decisões do projeto.
- **Boa-fé**: espera-se que participantes assumam, até que existam evidências em contrário, que os demais estejam tentando contribuir de forma legítima.
- **Qualidade**: mudanças devem considerar manutenção, compatibilidade, testes, documentação e comportamento esperado da biblioteca.
- **Responsabilidade**: o cliente deve ser utilizado de forma compatível com os termos de uso da API da NASA.

---

## 3. Contribuições Técnicas

Contribuições são bem-vindas por meio de *issues*, *pull requests*, documentação, testes, correções de bugs e melhorias relacionadas ao projeto.

Ao contribuir, procure:

- Descrever claramente o problema ou objetivo da alteração.
- Fornecer informações suficientes para reproduzir problemas.
- Manter as alterações focadas no propósito do *pull request*.
- Adicionar ou atualizar testes quando aplicável.
- Preservar a compatibilidade existente sempre que possível.
- Atualizar a documentação quando o comportamento público do projeto mudar.
- Evitar alterações não relacionadas ao objetivo da contribuição.
- Respeitar as decisões técnicas e os padrões estabelecidos no projeto.

*Pull requests* podem ser solicitados a passar por alterações antes de serem aceitos. Isso faz parte do processo normal de revisão e não deve ser interpretado como uma crítica pessoal.

---

## 4. Issues e Discussões

*Issues* devem ser utilizadas principalmente para:

- Relatar bugs.
- Propor melhorias.
- Solicitar funcionalidades.
- Discutir problemas de compatibilidade.
- Relatar problemas de documentação.
- Apresentar sugestões relacionadas ao projeto.

Antes de abrir uma *issue*, procure verificar se o problema já foi relatado.

Relatos de bugs devem, quando possível, incluir:

- Versão do pacote.
- Versão do Node.js.
- Sistema operacional.
- Código utilizado para reproduzir o problema.
- Resultado esperado.
- Resultado obtido.
- Mensagens de erro relevantes.

*Issues* não devem ser utilizadas para ataques pessoais, discussões deliberadamente improdutivas, *spam* ou divulgação de conteúdo não relacionado ao projeto.

---

## 5. Uso Responsável da API da NASA

Este pacote é um cliente para uma API pública de terceiros (`api.nasa.gov`), mantida pela NASA e sujeita aos [termos de uso da NASA API Portal](https://api.nasa.gov). Ao contribuir ou utilizar o projeto, recomenda-se:

- Obter uma chave própria em [api.nasa.gov](https://api.nasa.gov) em vez de depender indefinidamente da `DEMO_KEY` pública (que tem limite de requisições compartilhado).
- Não implementar ou propor mudanças que incentivem contornar limites de taxa (*rate limiting*) da API da NASA.
- Respeitar os créditos de autoria (`copyright`) presentes nas respostas da API ao reutilizar as imagens do APOD fora do escopo de teste/desenvolvimento.
- Não tratar o pacote como um mecanismo de scraping ou coleta massiva de dados fora do uso pretendido (buscar a foto astronômica do dia).

---

## 6. Segurança

Problemas de segurança devem ser tratados com prioridade — em especial porque este pacote pode escrever arquivos em disco (recurso de download) a partir de dados vindos de uma resposta de rede.

Não publique informações sensíveis, credenciais, *tokens*, chaves de API reais ou detalhes que possam facilitar a exploração de uma vulnerabilidade em uma *issue* pública.

Caso seja identificada uma vulnerabilidade que possa afetar usuários do projeto, siga o processo descrito em [SECURITY.md](./SECURITY.md) em vez de abrir uma issue pública.

---

## 7. Comportamentos Inaceitáveis

Não são permitidos:

- Assédio, ameaças ou intimidação.
- Discriminação ou ataques direcionados a pessoas ou grupos.
- Ataques pessoais em discussões técnicas.
- Divulgação deliberada de informações privadas de terceiros.
- *Spam* ou manipulação deliberada das ferramentas de colaboração.
- Sabotagem do projeto ou de suas ferramentas de infraestrutura.
- Uso deliberado de *issues*, *pull requests* ou discussões para prejudicar outros participantes.
- Publicação intencional de credenciais, *tokens* ou informações sensíveis.
- Tentativas deliberadas de introduzir código malicioso ou comprometer a segurança do projeto.
- Qualquer comportamento que prejudique de maneira deliberada a comunidade, os usuários ou a infraestrutura do projeto.

Discordâncias técnicas, críticas de código e rejeições de propostas não constituem, por si só, comportamento inadequado.

---

## 8. Responsabilidades dos Mantenedores

Os mantenedores são responsáveis por:

- Avaliar contribuições de acordo com critérios técnicos e de projeto.
- Manter discussões focadas no propósito do projeto.
- Revisar e responder a problemas relevantes dentro de uma expectativa razoável.
- Proteger a integridade do repositório e de sua infraestrutura.
- Tomar medidas proporcionais quando este Código de Conduta for violado.

Os mantenedores podem editar, fechar ou remover *issues*, *pull requests*, comentários e outras contribuições que violem este Código de Conduta ou prejudiquem significativamente o funcionamento da comunidade.

Em situações graves ou recorrentes, o acesso de um participante aos espaços do projeto poderá ser temporariamente restringido ou permanentemente removido.

---

## 9. Decisões Técnicas

O projeto é mantido por pessoas, e nem toda proposta será aceita.

Uma contribuição pode ser recusada quando:

- Não estiver alinhada aos objetivos do projeto.
- Introduzir complexidade desnecessária.
- Comprometer compatibilidade ou estabilidade.
- Duplicar funcionalidades existentes sem benefício significativo.
- Apresentar riscos de segurança ou manutenção.
- Não possuir informações suficientes para avaliação.
- Entrar em conflito com decisões arquiteturais existentes.

A rejeição de uma contribuição não representa uma rejeição ao seu autor.

---

## 10. Comunicação

A comunicação dentro do projeto deve permanecer objetiva e respeitosa.

É aceitável discordar de uma implementação, arquitetura, decisão de manutenção ou proposta.

Não é aceitável transformar uma discordância técnica em um ataque pessoal.

Quando uma discussão deixar de produzir resultados técnicos, os mantenedores poderão encerrá-la para preservar o foco da comunidade.

---

## 11. Aplicação

Violações deste Código de Conduta poderão resultar em:

- Orientação ou solicitação de correção do comportamento.
- Advertência.
- Restrição temporária de participação.
- Remoção de conteúdo ou contribuição.
- Banimento temporário ou permanente dos espaços oficiais do projeto.

A medida aplicada dependerá da gravidade, contexto e recorrência da situação.

Relatos feitos de boa-fé não devem resultar em retaliação contra a pessoa que realizou o relato.

---

## 12. Escopo

Este Código de Conduta se aplica ao repositório do projeto, às suas *issues*, *pull requests*, discussões, canais oficiais e demais espaços utilizados diretamente para desenvolvimento ou suporte do projeto.

Quando uma pessoa estiver representando oficialmente o projeto em outro espaço, espera-se que os mesmos princípios sejam respeitados.

---

## 13. Alterações deste Código

Este documento pode ser atualizado conforme o projeto e sua comunidade evoluírem.

Alterações significativas devem ser realizadas de maneira transparente no próprio repositório.

A versão vigente deste documento é a referência para as interações realizadas no projeto.

---

## 14. Contato

Para questões relacionadas a este Código de Conduta, entre em contato com os mantenedores por meio dos canais oficiais disponíveis no repositório.

Para vulnerabilidades de segurança, prefira um canal privado sempre que disponível — veja [SECURITY.md](./SECURITY.md).

---

*@killovsky/nasa é um projeto de código aberto mantido para facilitar o acesso, em Node.js/TypeScript, à Foto Astronômica do Dia (APOD) da NASA.*
