# Vistoria profunda — novos cenários de 27/10/2026

> Registro da análise anterior às correções. Os seis achados e três ajustes foram implementados no [pacote de correções](IMPLEMENTACAO_NOVOS_CENARIOS_20261027.md), validado com 484 testes. Consulte o checklist para os limites da conferência visual.

Base local examinada: commit d24e825. Repositório limpo no início. Foram lidos os relatórios anteriores para distinguir problemas novos de correções já entregues. Esta rodada é uma análise: não modifica o código do app, dados reais ou configurações de serviços.

A suíte completa foi executada novamente: **459 testes passaram, zero falhas, zero ignorados**. As reproduções adicionais abaixo mostram cenários que essa suíte ainda não cobre. Não significam que os testes existentes falharam.

## 1. Alta, durante recuperação — restauração interrompida confirma um destino anual que não foi reconferido

**Situação:** um backup completo inclui arquivo anual. A restauração prepara um novo arquivo, mas é interrompida antes de substituir Lançamentos. Esse destino é removido ou alterado antes da retomada.

**Reprodução:** valor ativo atual R$ 60; backup com R$ 30 ativos e R$ 100 arquivados. Com o destino íntegro, a retomada resulta corretamente em R$ 130. Com o novo arquivo removido ou adulterado, o diário também muda de PRONTO para CONFIRMADO e os registros ativos passam de R$ 60 para R$ 30. Só depois a leitura falha por arquivo inexistente ou conteúdo divergente. O catálogo já aponta para o novo destino defeituoso.

**Diferença em relação à correção anterior:** a manutenção usa retomarManutencaoProtecaoGestor_ e agora reconfere seus destinos. A restauração é retomada pelo diário financeiro, via aplicarPlanoGestor_/executarOperacaoGestor_, e esse caminho não recebeu a mesma conferência.

**Limite:** o arquivo anual antigo e a cópia anterior continuam preservados. Não foi demonstrada perda definitiva de todas as cópias. O defeito é confirmar a restauração e comprometer a consulta antes de validar sua dependência.

**Correção recomendada:** guardar os destinos e comprovantes no plano da restauração; reler antes de aplicar blocos financeiros e antes de confirmar, também na recuperação aprovada pelo usuário. Se não puder conferir, preservar o estado ainda não substituído e orientar a recuperação.

Fontes: shared/protecao.js:466–471; Backend/Code.gs:3853, 4177, 4215, 4941.

Prova com controles: [script de restauração](C:/Users/lucas/Documents/Codex/auditoria-dados-20261027-restauracao-anual.cjs), [resultados](C:/Users/lucas/Documents/Codex/auditoria-dados-20261027-restauracao-anual.json).

## 2. Média — aviso de atraso de terceiros ignora a data combinada de devolução

Em 27/10/2026, com R$ 120 a receber:

- Fatura de setembro, devolução em 14/11: acusa R$ 120 em atraso, embora a data combinada ainda seja futura.
- Fatura de outubro, devolução em 20/10: acusa R$ 0 em atraso, embora a data já tenha vencido.
- Fatura de setembro sem data combinada: também acusa atraso.

O indicador usa o mês bancário anterior ao atual. A data combinada já é armazenada, mas não participa desse cálculo. Os controles de fatura anterior/devolução vencida e de fatura atual/devolução futura deram os resultados esperados.

**Impacto:** não altera o saldo nem registra recebimento indevido; pode orientar uma cobrança antecipada ou deixar de destacar uma devolução vencida.

**Correção recomendada:** chamar de atraso somente uma devolução com data válida anterior a hoje. Sem data, apresentar como sem data combinada ou competência anterior, conforme o caso. O vencimento do banco continua separado. Não é necessário adicionar agora os atalhos Vencidos/Próximos 30 dias que já estavam em observação.

Fontes: Backend/Code.gs:1745–1746; index.html:5948–5950.

Prova: [cenários financeiros](C:/Users/lucas/Documents/Codex/auditoria-financeira-20261027.cjs), [resultados](C:/Users/lucas/Documents/Codex/auditoria-financeira-20261027-resultados.json).

## 3. Média — a mesma nota pode ser adicionada duas vezes por abas simultâneas

