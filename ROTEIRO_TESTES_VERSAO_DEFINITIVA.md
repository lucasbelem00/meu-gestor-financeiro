# Roteiro para liberar o Gestor de Gastos definitivo

Preparado em 30/10/2026; orientação por módulos atualizada em 03/11/2026. Protocolo 17 e cache v71 identificavam o pacote original; para o estado atual, consultar CONTEXTO_COMPLETO_PARA_AUDITORIA_20261103.md. A continuação está em `PACOTE_BACKUP_PLANEJAMENTO_20261031.md`; a correção das datas/pendência e a explicação das metas estão em `CORRECAO_DATAS_NOTAS_PLANEJAMENTO_20261031.md`.

Use as caixas para anotar o resultado real. Elas estão desmarcadas porque os testes locais automatizados não substituem os passos na sua conta. Faça primeiro na **Cópia de Gestor de Gastos**; restauração e ensaio de virada usam uma cópia separada, descartável. Não precisa testar tudo de uma vez: siga a ordem e registre onde parou.

## 1. Preparar o teste

- [ ] Baixar e guardar um backup JSON completo e confirmar que o arquivo abre e não está vazio. Guardar também uma cópia da planilha anterior à atualização.
- [ ] Confirmar que o projeto Apps Script de teste aponta, pela propriedade `GESTOR_PLANILHA_ID`, para a **Cópia de Gestor de Gastos**, e não para a definitiva.
- [ ] Atualizar `Backend/Code.gs` e os HTMLs distribuídos, publicar a nova versão do Apps Script e atualizar a interface no endereço de testes usado pelo app. Não copiar tokens, IDs nem gatilhos de teste para a definitiva.
- [ ] Atualizar o app instalado e conferir uma mudança visível: o botão **Copiar texto** no campo de Notas. Ele diferencia este pacote do anterior.
- [ ] Em Atividade e sincronização, conferir se há envios pendentes antes de iniciar. Resolver a confirmação pelo próprio app; não limpar o armazenamento do navegador para esconder uma pendência.

Anote um cartão e uma categoria usados apenas no teste. Se usar um cartão que já tem dados, anote o saldo anterior e compare os aumentos descritos abaixo.

## 2. Cadastro, parcelas e Pix

| Fazer | Resultado esperado |
| --- | --- |
| [ ] Cadastrar `TESTE — pessoal` de R$ 100 no cartão, uma parcela | Uma compra, R$ 100 na competência escolhida, ⚡ À vista e saldo bancário aumentado em R$ 100 |
| [ ] Cadastrar `TESTE — Pix` de R$ 10, uma parcela | Pagamento imediato no mês, sem virar saldo bancário de cartão |
| [ ] Cadastrar `TESTE — parcelas` de R$ 100 em 3x | Valores somam exatamente R$ 100, incluindo o ajuste dos centavos, nos três meses corretos |
| [ ] Editar apenas descrição/categoria/tags de um registro | Valor, competência e pagamento não mudam por esse motivo |
| [ ] Tentar data impossível e ano como 2926 | App recusa e preserva os campos para correção, sem criar registro |

Recarregue o app e confira esses registros também na planilha. Não deve existir um segundo registro só por atualizar a página.

Complemento de 03/11/2026 (cache v116; última suíte local: 936 testes): na cópia de testes, criar compra de R$ 100 em 5x e pagar somente a primeira parcela de R$ 20. Excluir as outras abertas: deve restar a paga, mantendo 1/5 e o pagamento, com total da compra recalculado para R$ 20. Conferir também exclusão individual de uma parcela aberta e desfazer da exclusão em Atividade. Não excluir o registro pago para testar esse recálculo. O caso entre ano aberto/fechado e recuperação após interrupção foi ensaiado automaticamente com dados fictícios; falta conferir a implantação real. A correção exige a nova versão do backend e o frontend correspondente.

## 3. Pagamento ao banco e recebimento de terceiros — teste principal

Use uma competência de teste sem outros gastos, ou compare sempre a diferença em relação aos valores anteriores. A compra parcelada do passo anterior deve ficar em outro cartão/período para não entrar nesta conta.

