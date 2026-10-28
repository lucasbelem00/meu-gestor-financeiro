# Vistoria antes da versão definitiva — 27/10/2026

Base: commit 25a9f69, protocolo 14 e cache v47. Repositório limpo no início. Este documento reúne uma nova auditoria, respostas às dúvidas sobre a planilha e uma proposta de consolidação. Não implementa as correções propostas.

## Resumo e prioridade

Não considero a transferência definitiva concluída: há duas falhas de maior impacto e seis problemas adicionais comprovados. Os 484 testes existentes passaram novamente; as provas novas exercitam situações ausentes dessa suíte. As correções anteriores continuam cobertas, mas isso não garante os cenários ainda não adicionados.

Prioridade: corrigir a retirada do Pix quando valor/competência também mudam; compatibilizar e testar o backup da planilha legada; unificar a classificação das ações de API; depois consolidar inicialização, identidades históricas e resumos. A limpeza deve preservar os identificadores, comprovantes e os dados já existentes.

## 1. Alta — correção Pix com mudança de valor pode gerar pagamento fictício no cartão

Cenário fictício: Pix de R$ 120 cadastrado por engano. Corrigir para cartão e R$ 130 com nova prévia válida e consentimento explícito. A prévia retira R$ 120 de Pix, mas o cartão termina com R$ 120 pagos e somente R$ 10 em aberto. O esperado é R$ 0 pago e R$ 130 em aberto.

Controles: manter R$ 120 e a competência funciona. Reduzir para R$ 100 ou mudar a competência é bloqueado pelo pagamento do Pix que a correção pretendia retirar. Não foi feita operação com dados reais.

Causa: o reset do Pix no editor é depois contrariado pela preservação genérica do pagamento em preservarPagamentoNaEdicaoGestor_. Esta combina dois fluxos que individualmente passaram nos testes anteriores.

Correção proposta: registrar no contexto os IDs cuja retirada do Pix foi conferida, considerar zero como pagamento anterior somente nesses registros e manter os bloqueios para pagamentos reais e valores efetivamente recebidos da pessoa.

Fontes: Backend/Code.gs:890–892 e 3683–3697.
Prova: C:/Users/lucas/Documents/Codex/auditoria-definitiva-financas-20261027-pix-correcao.cjs e .json.

## 2. Alta para recuperação — backup pode ser confirmado e recusado na restauração

A cópia real consultada tem Anotações com quatro títulos (ID, Texto, Concluída, Data), mas usa E/F para versão e exclusão. Esse esquema legado é lido normalmente, pois o código só cria os seis títulos quando a aba ainda não existe.

Na reprodução fictícia desse mesmo esquema, executarBackupProtegidoWeb criou o arquivo, confirmou SHA e registrou CONFIRMADO/último backup. A prévia do próprio JSON foi recusada com Estrutura de Anotações incompleta. O controle com os seis títulos passou.

Portanto, conferir os bytes do arquivo não basta para anunciar que é restaurável. Não restaurei o backup real nem afirmo ter calculado sua integridade; a prova de incompatibilidade foi feita em memória sobre o esquema observado.

Correção proposta: migração conservadora do cabeçalho, conferindo antes a natureza de E/F; aceitar/normalizar backups legados reconhecíveis sem inventar ou apagar dados; validar o esquema restaurável antes de confirmar uma cópia. Cobrir exportação → prévia → restauração em uma cópia descartável.

Fontes: Backend/Code.gs:2626 e 4745; shared/protecao.js:373–394.
Provas: auditoria-definitiva-backup-20261027-cabecalho-formulas.cjs/.json e auditoria-definitiva-backup-20261027-backup-legado-confirmado.cjs/.json, em C:/Users/lucas/Documents/Codex.

## 3. Média — consulta de backup pode criar pendência financeira falsa e bloquear restauração

As listas de ações divergem: o transporte omite oito ações que já aparecem nas camadas posteriores. Foram reproduzidas falhas apenas de rede em obterPartesImportacaoBackupWeb e listarCopiasRestauracaoWeb. Mesmo sem gravação financeira, surgem gestorMutacaoV3, resultado incerto e aviso de envio preservado.

Com a Central e o controle de restauração reais carregados no teste, a pendência falsa bloqueou selecionar JSON com Resolva os envios pendentes… antes de restaurar. A consulta mensal sob a mesma falha gerou zero pendências.

Correção proposta: um catálogo de ações com propriedades distintas para leitura, alteração financeira, preparação temporária, repetição e cache. Não chamar tudo de leitura apenas para contornar um bloqueio; importar/preparar arquivos também tem efeitos próprios.