A conferência sequencial funciona: B adiciona a nota e, depois, A reconhece a conclusão. O problema permanece se ambas consultarem a ausência do comprovante antes de qualquer uma guardar a operação. Cada página gera uma identificação diferente; o servidor confirma duas notas iguais.

**Prova:** dois runtimes independentes executaram as funções reais de rascunho, adição e registro da operação, com armazenamento síncrono compartilhado e uma barreira controlando a ordem de execução. Duas operações foram enviadas ao backend real com planilha fictícia, que confirmou duas notas de mesmo texto, IDs distintos e revisão 1.

**Limite:** reprodução concorrente controlada em worker_threads, sem cliques em navegador. Duas notas independentes com texto igual continuam sendo um caso legítimo; não devem ser unidas pelo texto.

**Correção recomendada:** reservar a identidade da nota/operação por origem e conteúdo antes de guardar o envio, sob trava entre abas. Preservar rascunhos independentes e alterações posteriores.

Fontes: interface/usabilidade.js:302–309; index.html:4706–4714.

Provas: [concorrência em runtimes separados](C:/Users/lucas/Documents/Codex/auditoria-frontend-20261027-notas-workers.cjs), [resultado confirmado](C:/Users/lucas/Documents/Codex/auditoria-frontend-20261027-notas-workers.json), [controles sequencial e independente](C:/Users/lucas/Documents/Codex/auditoria-frontend-20261027-notas-concorrentes.cjs).

## 4. Média para corrigir cadastro — Pix incorreto pede uma ação de desfazer que não está disponível

**Situação:** cadastrar um empréstimo de R$ 120 com Pix por engano e tentar corrigir imediatamente para cartão.

O Pix é criado com pagamento bancário automático. A troca é recusada com orientação para conferir ou desfazer esse pagamento. Porém a atividade salvarEmprestimoWeb não oferece desfazer, e o editor só muda a situação da pessoa, A Receber/Recebido, sem reabrir o banco.

**Limite:** o guard preserva os dados. Excluir e cadastrar novamente é uma alternativa, portanto não existe impossibilidade absoluta de corrigir. Falta um caminho claro que preserve identidade e histórico.

**Correção recomendada:** oferecer correção explícita do Pix registrado incorretamente, com prévia e confirmação da marcação automática, preservando a situação do recebimento. Manter a proteção para não transferir pagamentos reais silenciosamente entre formas. Se a ação for adiada, a mensagem precisa orientar somente procedimentos disponíveis.

Fontes: Backend/Code.gs:261–264, 899, 3597, 4513. Prova no script e resultados financeiros do item 2.

## 5. Média, apenas em personalizações — fórmulas de outras abas escapam da proteção do arquivamento

Uma fórmula personalizada em Dashboard & Resumo, A43, com referência direta à célula H3 de Lançamentos, permaneceu idêntica após retirar uma linha financeira antiga. A célula H3 mudou de R$ 30 para R$ 70. A prévia autorizou e a manutenção confirmou.

A correção anterior restringiu fórmulas nas próprias abas financeiras. Não examina as referências originadas em outras abas da mesma planilha.

**Limite:** o simulador não calcula a fórmula. Foram conferidos a expressão preservada e o valor da célula referenciada antes e depois. O problema depende de uma personalização; não foi demonstrado em dados padrão do app.

**Correção recomendada:** durante a prévia da manutenção, verificar também as fórmulas das outras abas que dependam das regiões reorganizadas. Bloquear personalizações que não possam ser preservadas com segurança, antes de criar arquivos. Não reescrever endereços por tentativa.

Fontes: shared/protecao.js:233, 258, 272, 281.

Prova: [referência em outra aba](C:/Users/lucas/Documents/Codex/auditoria-dados-20261027-formula-outra-aba.cjs).

## 6. Média/baixa — abertura sem cópia local pode falhar antes da resposta válida da rede

O prazo de 3,5 segundos é útil quando existe HTML local: a cópia abre e a rede atualiza depois. Sem cópia, o mesmo prazo devolve 503, mesmo que a rede responda corretamente depois e antes do limite próprio de oito segundos. A resposta posterior fica no cache, mas a navegação que recebeu 503 já falhou; exige outra tentativa.

Três controles com relógio simulado:

