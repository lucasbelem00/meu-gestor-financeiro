# Nova vistoria profunda — 26/10/2026

> Registro histórico da análise anterior à correção. Os pontos foram implementados e a suíte completa passou com 459 testes. Veja o [checklist da implementação](IMPLEMENTACAO_NOVOS_CENARIOS_20261026.md), incluindo a limitação da conferência visual.

Base examinada: branch `New`, commit `07ca2f3` (Pix, resumos, rascunhos, limpar filtros), protocolo 12 e cache v45. A árvore de trabalho estava limpa no início. Este relatório registra a análise; **nenhuma correção no app foi aplicada nesta rodada**.

Foram revistos os relatórios anteriores para não repetir problemas já corrigidos. As provas usam somente dados fictícios, planilhas e Drive simulados. A configuração do projeto na Vercel foi consultada sem alterações.

## 1. Alta — o rascunho enviado em outra aba ainda pode ser lançado pela página original

**Cenário:** A mantém um gasto de R$ 25,50 preenchido; B herda esse rascunho e envia. B conclui sua operação e registra o comprovante de conclusão da origem. A permanece aberta com os campos originais e também envia.

**Resultado reproduzido online e offline:** dois registros de R$ 25,50, total de R$ 51,00, com identificadores diferentes. Antes do segundo envio, a própria função de conferência reconheceu o rascunho como concluído. Repetir o primeiro identificador não criou outro registro: a proteção de reenvio do servidor funcionou.

**Causa:** a conclusão é conferida ao listar, recuperar e restaurar rascunhos, mas não antes de enviar o formulário que continuou aberto. Isso é diferente da recuperação de cópia concluída, já corrigida. A proteção de Notas para a página original também continua funcionando.

**Correção proposta:** associar a origem e o conteúdo do rascunho a uma identidade lógica compartilhada. Escolher e persistir o mesmo identificador de envio sob trava entre abas, antes da rede ou da fila offline. Conferir a conclusão também no formulário aberto. Alterações posteriores e rascunhos independentes devem continuar permitidos; repetir conscientemente uma compra deve iniciar outra operação. Apenas checar um comprovante não resolve dois envios simultâneos.

Fontes: [envio do formulário](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:6872), [fila e envio](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:6920), [conclusão da origem](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/interface/rotina.js:115), [conferência na restauração](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/interface/rotina.js:35), [identificador da operação](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:6494).

Prova: [script com envio, herança e snapshot atuais](C:/Users/lucas/Documents/Codex/auditoria-offline-nova-rascunho-original-20261026.cjs).

## 2. Alta, em recuperação — a manutenção retomada não reconfere os arquivos de destino

**Cenário anual:** interromper a manutenção depois de preparar o arquivo anual e antes de regravar Lançamentos. Antes da próxima abertura, tornar o arquivo anual indisponível ou alterar seu conteúdo.

**Resultado:** a retomada remove a compra antiga da principal e marca o plano como `CONFIRMADO`. Somente depois a consulta acusa arquivo ausente ou conteúdo divergente.

**Cenário técnico:** interromper a compactação antes de regravar o diário e tornar o JSON técnico indisponível.

**Resultado:** a retomada marca a operação como `ARQUIVADO` e conclui o plano. Consultar sua confirmação falha por arquivo desconhecido.

**Limites:** os cenários exigem interrupção seguida de indisponibilidade ou alteração do destino. O backup financeiro anterior continua preservado no Drive fictício. Não foi reproduzida duplicação automática nem perda definitiva de todas as cópias; a principal deixa de ser a fonte de recuperação e a consulta pelo app fica comprometida.

**Causa:** a preparação inicial confere o destino, mas a retomada verifica apenas o plano e as matrizes da principal.

**Correção proposta:** guardar no plano os arquivos dos quais a remoção depende e seus comprovantes. Antes de remover ou substituir dados locais e antes de concluir a retomada, reler e conferir esses destinos. Destino ausente ou alterado deve preservar a origem e exigir recuperação, sem marcar conclusão.

Fontes: [retomada](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:5393), [verificação das matrizes](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:5403), [aplicação](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:5404), [conferência anual inicial](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:5484), [compactação técnica](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:5551), [consulta posterior](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:5591). A implementação compartilhada fica em `shared/protecao.js`.