1. [ ] Na mesma fatura da compra pessoal de R$ 100, cadastrar empréstimo `TESTE — pessoa` de R$ 40, uma parcela, ainda **A receber**.
2. [ ] Abrir **Conferir fatura**. O aumento do total deve ser **R$ 140**: R$ 100 pessoais e R$ 40 de terceiros. Não deve zerar só porque o gasto é de outra pessoa.
3. [ ] Registrar **R$ 50** pagos ao banco. Na fatura de teste, deve restar **R$ 90**. Conferir a distribuição exibida antes de confirmar; uma baixa parcial não significa que todos os itens ficaram quitados.
4. [ ] Registrar os **R$ 90 restantes**. O saldo bancário deve zerar e aparecer quitado. O valor gasto continua no total do mês/Horizonte.
5. [ ] Abrir Empréstimos. A pessoa ainda deve **R$ 40**, pois pagar ao banco não significa receber dela.
6. [ ] Registrar **R$ 15 recebidos**. Devem continuar **R$ 25 a receber**; o banco continua quitado.
7. [ ] Registrar os **R$ 25 restantes**. A cobrança fica recebida, mas continua no histórico daquele mês.
8. [ ] Em outro empréstimo de teste, fazer a ordem inversa: receber da pessoa antes de pagar a fatura. O recebimento não deve quitar o banco.

Se uma gravação ficar sem confirmação, não cadastrar de novo com outra identificação. Consultar a confirmação em Atividade e conferir a planilha. Se continuar divergente, copiar o diagnóstico e anotar o horário, cartão/mês e o que foi feito.

## 4. Fixos, filtros, Painel e Agenda

- [ ] Complemento de 03/11 (v118, 961 testes locais): com meta de categoria de R$ 1.000, conferir no formulário e termômetro valores de R$ 799,99, R$ 800, R$ 996, R$ 1.000 e R$ 1.000,01. Esperado: verde, âmbar, âmbar, âmbar e rosa, respectivamente. R$ 996 pode mostrar 100% por arredondamento, mas deve preservar a margem de R$ 4 e não indicar excesso. A ajuda do Painel deve explicar que os totais seguem a competência da fatura, incluindo pagos e em aberto. Não há alteração dos cálculos financeiros ou nova ativação de backend nesse complemento; conferir o frontend publicado.

- [ ] Criar um fixo de teste no cartão e outro no Pix. Conferir competência, situação e valor pago conforme a forma. Recarregar duas vezes: não pode duplicar a ocorrência.
- [ ] Conferir a próxima competência que já tenha outro registro: a ocorrência fixa deve respeitar a regra existente; não deve criar meses indefinidamente só por abrir a tela.
- [ ] Programar alteração futura de valor e categoria. A legenda deve informar o período e somente o que mudou.
- [ ] Na Mensal, combinar uma categoria, uma tag, uma forma e uma situação. Comparar a quantidade e a soma com os registros exibidos. O X do resumo azul limpa a combinação inteira.
- [ ] Sair da Mensal, abrir outro lugar e voltar: deve selecionar o mês vigente, sem depender de todos os cartões estarem pagos.
- [ ] No computador, gráfico à esquerda e Horizonte à direita; no celular, Horizonte e gráfico empilhados, sem apertar a tabela para caberem juntos.
- [ ] Dar uma data combinada de devolução diferente da competência da fatura. A Agenda deve colocar a devolução na data combinada e a fatura no vencimento do cartão.
- [ ] Marcar o empréstimo como recebido e quitar a fatura. Após atualizar os dados, os compromissos correspondentes devem sair da Agenda. Os históricos permanecem.
- [ ] Remover a data combinada de outro empréstimo. Ele continua a receber, mas não pode virar um atraso sem data na Agenda.
- [ ] Trocar mês, tipo e dia na Agenda. Ano inválido deve limpar os resultados anteriores e pedir uma competência válida.

## 5. Ferramentas e celular