- Com cópia, rede lenta: abriu o app e atualizou a cópia.
- Sem cópia, rede rápida: abriu normalmente.
- Sem cópia, resposta após o prazo de abertura: mostrou 503 e só depois guardou o HTML válido.

Isso depende de worker ativo sem HTML válido, por exemplo após preparação inicial malsucedida ou remoção do cache. Não é perda de lançamentos.

**Ajuste recomendado:** aos 3,5 segundos, usar a cópia se existir. Se não houver, continuar aguardando a mesma requisição até o prazo de rede, sem iniciar outro pedido. Mostrar erro quando a requisição falhar ou atingir o limite final.

Fontes: sw.js:13–35; tests/cache.test.cjs:55–58 confirma que o comportamento atual é intencional, mas ainda falta cobrir uma resposta válida lenta sem cache.

Provas: [script de navegação](C:/Users/lucas/Documents/Codex/auditoria-raiz-20261027-abertura-lenta.cjs), [resultados](C:/Users/lucas/Documents/Codex/auditoria-raiz-20261027-abertura-lenta.json).

## Melhorias pequenas úteis para o dia a dia

1. **Fixos: separar o vigente do programado.** Outubro com R$ 20 pagos e reajuste para R$ 25 em janeiro mantém o Mensal correto, mas o card de Fixos escolhe a competência mais recente e mostra R$ 25, Ativa/A Pagar, sem indicar janeiro. Mostrar a condição atual e, abaixo, R$ 25 a partir de 01/2027 evita parecer que a conta atual não foi paga. Fonte: Backend/Code.gs:1570–1586; index.html:6105–6107. Cenário incluído na prova financeira. Avaliação por payload e código, sem inspeção visual.
2. **Nome do mês no editor de empréstimos.** O campo inpEdEmpMesFat ainda aparece como Mês de Recebimento, embora guarde a competência da fatura, separada da data combinada. Usar Mês da fatura/competência e uma ajuda curta evitaria alterar a fatura ao tentar combinar uma devolução. Fonte: index.html:1241–1242. É uma inconsistência de texto, não um cálculo incorreto.
3. **Rascunhos mais fáceis de identificar.** Mostrar descrição, valor e forma, e pessoa nos empréstimos, além do horário. Hoje a lista usa descrição/pessoa ou o genérico Rascunho; várias cópias parecidas exigem abrir uma a uma. Pode continuar recolhida como hoje, sem novos menus. Fonte: interface/rotina.js:196.

Não recomendo acrescentar telas ou atalhos grandes nesta leva. São ajustes nas ferramentas existentes.

## Ordem recomendada

1. Dependências da restauração e confirmação segura.
2. Avisos de atraso e reserva concorrente de Notas.
3. Caminho de correção do Pix e proteção de fórmulas personalizadas.
4. Abertura lenta sem cache e os três ajustes de apresentação.

## Verificações e limites

- Suíte completa desta rodada: 459 aprovados, zero falhas/ignorados. Log: C:/Users/lucas/Documents/Codex/auditoria-suite-20261027.log.
- Provas de restauração, finanças, fórmulas, concorrência das notas e navegação foram executadas com controles e dados fictícios. Os scripts dos três primeiros grupos e das notas foram reconferidos antes da consolidação.
- Os controles financeiros direcionados também passaram: 20 testes de Pix, fixos, devoluções após antecipação, datas nativas, Horizonte e limite.
- As correções anteriores de envio financeiro entre abas, retomada da manutenção, fórmulas nas abas financeiras e escopo da edição Pix continuam passando na suíte.
- Nenhuma falha inédita adicional foi confirmada em calculadora, divisão rápida/detalhada, simulador, colagem Pix ou transferência ao formulário. Isso não prova ausência de qualquer defeito futuro.
- Não foi feita nova verificação visual em navegador/celular, nem conferência de autenticação/permissões na implantação real. Não apresento configurações consultadas em outra data como conferidas hoje.
- Limites conhecidos de backup/restauração e anexos em commits antigos não foram contados novamente como problemas novos.
- Nenhuma fonte, teste do projeto, planilha real, configuração de serviço, commit ou implantação foi alterada. O relatório é a única adição ao repositório; provas ficam fora dele.