Provas: [script e controles](C:/Users/lucas/Documents/Codex/auditoria-backup-nova-20261026.cjs), [resultado JSON](C:/Users/lucas/Documents/Codex/auditoria-backup-nova-20261026.json).

## 3. Média — parcela antiga encerrada bloqueia a correção das abertas para Pix

**Cenário:** empréstimo de R$ 300 em três parcelas de R$ 100 no cartão; primeira parcela recebida da pessoa e paga ao banco. Editar a segunda para Pix.

**Resultado:** a prévia aceita e mostra R$ 200 em dois registros. Ao confirmar, a gravação é recusada porque a compra já tem pagamento registrado. A primeira parcela, que permaneceria intacta, está causando o bloqueio. Nenhum dado é gravado parcialmente.

**Esperado:** preservar a parcela encerrada no cartão e converter somente as duas abertas, após a confirmação do Pix efetivamente realizado.

**Correção proposta:** prévia, validação e gravação devem usar o mesmo conjunto de parcelas efetivamente alteradas. O bloqueio continua necessário quando o pagamento pertence a uma parcela que mudará.

Fontes: [escopo da prévia Pix](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:302), [validação sobre a compra inteira](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:899), [preservação das recebidas no processamento](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:924), [caminho da interface](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:3937).

Prova: [script com cinco controles financeiros](C:/Users/lucas/Documents/Codex/auditoria-financeira-nova-20261026-pix-parcelas.cjs).

## 4. Média/baixa — a cópia offline não cobre dois caminhos de abertura

### Rede que não termina de responder

Com uma cópia HTML válida já guardada e uma rede simulada que não conclui, a navegação não devolve a cópia nem agenda um prazo próprio. A preparação inicial possui prazo de oito segundos; a navegação normal não possui esse limite.

**Efeito possível:** o app demora para abrir mesmo tendo uma cópia local utilizável. Isso não é perda de lançamento. A duração real depende também do navegador e da rede; o teste prova a ausência do prazo no app.

**Proposta:** limitar a espera da navegação e usar a cópia HTML conferida quando esse prazo terminar. Atualizações podem continuar em segundo plano. Manter a API privada fora do cache e não substituir HTML válido por página de login ou erro.

Fonte: [navegação pela rede](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/sw.js:71).

### Endereço com parâmetro extra

Em modo offline, `/` abriu a cópia válida, mas `/?origem=atalho` retornou 503, apesar de a raiz estar guardada. O manifesto atual usa `/`, portanto o segundo caso depende de um link ou atalho com parâmetro.

**Proposta:** para os endereços que representam a mesma página inicial, procurar também a cópia canônica da raiz. Não aplicar esse tratamento indiscriminadamente a outras rotas ou à API.

Fonte: [busca exata da cópia](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/sw.js:84).

Provas: [script](C:/Users/lucas/Documents/Codex/auditoria-raiz-sw-usabilidade-20261026.cjs), [resultados](C:/Users/lucas/Documents/Codex/auditoria-raiz-sw-usabilidade-20261026.json).

## 5. Média, apenas em planilha personalizada — algumas fórmulas ainda escapam da proteção

**Cenário:** inserir `=INDEX(H:H,3)` numa coluna extra de uma linha atual, mantendo outra compra antiga elegível para arquivamento.

**Resultado:** o arquivamento é autorizado. A fórmula fica idêntica, mas H3, a célula referenciada, passa de 30 para 70 após reorganizar as linhas.

**Limite da prova:** o simulador não calcula INDEX. Foram conferidos a expressão preservada e o conteúdo da célula referenciada antes e depois. A versão com referência direta `=H3` continua bloqueando corretamente a manutenção.

**Causa:** a proteção reconhece referências como H3 e algumas funções indiretas, mas não a referência de coluna inteira H:H.

**Correção proposta:** durante essa reorganização, aceitar somente fórmulas demonstravelmente constantes, ou reconhecer de forma completa também referências de colunas/linhas inteiras e nomes definidos. Não modificar endereços por tentativa. As linhas com colunas extras que seriam arquivadas já possuem outro bloqueio, que não foi contado novamente aqui.