- [ ] Notas: escrever duas linhas e tocar **Copiar texto**, sem adicionar. Colar em outro campo: texto e quebras iguais, sem criar nota. Depois adicionar a nota e testar seu **Copiar** na lista.
- [ ] Editar uma nota salva e copiar antes de salvar: **Copiar texto** leva a edição; **Copiar** na lista leva o conteúdo já adicionado. Cancelar a edição deve preservar a nota salva.
- [ ] Calculadora: copiar zero, valor negativo e valor decimal. Expressão incompleta não deve copiar resultado antigo.
- [ ] Rachadinha: R$ 100 para duas pessoas iguais → R$ 50 para cada; depois conferir um caso por itens e outro em que você adiantou o total. Quem pagou ao estabelecimento e quem ainda deve a quem devem ficar claros na prévia.
- [ ] Complemento de 03/11 (v117, suíte local de 949 testes): registrar conjuntamente R$ 100 em duas partes de R$ 50, cartão em 3x. A prévia e Conferir fatura devem mostrar R$ 33,34 / R$ 33,33 / R$ 33,33, preservando R$ 50 por pessoa. Repetir com parte própria omitida e conferir apenas o total escolhido para registro. Não usar divisões antigas já pagas para esse ensaio; não há rebalanceamento retroativo.
- [ ] Em empréstimo de teste com parcela de R$ 100, receber R$ 40 e editar o restante de R$ 60 para R$ 70. A confirmação deve informar R$ 40 recebidos preservados e novo total da parcela de R$ 110, tanto no escopo individual quanto nas próximas a receber. Conferir que os R$ 40 não foram alterados. O pacote exige backend e frontend correspondentes.
- [ ] Preencher minha parte sem duplicar o registro. A descrição não deve receber “(minha parte)”. Conferir os centavos e o aviso antes de substituir campos preenchidos.
- [ ] Simulador: conferir total e parcelas, prévia editável e cópia para WhatsApp. Simular não pode criar compra sem a ação explícita de preencher/gravar.
- [ ] Abrir o Menu e voltar pelo botão/gesto do celular: fecha o Menu. Reabrir deve destacar a página ou ferramenta atual.
- [ ] Conferir botões com o teclado aberto, voltar ao topo, busca e filtros no celular. Nada deve ficar inacessível atrás da navegação.

## 6. Sincronização e recuperação

Complemento de 03/11/2026 (cache v115; última suíte local: 926 testes): conferir a área de revisão dos rejeitados em Atividade. Ela deve preservar o conteúdo e motivo, permitir copiar/consultar, recolocar somente o pedido original e criar rascunho de correção apenas após cancelamento confirmado. Um envio já gravado ou em conferência não pode gerar outra compra. Revisões resolvidas continuam consultáveis na seção recolhida. A ordem de inclusão usa metadados locais, sem modificar o pedido enviado. Cenários de cinquenta inválidos e falha de armazenamento foram ensaiados com dados fictícios automatizados; não corromper a fila real para reproduzi-los. A validação do PWA publicado continua pendente.

- [ ] Abrir a cópia de testes no computador e celular. Gravar um item simples no primeiro e atualizar o segundo: deve aparecer uma vez, com o mesmo valor.
- [ ] Abrir uma edição no computador, alterar o mesmo item no celular e tentar salvar a edição antiga: o conflito deve ser informado, sem substituir silenciosamente a alteração mais nova.
- [ ] Ficar sem conexão antes de enviar um cadastro de teste. Conferir a pendência; reconectar e seguir a ação protegida do app. O resultado final deve ter somente uma compra, inclusive se o envio for repetido pelo fluxo protegido.
- [ ] Em caso de resposta perdida depois de gravar, conferir a confirmação antes de tentar outra compra. O app deve distinguir “sem confirmação” de “não gravou”. Não é necessário provocar queda da conexão se não for possível controlar esse teste com segurança; registre como não testado.

## 7. Organização anual, backup, PDF e restauração