Fontes: index.html:6491 e 7430; interface/rotina.js:303.
Provas: C:/Users/lucas/Documents/Codex/auditoria-definitiva-legado-20261027-classificacao.cjs/.json.

## 4. Baixa/média — restaurador antigo repõe campos de rascunho concluído

Um timer de 500 ms lê diretamente o rascunho da sessão. Numa abertura lenta/sem cache, pode preencher descrição e valor antes de o restaurador moderno verificar a conclusão. Depois a sessão é removida, mas os campos já repostos continuam preenchidos.

A prova terminou com um lançamento confirmado, sessão antiga removida, consulta do rascunho retornando null e campos ainda preenchidos. Não foi demonstrado segundo envio automático.

Correção proposta: retirar o restaurador parcial antigo e manter uma única restauração, coordenada com os comprovantes e com a preservação de edições posteriores.

Fonte: index.html:6364–6379.
Provas: C:/Users/lucas/Documents/Codex/auditoria-definitiva-legado-20261027-rascunho.cjs/.json.

## 5. Média — renomear forma pode alterar a classificação de registros arquivados

A renomeação pelo app atualiza registros ativos de gastos, empréstimos e fixos; preserva IDs, valores e pagamentos e aumenta versões. Porém os arquivos anuais mantêm o nome antigo. Filtrar esses registros pelo nome novo retorna zero, embora o total anual continue correto.

Caso comprovado: Pix personalizado → nome antigo → arquivar → nome novo. O tipo do registro antigo no anual mudou de pix para cartao pela inferência de um nome que já não existe no cadastro; o filtro Pix deixou de encontrá-lo.

Correção proposta: identidade permanente da forma separada do rótulo, com tipo e aliases históricos preservados no backup. Não reescrever os arquivos anuais silenciosamente para resolver a troca de nome.

Fontes: Backend/Code.gs:2744 e 5170.
Prova: C:/Users/lucas/Documents/Codex/auditoria-definitiva-financas-20261027.cjs/.json.

## 6. Média — proteção anual bloqueia fórmulas padrão do próprio Dashboard

A planilha real contém SUMIFS sobre Lançamentos com intervalos de coluna inteira. A proteção nova de referências entre abas bloqueia essas fórmulas também, mesmo sem personalização. O teste com agregado padrão bloqueou a prévia; constante permitiu arquivar. Nenhum dado foi removido ao bloquear.

Não basta liberar SUMIFS: após arquivar, uma fórmula que consulta somente a principal deixa de incluir os dados anuais que o app continua lendo. Referências posicionais como INDEX e células específicas ainda precisam da proteção.

Correção proposta: definir o escopo do Dashboard nativo e gerar/recalcular seus resumos com a mesma fonte lógica dos relatórios, ou identificar claramente que representam somente a principal. Distinguir agregados compatíveis e referências inseguras durante a manutenção, depois de resolver a dependência do histórico.

Fonte: shared/protecao.js:121–129.
Prova: C:/Users/lucas/Documents/Codex/auditoria-definitiva-backup-20261027-cabecalho-formulas.cjs/.json.

## 7. Média no uso prolongado — reservas de Notas retêm texto integral já confirmado

Depois de adicionar, sincronizar, excluir e sincronizar 40 notas fictícias de aproximadamente 1.953 caracteres, restaram zero notas visíveis e zero operações pendentes. Ainda havia 40 reservas e 40 recibos locais, somando 273.250 bytes UTF-8. As reservas novas retinham a operação e o texto completo.

Isso importa para o uso como diário. A quota real depende do navegador; não foi demonstrada perda de nota. É crescimento comprovado de cópias locais sem utilidade operacional após confirmação, não apenas a limitação genérica de armazenamento.

Correção proposta: compactar comprovantes confirmados para hash/IDs/estado e manter os pendentes íntegros. Antes de remover qualquer conteúdo, garantir que a mesma origem não possa voltar a gerar outra nota. Não apagar os comprovantes indiscriminadamente.

Fontes: interface/usabilidade.js:310–324; index.html:2424–2439.
Provas: C:/Users/lucas/Documents/Codex/auditoria-definitiva-backup-20261027-reservas-notas.cjs/.json.

## 8. Baixa/média — padronizar Outros pode deixar nomes diferentes entre cadastro e histórico

A planilha real ainda guarda Outros sem emoji. O app o apresenta como Outros 📦 por uma regra de exibição. Isso, sozinho, não prova perda de sincronização financeira.

O teste adicional mostrou uma lacuna: salvar categorias padroniza o cadastro para Outros 📦, mas, sem uma renomeação explícita, a linha financeira continua Outros. O app compara por uma chave tolerante e mantém o total. As fórmulas nativas usam comparação textual exata com a célula do cadastro, portanto esses rótulos deixam de corresponder.