Fonte: [verificação de fórmulas](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:5539). Prova no script de backups do item 2.

## Melhorias de usabilidade recomendadas

### Mensagens diferentes para consultar e gravar

Foi executado somente `getDadosCompletos`, com cache disponível e falha de rede fictícia. O aviso afirmou que “A gravação pode estar na planilha”, embora nenhuma gravação tivesse sido tentada.

**Proposta:** na consulta, informar que os dados locais estão sendo exibidos e oferecer Atualizar. Reservar “Conferir confirmação” para uma operação realmente enviada cujo resultado ainda seja incerto. Erros de estrutura ou catálogo devem orientar a recuperação correspondente, em vez de recomendar apenas aguardar a internet.

Fonte: [tratamento de falha da leitura](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:6157). [Prova JSON](C:/Users/lucas/Documents/Codex/auditoria-raiz-mensagem-consulta-20261026.json).

### Completar os rótulos e o foco dos editores

A revisão do código encontrou textos de rótulo sem associação explícita com os campos dos editores de empréstimos e gastos. Por exemplo, Pessoa e Forma de Pagamento no editor de empréstimos. O contêiner de edição também não tem a mesma identificação de diálogo dos modais de confirmação e exportação.

**Proposta:** associar os rótulos aos campos; ao abrir, levar o foco ao editor; manter a navegação por Tab dentro dele e devolver o foco ao botão de origem ao fechar. Isso ajuda leitores de tela, teclado e o toque no rótulo pelo celular. Reaproveitar as confirmações de edição já existentes, sem acrescentar confirmações desnecessárias.

Fontes: [editor de empréstimos](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:1219), [campo Pessoa](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:1249), [Forma de Pagamento](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:1260), [proteção atual dos editores](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/interface/rotina.js:169). Esta recomendação foi avaliada pelo código; a nova verificação visual no navegador não concluiu por lentidão das ferramentas nesta rodada.

### Explicar o envio feito por outra aba sem aumentar o formulário

Junto da correção do item 1, mostrar uma mensagem curta quando esse rascunho já tiver sido enviado: “Enviado em outra aba — conferir no Histórico”. Uma opção explícita para iniciar outro lançamento evita confundir uma repetição intencional com um reenvio acidental.

## Controles que passaram e limites desta vistoria

- 16 testes existentes de cache e proxy passaram, sem falhas.
- Três testes direcionados de Notas passaram: conclusão da cópia herdada, preservação da edição posterior e independência de rascunhos iguais.
- Cinco controles financeiros passaram: Pix com parcela recebida sem banco pago; bloqueio de pagamento na parcela afetada; mover pessoal/terceiros preservando IDs e pagamento parcial; centavos/antecipação/reenvio/versão antiga; recebimento parcial e desfazer.
- Controles de manutenção: destino íntegro e retomada íntegra conservaram totais; referência direta A1 continuou bloqueada.
- O teste de duplicação foi repetido online e offline e confirmou a idempotência do servidor para o mesmo identificador.
- Não foi executada novamente a suíte completa nesta rodada. Os 427 testes registrados no pacote anterior são a validação daquela implementação, não uma execução nova desta auditoria.
- A configuração atual consultada na Vercel mostra proteção SSO ativada (`all_except_custom_domains`) e somente um domínio `vercel.app`, sem domínio personalizado. O proxy local bloqueia produção e os testes desse bloqueio passaram. Isso é uma conferência de configuração e código, não uma tentativa de acesso anônimo a cada URL nem uma inspeção das permissões da conta Google.
- Nenhuma conta, planilha real, configuração de serviço, commit ou implantação foi alterada. Os arquivos de prova ficam fora do repositório; este relatório é a única adição ao projeto nesta rodada.

## Ordem sugerida de correção

1. Identidade do rascunho e envio entre abas.
2. Conferência dos destinos na retomada da manutenção, incluindo os arquivos técnicos.
3. Igualar o escopo da prévia Pix ao da gravação.
4. Restringir fórmulas personalizadas na reorganização.
5. Abertura pela cópia offline, mensagens e acessibilidade dos editores.

As mudanças podem ser implementadas em um pacote, com regressões para estes cenários. Não há motivo para ampliar o menu ou acrescentar funcionalidades grandes antes desses ajustes.