- [ ] Em Exportar dados e backup, conferir **Proteção automática: ativada**, **Organização anual: ativada** e **PDFs automáticos: ativados**. O nome da base de controle deve ser o de testes.
- [ ] Executar a rotina existente `rotinaProtecaoProgramadaGestor` no projeto de testes para conferir a apresentação anual agora. Ela também faz a manutenção habitual: não é uma função apenas de formatação. Não é necessário criar outro gatilho.
- [ ] Abrir a pasta de backups e verificar os arquivos gerados, as datas e o período. A rotina deve completar sem aviso pendente; a geração pode ocorrer em etapas. Clicar em atualizar situação para acompanhar.
- [ ] Abrir a base anual e conferir doze meses do ano correto, cabeçalhos e totais. Nenhuma fórmula pode apresentar erro. Comparar uma competência com a Mensal e Empréstimos; ano fechado compara o retrato do fechamento, pois movimentos posteriores ficam no webapp.
- [ ] Criar compra de teste em duas parcelas começando em dezembro. Confirmar uma parcela no ano inicial e outra em janeiro do ano seguinte, sem duplicação e acessíveis pelo mesmo app. Não alterar o relógio nem o ID do controle para isso.
- [ ] Conferir PDF de um mês concluído e PDF anual de um ano concluído disponível. Abrir o arquivo e comparar período, total, situações e data da geração com o relatório correspondente. PDFs automáticos de períodos concluídos não significam um PDF completo de todo mês futuro.
- [ ] Baixar JSON completo e **restaurá-lo somente numa outra cópia descartável**, com projeto/configuração apontando para ela. Conferir a prévia, contagens, totais, anos, notas, cadastros e ajustes posteriores ao fechamento. Confirmar a restauração só nessa cópia.
- [ ] Depois de restaurar, consultar os anos pelo app e conferir que a cópia não depende dos arquivos anuais da base original para recuperar seus registros.

Não é possível provar a passagem real do tempo só clicando nas abas. A virada e o fechamento devem ser ensaiados com cenários fictícios no ambiente de testes; a primeira execução agendada real também precisa ser acompanhada. Até lá, anote essa parte como ainda não validada na conta.

## 8. Liberar a definitiva

Atualização de 03/11/2026: usuário informou atualização/publicação do Apps Script definitivo e cadastro das propriedades; valores e destino ainda não validados por consulta autenticada. Vercel confirmou All Deployments e os dois pares de variáveis separados entre Preview e Production, sem leitura dos valores. Código local remove agora o bloqueio absoluto de Production. Publicar o commit contendo essa mudança no ambiente Production, repetir POST anônimo (401/redirect de autenticação) e consultar base autenticada antes de gravar. Não basta redeploy de commit antigo: ele mantém o bloqueio 404.

Só avançar quando os testes essenciais acima estiverem aprovados, sem divergência de totais ou pendência desconhecida. Guardar uma lista do que ainda não foi testado.

1. [ ] Fazer backup completo da **Gestor de Gastos** definitiva e guardar a versão anterior do código/implantação para retorno.
2. [ ] Atualizar código e interface no ambiente definitivo, preservando seu próprio ID, token, endereço e configuração de acesso. Conferir o guia `SEGURANCA_VERCEL.md`; a proteção da branch de teste não comprova proteção do endereço definitivo.
3. [ ] Confirmar no app o nome da base definitiva e os estados de proteção/organização/PDF. Conferir permissões no projeto correto. Gatilhos pertencem ao projeto e à conta que os instalou; não presumir que a cópia transportou isso.
4. [ ] Fazer consultas de Histórico, Mensal e Agenda e comparar um mês conhecido com a planilha. Não levar os lançamentos fictícios para a definitiva.
5. [ ] Fazer o primeiro lançamento real da rotina, conferir sua gravação única e atualizar no outro aparelho.
6. [ ] Acompanhar a primeira rotina agendada, o primeiro backup mensal e o fechamento anual quando ocorrerem. Registrar erro/diagnóstico antes de qualquer tentativa de correção manual.

Se aparecer divergência financeira, duplicação, perda de notas, fórmula com erro ou recuperação que não conclui, a versão ainda não está liberada. Voltar ao ponto do teste que falhou e corrigir na cópia antes de continuar.

## Sugestões de Menu para discutir

**Prioridade sugerida: Metas de reserva ou compra.** Exemplo: “Reserva de emergência — R$ 500 de R$ 2.000”. Teria objetivo, prazo opcional e progresso informado por você, claramente separado do limite de gastos e sem fingir conhecer o saldo bancário. Complementa a Agenda: uma planeja datas, a outra acompanha um objetivo.

**Outra possibilidade: Lista de compras planejadas.** Descrição, estimativa e prioridade; abrir o simulador a partir de um item e dar baixa somente quando você registrar a compra. Só vale acrescentar se você costuma guardar essas intenções nas Notas. Não deve duplicar o simulador nem gerar lançamentos automaticamente.

As propostas foram implementadas na continuação de 31/10: Menu → Planejamento → Metas e compras planejadas, com dados na planilha e no backup. Conferir também os passos do pacote de 31/10 antes de liberar a definitiva.