Limite: não alterei a planilha real e o simulador não calculou SUMIFS. Foram conferidos os dois textos diferentes e o total do app preservado.

Correção proposta: tratar chave estável, nome e emoji como coisas separadas, ou migrar cadastro e histórico de forma coordenada, preservando metas e totais. Não corrigir apenas B28 manualmente.

Fontes: Backend/Code.gs:2920–2997; regra de exibição de Outros na interface.
Prova: C:/Users/lucas/Documents/Codex/auditoria-definitiva-outros-20261027.cjs/.json.

## Código antigo, redundante e necessário

O inventário local encontrou 13 corpos antigos integralmente substituídos, aproximadamente 222 linhas, em cópia de texto, metade/último valor, limpeza, filtros, WhatsApp, categorias e colagem de Pix. São candidatos concretos à consolidação, não uma instrução para apagar sem conferir a inicialização/fallback.

Três auxiliares não tiveram outras referências localizadas: referenciaRegistroGestor, alternarModoAssinatura e limparRachadinhaDetalhada. Referências dinâmicas/ações e compatibilidade devem ser conferidas antes da remoção.

Há pelo menos cinco camadas de apiCall e quatro de setAba. Elas ainda preservam funções reais: transporte/diário, diagnóstico, integridade/época, protocolo, cache, gráficos, rolagem e consulta anual. A limpeza deve transformar essas responsabilidades em módulos explícitos, sem simplesmente manter a última definição.

Outro trecho obsoleto: organizarEAtualizarPlanilha mantém jaVenceuOuPagou sempre falso, cálculos de dataVenc sem uso e ramos dependentes desse resultado. É possível retirar esse legado preservando isStatusPago, ordenação e a exigência atual de pagamento explícito.

As três cópias HTML, os blocos gerados e shared/interface não são duplicação acidental: são fontes e artefatos de distribuição. O build precisa continuar gerando interfaces iguais.

No projeto Apps Script aberto existe também Sem título.gs, com uma função temporária diagnosticarPendenciaGestor. Não foi executada nem removida. Convém mantê-la identificada como ferramenta de diagnóstico ou retirá-la da entrega após conferir dependências; seu nome genérico não ajuda a manutenção.

Sequência proposta de refatoração:

1. Acrescentar regressões para os achados novos e preservar a base de 484 testes.
2. Centralizar o catálogo das ações e a inicialização/restauração dos rascunhos.
3. Promover as implementações atuais para módulos e retirar os corpos substituídos, uma responsabilidade por vez.
4. Manter as proteções de compatibilidade enquanto a migração não estiver concluída; não carregar versões antigas como fallback silencioso.
5. Compilar, conferir as cópias e medir leituras/renderização antes e depois. Não foi medido ganho perceptível de velocidade nesta auditoria.

Inventário e relatório: auditoria-definitiva-legado-20261027-inventario.json e auditoria-definitiva-legado-20261027-relatorio.md, fora do repositório em C:/Users/lucas/Documents/Codex.

## Respostas sobre a planilha e o uso diário

### Planilha e app estão completamente sincronizados?

Confirmei por leitura das propriedades do Apps Script que o projeto aberto aponta para a mesma cópia de trabalho consultada pelo conector. O gatilho rotinaProtecaoProgramadaGestor está instalado; a tabela e a configuração registram backup mensal confirmado. Isso não certifica a versão efetivamente publicada de todo o frontend/backend nem a restauração real desse backup.

A planilha é a base dos dados financeiros. A tela depende de consultas e cache; notas podem ter operações locais aguardando envio. Histórico da calculadora, fixação e rascunhos são dados do aparelho. O Dashboard nativo conserva fórmulas antigas e não é um espelho completo dos cálculos atuais do app.

Nesta rodada não comparei cada registro da planilha com uma tela ativa do webapp, não executei gravações reais e não restaurei dados reais. Por isso não afirmo sincronização integral já homologada.

### Para que servem J e K em Formas de Pagamento?

São colunas, não linhas. Na cópia consultada, J6 contém _Gestor_Tipo_Forma_v1 e J7:J13 identifica cartao/pix/resumo. K estava vazia em todo o intervalo existente K1:K101. O código localiza a coluna técnica pelo cabeçalho e pode criá-la em outra coluna livre a partir de J; K não tem uma função fixa universal.

Sugestão: ocultar e explicar a coluna técnica na apresentação da planilha. Não apagá-la, pois o tipo não deve ser inferido apenas do nome.

### Notas excluídas devem permanecer na planilha?