## O que já foi conferido no código deste ajuste

- **682 testes locais passaram, zero falhas.** As caixas acima continuam desmarcadas para a conferência da implantação real.
- Copiar no editor lê o texto atual, preserva as linhas, recusa campo vazio e não modifica a nota salva. Na prévia do navegador, a área de transferência recebeu as duas linhas fictícias e a lista continuou com zero notas; nenhuma chamada de salvamento foi feita.
- Período inválido na Agenda agora remove os compromissos antigos e desativa a navegação até a correção do período.
- Prévia local com dados fictícios: gráfico à esquerda do Horizonte no computador, mesma altura de início; no celular, Horizonte antes do gráfico. Sem rolagem horizontal nos tamanhos observados e sem erros/avisos de console no fluxo de cópia.
- Build, espelhos da interface e módulos incorporados conferidos. Não houve publicação, alteração do backend financeiro ou escrita nas planilhas reais neste ajuste. Os novos controles não exigem função manual de ativação.


Módulo 7: calcular 50,33 com acréscimo de 10%; conferir 55,36 no visor, histórico e cópia. Conferir extrato com mesmo valor em datas separadas por um/dois dias, inclusive virada de mês/ano: deve sugerir, manter registros sem correspondência e não registrar pagamento. Datas com três dias de diferença e valores diferentes não sugerem; correspondências estritas continuam prioritárias.


Módulo 8: excluir item com concluídos ocultos e outro rascunho aberto; somente o escolhido sai e rascunho permanece. Cancelar confirmação não altera nada. Excluir o item editado avisa sobre o rascunho e só limpa após sucesso. Alterar campos durante confirmação deve invalidá-la. Conflito entre aparelhos deve preservar estado; resposta incerta não deve gerar segundo pedido. Meta reservada acima do objetivo mantém percentual real, barra até 100%.


Proteção: estado saudável/desativado/em ativação não exibe alerta. Falha registrada exibe um único aviso no Painel; Conferir proteção abre detalhes. Após execução resolver a falha e Atualizar situação confirmar estado saudável, aviso desaparece. Falha na consulta não deve apagar aviso anterior.


## Matriz de validação por módulos

Complementa os passos anteriores; não substitui suas instruções. A numeração é a do mapa de módulos, não a das seções deste roteiro. Registrar versão/ambiente, cenário, esperado, observado e evidência sem dados privados. Estados sugeridos: não testado, aprovado, falhou ou bloqueado. As caixas abaixo ficam vazias até execução prática.

| Conferido | Módulo | Cenário mínimo na base de testes |
| --- | --- | --- |
| [ ] | 1 — Segurança/API | Pedido inválido é recusado sem gravação; conferir acesso e destino corretos, sem expor credenciais. |
| [ ] | 2 — Offline/PWA | Criar offline, reconectar e repetir pedido sem duplicar; duas abas; revisar rejeitado e envio incerto. |
| [ ] | 3 — Pessoais/recorrências | Parcelar com centavos, pagar parcialmente, editar/excluir abertos e conferir totais; pular e retomar recorrência. |
| [ ] | 4 — Terceiros/divisão | Dividir R$ 100 em duas partes e três parcelas; conferir soma de cada fatura; receber parcialmente sem quitar banco. |
| [ ] | 5 — Painel/Agenda | Limite abaixo/em/acima de 100%, datas de hoje/atrasadas e vencimento em dia não útil; separar registrado e previsto. |
| [ ] | 6 — Relatórios/PDFs | Conferir Mensal/Anual/PDF com a mesma base; comparar meses equivalentes; mostrar metas zeradas sem filtro vazio. |
| [ ] | 7 — Ferramentas | Percentual na calculadora e cópia; unidades equivalentes; extrato com diferença de dois e três dias; simulador sem gravar gasto. |
| [ ] | 8 — Notas/Planejamento | Editar a mesma nota em dois aparelhos; proteger rascunho; excluir planejamento preservando concluídos ocultos e outro editor. |
| [ ] | 9 — Configurações | Renomear cartão e categoria, arquivar, reordenar e conferir histórico/aliases; alterar padrão sem modificar classificações antigas. |
| [ ] | 10 — Backup/anual | Em cópia descartável: exportar/restaurar e conferir totais, testar pendência anterior à restauração, retomada e virada anual; conferir aviso de falha e resolução. |