Sim. O controle atual faz exclusão lógica: aumenta a revisão e marca Excluída=true. Isso impede que outro aparelho com uma cópia antiga reintroduza a nota. O app oculta essas linhas. A planilha precisa ter os títulos Versão/Excluída e pode oferecer um filtro de visualização, preservando os registros técnicos.

### Mais meses e virada do ano

O app calcula períodos pelos registros e passou no controle com dezembro/2026 e janeiro/fevereiro/2027, preservando totais depois de arquivar dezembro quitado. Não exige criar uma nova planilha ativa todo janeiro.

O Dashboard nativo consultado mostra quatro competências fixas, de outubro/2026 a janeiro/2027. Não encontrei rotina que expanda automaticamente essa grade. A evolução do app e a grade manual da planilha são recursos diferentes hoje; recomenda-se atualizar a grade/resumos por período sem deslocar os cadastros.

Os arquivos anuais automáticos são arquivos de consulta de compras inteiramente encerradas. Dívidas, parcelas futuras e fixos continuam na principal. Não são clones anuais para substituir a planilha ativa. Uma futura troca de principal exigiria uma migração própria, inclusive de identidades, pendências, configurações e provas.

### PDF mensal/anual junto do backup

É útil como relatório legível. O JSON continua necessário para restaurar. Hoje o PDF é gerado no navegador e não pelo gatilho de proteção. Uma rotina adicional poderia salvar relatórios no Drive por ano/mês, com data e revisão, usando a mesma fonte de dados do app e permitindo reemissão de períodos corrigidos.

Recomendo guardar esses PDFs no Drive junto da organização dos backups, e baixar no aparelho quando necessário. Isso é diferente de prometer downloads locais automáticos com o app fechado. Primeiro corrigir a compatibilidade/restauração do JSON; PDF não corrige um backup não restaurável.

### Renomeação de cartão

Para ajustar o nome do mesmo cartão, editar pelo app preserva os registros ativos e propaga o nome. Alterar apenas o cadastro manualmente na planilha não executa essa migração. Para outro cartão/produto/contrato, criar outro cadastro e arquivar o anterior é mais claro.

Antes da versão definitiva, resolver a identidade/tipo histórico dos arquivos anuais conforme o item 5. O nome deve ser um rótulo editável, não a única identidade da forma.

### Notas como diário

Esse uso combina com a ferramenta atual. Uma anotação não cria uma despesa nem registra recebimento ou pagamento. A descrição do usuário não foi tratada como pedido de transformar o recurso ou criar vínculos automáticos.

Uma convenção opcional como data + título e uma nota por dia pode ajudar na pesquisa. Não proponho novos campos agora. A compactação dos comprovantes confirmados ganha prioridade para sustentar esse uso por anos.

## Central de Navegação no celular

Recomendo tela inteira no celular, mantendo o diálogo menor no computador. Hoje o contêiner tem max-h-[90vh] e conteúdo alto. Aumentar somente para 100% oferece pouco espaço extra e não elimina a lista longa.

Proposta: altura útil completa, título e Fechar fixos, grade compacta de duas colunas, menos texto auxiliar e distribuição dos atalhos para trazer Gestão/abas inferiores para a primeira tela. Manter área de toque confortável e rolagem de segurança para telas pequenas ou fonte ampliada. Não esconder opções nem reduzir excessivamente os botões para prometer ausência universal de rolagem.

A proposta foi avaliada pelo código e pelo relato do usuário; não foi implementada nem validada visualmente nesta rodada.

## Verificação e limites

- Suíte completa desta rodada: 484 aprovados, zero falhas/ignorados. Log: C:/Users/lucas/Documents/Codex/auditoria-pre-definitiva-suite-20261027.log.
- Controles financeiros direcionados adicionais: 34 aprovados, zero falhas.
- Achados novos reproduzidos em fixtures reais do projeto, com dados fictícios; as provas de Pix, backup confirmado e classificação de consulta foram reconferidas antes da consolidação.
- Leitura real e delimitada: metadados das planilhas, colunas de Formas de Pagamento, configuração e fórmulas do Dashboard, cabeçalho/controle de Anotações e índice de backups. Propriedade do destino e gatilho foram lidos na interface Apps Script. Não foi lido o valor do token da API.
- Não foi alterado código do app, teste do repositório, planilha real, propriedade, gatilho, permissão, commit ou implantação. A única adição ao repositório nesta rodada é este relatório; as provas estão fora dele.
- A publicação definitiva deve incluir teste real controlado de gravação, devolução, fatura, atualização entre aparelhos e restauração em cópia descartável, depois das correções. Leitura das abas e teste de bytes do backup não substituem essa homologação.