Depois dos testes individuais, executar um fluxo integrado: cadastrar → parcelar/dividir → pagar banco/receber pessoa → consultar relatórios → exportar → restaurar em cópia descartável → conferir novamente. Repetir parte do fluxo em dois aparelhos e com interrupção de rede. Não provocar falhas de armazenamento nem mudar o ano da base definitiva para testar.

Novo: informar R$ 250 em 3 parcelas e conferir 1ª de R$ 83,34 e demais 2 de R$ 83,33. Início 2 deve mostrar somente duas de R$ 83,33. Clicar em À vista deve ocultar Início, retornar ambos os campos a 1 e preservar valor, descrição e tags; recarregar e conferir rascunho.

Novo/Parcelas: em 1, deve mostrar À vista. Tocar limpa a quantidade e permite teclado numérico; sair vazio ou com 1 restaura À vista. Digitar 3 mostra 3 e Início. Voltar pelo atalho À vista e restaurar rascunho devem sincronizar o rótulo sem enviar texto no lugar de números.


Auditoria em três partes: criar recorrência com perfil diferente da categoria, gerar próximo mês e editar condição para mês ainda inexistente; perfil deve persistir. Trocar padrão da categoria não muda essa série. Criar fatura R$ 300, pagar R$ 100 e editar descrição: pago permanece R$ 100; editor não altera situação financeira. Registrar recebimento e desfazer por Atividade continuam separados do banco. Reordenar cartões: resumo/formulas ficam na posição e fórmulas de cadastro móvel geram bloqueio sem gravação. Conferir dia anterior/exato/posterior ao fechamento e virada anual; não deslocar fechamento por feriado. Verificar proteção da API sem credencial em ambiente controlado e confirmar regra de fechamento com cartão real.


Pacote de desempenho conservador: após atualizar frontend e Apps Script, conferir apenas os fluxos afetados: abrir Painel e Mensal, consultar Histórico da Atividade, conferir uma ação reversível e copiar Diagnóstico. Se houver pendência real, confirmar que continua visível e preservada. Não criar uma pendência incerta artificial na base definitiva. Diagnóstico de armazenamento mostra contagens/estimativas sem textos de gastos; não mede espaço livre. Os testes manuais anteriores continuam válidos, sem necessidade de repetir tudo por este pacote.


Relógio civil (v130): após atualizar frontend e Apps Script, copiar Diagnóstico e conferir fuso/origem da referência. Verificar Hoje/Ontem, mês atual da Mensal e destaque de hoje na Agenda. Reabrir offline depois de uma consulta online e conferir o calendário; manter uma data manual preenchida e verificar que sincronizar não a altera. Não precisa mudar o relógio do aparelho real: viradas e fusos diferentes já têm testes automatizados. Se mudar horário do dispositivo enquanto estiver offline, reconectar para obter referência confiável.


Acesso definitivo: Vercel → projeto meu-gestor-financeiro → Security/Deployment Protection → Vercel Authentication → All Deployments. Conferir ausência de exceção pública para o domínio do app. Testar página e /api/gestor sem sessão: devem exigir autenticação. Manter bloqueio de produção do proxy até verificar essa proteção. Login usa conta Vercel autorizada; não enviar tokens de ambiente no chat. POST anônimo da branch de testes já retornou 401 em 03/11/2026.


Proteção verificada em 03/11/2026: Vercel Authentication → All Deployments ativado por autorização de Lucas. POST anônimo em /api/gestor de produção e da branch New retornou 401. Etapa de proteção de acesso destes endereços concluída; manter bloqueio de produção do código até preparar backup/destino e liberação controlada.
Registro da migração em 03/11/2026: cópia nativa pré-migração da definitiva criada com autorização e metadados conferidos (pasta de backups, sem compartilhamento). Isso não conclui sozinho o item de backup completo/retorno de implantação: JSON, propriedades e gatilhos são verificações separadas. Apps Script da definitiva localizado; ainda sem propriedades de conexão e com interface antiga. Produção permanece bloqueada e sem variáveis configuradas. Aguardar criação da credencial pelo usuário antes de configurar a conexão definitiva e testar consultas reais.
