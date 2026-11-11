# Roteiro para liberar o Gestor de Gastos definitivo

Reteste visual v180 — Pix: percentual normal/80%/100%/acima100% segue valores de referência já existentes, com textos Referência atingida/excedida e estado neutro sem limite válido. Terceiros do mês incluem recebidos; meses futuros não entram na linha mensal. Total no mês soma somente pessoal/terceiros da competência, não recebíveis gerais ou pagamentos futuros. Resumo global a receber continua no Painel. História/categoria/forma clicáveis seguem como proposta, ainda não implementadas. Conferir celular/computador após publicar frontend.


Reteste visual v179 — Pix: confirmar valores de referência preservados e rótulos próprios, gasto pessoal atual, pagamentos futuros só quando presentes, gastos de terceiros do mês e saldo a receber de todos os meses (incluindo devolução parcial/futura). Recebidos não permanecem no saldo a receber e recebíveis não entram em pagamentos futuros nem Total Faturas. Sem dados de terceiros, campos extras desaparecem. No Horizonte, Pix fica após Total Faturas e antes de Terceiros Fora dos cartões, em Total do mês e A pagar; totais e meses não mudam. Testar celular/computador e cadastro renomeado de Pix; nenhuma consulta adicional deve ser enviada só por renderizar estes rótulos.


Reteste visual v178 — Horizonte: formas/Total Carteira/Terceiros Nos cartões/Total Faturas/Terceiros Fora dos cartões; conferir espaço/divisória e ocultação da última linha sem registros. Mesmos totais em Total do mês e A pagar; Pix de terceiros não entra em Total Faturas. Tocar cada Terceiros deve identificar a origem no detalhe. No celular, coluna fixa e rolagem de comparação continuam funcionais. Conferir fatura, Total Faturas e Seus gastos na fatura usam mesmo roxo-base, preservando cores situacionais. Consultar terceiros deve conservar 🤝 após atualização dinâmica. Pix completo ainda é proposta, não mudança entregue.


Reteste visual v177 — Cartões e total agregado: conferir abaixo de80%, exatamente80%, antes de100%, exatamente100% e acima100%, incluindo percentuais que arredondariam à faixa errada. Badge azul/âmbar/vermelho com texto atingido/excedido, sem mudar limite/disponível. Verificar título Seus gastos na fatura em roxo e terceiros em âmbar, nome longo no celular, modo Gerenciar e Pix preservado. 🤝 Consultar terceiros abre a mesma lista com recebimentos/cobrança. Conferência visual em celular/computador pendente.


Reteste v176 — Publicar backend/frontend juntos. Novo/Edição/Exclusão em anos abertos, consulta de ano fechado, alteração externa e fórmula devem manter recusas/conferências. Em cópia de testes, falha após PRONTO e replay continuam recuperáveis. Planos grandes devem usar partes JSON de até 20 mil caracteres, sem células acima do limite; comprovantes antigos de 12 mil continuam legíveis. Medir diarioPartes/diarioCaracteresPlano, diarioMs, leituraAnosMs e total, sem pressupor ganho em planos pequenos. Retorno ao app durante envio pode exigir consulta completa; não afirmar falha de salvamento nem cancelar envio por navegar. Propostas de cores/textos ainda não fazem parte deste pacote.


Reteste v175 — Publicar backend/frontend do complemento. No editor, executar reprocessarRelatoriosPDFGestor, depois Atualizar situação no app. Log deve identificar versaoRotina 2; sucesso limpa erro anterior, falha informa causa sem apagar PDFs. Se houver mais períodos pendentes, cada execução limita a dois e novas chamadas não duplicam arquivo confirmado. Bloquear destino/proteção/pendências incompatíveis. Próximo diagnóstico deve conservar configProtecaoLeituras e configProtecaoReusos numéricos, excluindo campos não permitidos. A ordenação do Histórico foi discutida, mas não alterada neste pacote.


Reteste v174 — Publicar Apps Script e frontend. Criar cartão de teste e editar limite: Total da Carteira deve somar cartões ativos imediatamente após confirmação; Pix/à vista/resumo/arquivados não entram no limite total. Conferir disponível/uso, seletor e simulador. Fórmula particular no cadastro deve conservar fallback seguro; não sobrescrever personalizações da planilha. Novo/Edição/Exclusão e recuperação de envio interrompido continuam idempotentes, sem antecipar sucesso. Comparar configProtecaoLeituras/configProtecaoReusos e duração das etapas em nova rodada; uma redução de chamadas não garante duração fixa.

PDFs: Atualizar situação após execução programada; no erro de competência convertida, a rotina deve retomar e limpar erro após sucesso, sem duplicar ou apagar arquivos. Em cópia de testes, Date no primeiro dia e ano numérico devem representar mesmo período; outro dia/mês, hash alterado, arquivo corrompido ou duplicata continuam bloqueados. Gráficos de 2, 3, várias categorias: conferir vizinhas e fechamento, legenda e dados iguais no computador/celular.


Reteste v172 — Publicar frontend e Apps Script juntos. Registrar pagamento e recebimentos integral/parcial: conferir saldo de banco e pessoa independentes, atualização sem segunda carga completa quando elegível, repetição protegida sem duplicata. Fórmulas particulares/falha de retrato devem exigir consulta habitual sem transformar salvamento confirmado em erro. Editar/excluir em Histórico: mesma primeira página/filtros recebe lista e soma atuais; trocar filtros ou aba durante envio usa fallback; Carregar mais reconfere primeira página e versão antes de continuar. Conferir botão de salvar não fica preso após bloqueio aninhado; fechar/reabrir não permite duplo envio nem resposta antiga liberando sessão nova.

Simulador: preencher nome, total, data e parcelas; Levar ao planejamento deve pedir confirmação e abrir rascunho com nome/total/data, permitindo escolher Compra ou Meta. Não salvar até ação explícita. Rascunho anterior exige confirmação; cancelar preserva; mudança na simulação durante confirmação recusa transferência desatualizada. Campos cartão/parcelas permanecem no simulador. Testar nos dois aparelhos e medir carga total, número de consultas e historicosConfirmados; não prometer redução fixa nem confundir resumo pendente recente com falha.


Reteste v171 — Conferir fatura: trocar rapidamente cartão/mês pelas setas e seletor; só uma consulta resumida em voo e última seleção aguardando precisa ser enviada. Mesma seleção em voo compartilha consulta; Atualizar após terminar envia novamente. Erro da primeira não prende a última; fechar/reabrir modal não mostra resultado anterior nem libera pagamento sem prévia atual. Durante alteração financeira, geração distinta não deve compartilhar autorização antiga. Comparar contagem de obterFaturaPagamentoWeb, SERVICO_OCUPADO e espera de trava.

Histórico: voltar rapidamente conserva lista/páginas carregadas se não houve mudança. Após 15s ou mudança financeira/foco/filtros, reconferir mantendo cards anteriores e aviso explícito. Carregar mais e nova busca não se confundem. Em edição, salvar, fechar/cancelar e reabrir outro item: não herdar disabled; resposta anterior não altera sessão nova. Duplo envio segue impedido. Conferir Voltar no celular e teclado; fechar durante envio não é estorno e pendência continua visível em Atividade se faltar confirmação.

Empréstimos: informar saldo inteiro de uma parcela e receber confirmação integral; informar valor menor e receber confirmação parcial com restante; ambas exigem concordância e não pagam banco. Criar recorrência preserva uma única dívida original e prepara somente próximos meses. Simulador: 1 exibe À vista, foco permite digitar 2+, saída vazia restaura 1, atalhos 3/6/12 atualizam número e resultado. Planejamento → Simular mantém confirmação existente; atalho de volta não cria compra nem altera meta automaticamente. Validação visual/real v171 ainda pendente.


Reteste acumulado v170 — Publicar backend/frontend juntos e executar cenários v168/v169. Conferir datas, moedas e textos em Novo/Edição/Histórico/Mensal/Anual, incluindo registros de planilha com formatação e fórmulas legítimas já suportadas. Alterações virtuais precisam aparecer na prévia sem modificar planilha antes da confirmação. Datas da compra/parcela/fatura continuam normalizadas, ano fechado preserva informação de retrato. Outro aparelho e alteração externa entre prévia e confirmação continuam causando reconferência/recusa adequada. Medir filtroLeituraMs/execução/preparação junto dos contadores v169; reaproveitar matriz em memória não significa dispensar leitura do servidor.


Reteste acumulado v169 — Publicar backend/frontend e executar também cenários v168. Verificar Novo, Edição, Exclusão, consulta Mensal/Anual, pagamento parcial e total com terceiros, Histórico de Atividade/Desfazer. Conferir categorias e metas incluindo linhas vazias e fórmulas legítimas nos valores; identidade/tipo com fórmula devem continuar recusados. Em cópia de testes, alteração externa no ano aberto após prévia deve ser detectada; ano fechado alterado e identidade anual incompatível continuam bloqueados. Repetição de requestId não duplica. Troca de base e nova requisição não devem reutilizar referência antiga.

Coletar planilhasAbertas/planilhasReutilizadas/abrirPlanilhaMs, leituraAnosMs e subetapas anteriores. Contagens não medem chamadas de leitura: mesmo uma referência reutilizada precisa conferir células atuais. Não somar duração de abertura às etapas que já a incluem. Confirmar resumo em segundo plano e backup continuam concluindo com app fechado. Não há promessa de ganho fixo de tempo; comparações precisam separar espera por trava, serviço e renderização.


Reteste v168 — Publicar Apps Script e frontend sem reativar o resumo/proteções já ativos. Em Conferir fatura, clicar uma vez: “Conferindo…” deve surgir imediatamente; clique repetido não envia outra prévia. Falha de rede restaura botão sem registrar pagamento. Alterar valor/mês durante espera recusa confirmação antiga; fechar/reabrir outra fatura não recebe estado atrasado. Após prévia válida, confirmar pagamento parcial/total em teste controlado; verificar saldo ao banco e recebível de terceiros separados, Atividade e Desfazer conforme elegibilidade. Resumo pode ficar pendente após confirmação financeira e atualizar depois pelo gatilho. Comparar resumoMs e duração do pagamento com rodada anterior; não exigir redução fixa.

Durante consulta de Recorrências, Atividade ou Histórico, ocultar app/alternar para outro: leituras novas/repetições devem esperar retorno; evento de retomada invalida antes de liberar. Consultas internas e salvamento continuam mesmo oculto, sujeitos à confirmação existente; nenhum envio incerto vira sucesso presumido. Conferir esperasConsultas motivo tela_oculta, descartadas e total de envios. Não remover invalidação para tentar zerar descartes. Validar nova consulta após alteração no segundo aparelho.


Reteste v167 — Publicar Apps Script e frontend, sem reativar proteção/resumo já configurados. Com uma operação em andamento, buscar Histórico, abrir Atividade/Recorrências/Mensal/Anual: se o servidor responder ocupado, conferir duas repetições no máximo, sem botão Salvar ser reenviado. Durante pausa, alterar busca ou sair da tela: consulta antiga não deve insistir. Resultado anterior fica visível, soma antiga escondida e ações bloqueadas até sucesso; falha mantém aviso claro, sem tratar lista como busca atual. Reconsultar libera lista correta. Verificar paginação e troca rápida de filtros.

Observar tarefas automáticas com app em uso recente: resumo pode continuar pendente e proteção pode reagendar retomada; após orçamento de adiamento, devem voltar ao fluxo normal (horário final depende do Google). Conferir atualização do resumo e último backup no Drive após retomada, inclusive fechando app. Backup manual continua executável; nenhum gatilho diário removido. Rodada de desempenho: Novo, Edição, filtro, Atividade, Recorrências, Mensal e Anual na mesma base; analisar retentativasOcupado, ocupadasEsgotadas, esperasConsultas e subetapas v166. Não somar subetapas ao total nem considerar espera por retry como execução financeira. Nenhuma validação real v167 foi feita pelo agente.


Reteste v166 — Após publicar Apps Script/frontend, abrir Atividade durante carga inicial; conferir que obterAtividadeWeb começa depois da carga, sem descarte/reenvio pela mesma atualização. Repetir em Recorrências. Durante salvamento, abrir essas telas e confirmar que aguardam a mutação sem perder envio ou travar protocolo. Mesmo painel solicitado em paralelo compartilha envio; nova consulta posterior busca servidor. Se carga inicial falhar, leitura de tela pode prosseguir e mostrar falha real, sem ficar presa. Coletar esperasConsultas, descartadas e subetapas novas, sem somá-las novamente ao total. Filtros precisam manter soma, paginação consistente, tags, status, classificação e Pix renomeado. Atividade: ação integrada segue sem Desfazer; reversíveis continuam reconferindo estado atual e recusando alteração externa. Comparar primeira abertura e reabertura com mesma base; não atribuir ganhos em segundos antes dos dados reais.


Reteste v165 — Publicar Apps Script/frontend. No computador, passar cursor em Pendentes/Histórico/Diagnóstico e demais ações neutras, coloridas, navegação e expansíveis; comparar hover com seleção azul persistente. Usar Tab/Enter/Espaço: foco visível e ação única. No celular, tocar não deve deixar hover preso nem deslocar botões; carregando/disabled continua bloqueado. Voltar a Atividade deve indicar o painel exibido. Histórico: validar ordem, pesquisa, Carregar mais, ações desfeitas e recusa de Desfazer após mudança externa. Medir obterAtividadeWeb sem pesquisa, especialmente página com reversões. Recorrências: entrar consulta servidor, selecionar a mesma tela não repete; sair/voltar e Atualizar consultam novamente. Mudança em outro aparelho deve aparecer na nova consulta. Não interpretar a otimização de reentrada como garantia da primeira abertura.


Reteste v164 — Publicar backend e frontend. Cadastrar gasto fictício sem pagamento no cartão ou Pix à vista e excluir após a confirmação. A exclusão deve sumir do app imediatamente após confirmação financeira; resumo pode aparecer pendente até a rotina. Conferir diagnóstico: resumoMs deve ser zero na exclusão elegível em segundo plano, e depois resumo atualizado/pendente false. Medir tempo total; não exigir redução fixa de três segundos em toda execução. Cartão pago continua bloqueado; Pix à vista pago conserva exceção v163. Reenvio não duplica; após PRONTO interrompido, worker não materializa dados parciais e só conclui depois da recuperação. Fórmula personalizada incompatível ou falha de persistência da tarefa mantém resumo síncrono. Não alterar dados reais para testar bloqueios.


Reteste v163 — Depois de publicar backend e frontend, cadastrar Pix à vista fictício, conferir Pago e excluir pelo Histórico. Confirmar que some de Histórico/Mensal e pode ser restaurado por Desfazer da exclusão em Atividade, com valor e pagamento preservados. Exclusão não movimenta nem estorna o banco. Reenvio do mesmo pedido não duplica; versão antiga não deve apagar item alterado. Confirmar que cartão pago, Pix parcialmente pago, Pix parcelado pago e recorrência paga continuam bloqueados. Não usar pagamentos reais nesses testes. Repetir diagnóstico v163 após a rodada e conferir resumo atualizado.


Reteste v162 — Publicar frontend e Apps Script. Em registro fictício sem pagamento, incluir, editar e excluir; confirmar cada ação. Não alterar pagamentos reais para contornar bloqueio. Alterar uma meta de categoria e salvar; verificar nome, meta, filtros e versão atualizados. Snapshot pode evitar getDadosCompletos adicional após categorias/exclusão; ausência, expiração, mudança em outro aparelho ou fórmula incompatível deve manter consulta normal. Medir tempos totais, atualizacaoMs, atualizacoesConfirmadas e resumoLeituraMs com suas quatro subetapas. Confirmar que resumo termina atualizado sem erro. Base com arquivo legado deve conferir conteúdo integral e bloquear adulteração mesmo sem comprovante do resumo derivado. Não esperar ganho de arquivo legado em base que não o possui. Esperas pela trava ainda precisam ser medidas.


Reteste v161 — Publicar backend/frontend, sem reativar proteção. Medir Novo com uma parcela recente e outro gasto de data anterior; comparar parcelasIncluidas, linhasReordenadas, celulasEscritas e tempos de leitura, plano, aplicação e atualização. Não esperar uma única linha física ao inserir no passado. Editar um lançamento; abrir Painel/Mensal/Anual e colher diagnóstico v161. Abrir abas durante envio não deve duplicar ou perder confirmação. Validar cancelamento, reenvio do mesmo pedido, payload divergente e recuperação de PRONTO em testes isolados. Novos tempos de leitura são subetapas, não parcelas adicionais do total. Acompanhar concorrência com resumo/proteção: não considerar resolvido SERVICO_OCUPADO apenas por build/teste local. Confirmar resumo atualizado após a rotina, sem perder filas/rascunhos.


Reteste v160 — Depois de publicar backend/frontend: comparar tempos reais de Novo/Edição/Mensal/Anual e confirmação, inclusive contexto com recorrência e com fórmula que exige recarregar dados. Confirmar ausência de duplicação. Em celular/computador conferir Data/Mês alinhados nos dois cadastros, competência centralizada, Valor/Parcelas/Início sem espaço extra e sem cortar valor. Ativar recorrência e conferir separação de Tags. Escolher descrição com tags anteriores, limpar formulário: sugestão deve sumir; envio incerto deve continuar impedindo limpar. Validar alturas e quebras nos modais existentes. Não confundir testes locais com validação publicada.


Reteste v159 — publicar Apps Script e frontend, sem reativar proteção. Fazer Novo e Edição num lançamento isolado; colher diagnóstico com linhasFormatadas/linhasValidacaoStatus e tempos de aplicar/flush/conferência. Em alteração de uma linha, deve trabalhar nela; se houver reordenação de várias linhas, índices devem cobrir essas linhas. Não exigir contagem 1 para toda operação.

Conferir formato de moeda e menu de situação em inclusão, edição, exclusão, parcelas e recebimentos. Restauração/cabeçalho/migração ampla devem manter formato completo. Falha de formatação após gravar: reenvio deve completar apresentação sem duplicar dados, com confirmação protegida. Alteração externa em linha intacta continua bloqueando o plano. Validar Mensal/Anual e registros Date no fuso correto; não alterar datas/fatura para ganhar velocidade.

Título Parcelas detalhadas de terceiros deve usar 🗒️; 📋 continua nas ações de cópia. Demais mudanças pendentes de publicação das v157/v158 seguem acumuladas. Medir desempenho real depois do deploy: testes de volume/conversões não comprovam segundos na conta.


Reteste v158 — Novo e Novo empréstimo, celular e computador: Data e Mês Fatura devem começar e terminar na mesma altura; cabeçalhos com altura e margem iguais, sem aumentar Ontem/Hoje ou setas. Testar nome do mês em duas linhas em tela estreita, atalhos, digitação dia/mês e alteração manual do ano. Nenhuma mudança no cálculo da competência. Publicação somente frontend; backend financeiro segue o anterior.


Reteste v157 — publicar frontend/build; backend financeiro continua v156/protocolo 19. Recorrências: comparar pessoal antiga, pessoal nova, terceiro automático/revisão e desativadas; conferir descrição/valor à esquerda/direita, badges, divisor e Editar/Pular/Desativar em cores iguais às anteriores. Quando há mês a revisar, input e confirmação não devem espremer os três botões. Testar ações e versão normalmente.

Novo empréstimo no celular: Data e Mês da fatura devem começar/terminar na mesma altura, inclusive tela estreita; cabeçalhos não podem deslocar um input. Valor/Parcelas/Início e atalhos mantêm alinhamento.

Publicar Main/produção e New/Preview: conferir manifesto servido, título, favicon e ícones disponíveis. Produção deve oferecer Gestor de Gastos/bolsa oficial; Preview, Gestor de Gastos — Preview/atalho Gestor Preview e faixa PREVIEW. Instalar/abrir no celular e computador e conferir também a abertura do app. Validar atualização de atalhos existentes sem supor que atualizar o HTML força o sistema operacional; se continuarem antigos, conferir os arquivos servidos antes de orientar reinstalação. Não apagar dados locais/pendências como tentativa de trocar ícone. Identidade de instalação e endereço/API devem permanecer estáveis por origem.

Testes locais verificam os dois ambientes, tamanhos PNG e caminhos reais, ausência de modificação do corpo/API/arquivos-fonte pelo publicador e validação do ambiente. Ganho de desempenho financeiro da v156 continua a exigir amostras reais; v157 não altera regras ou gravação.


Reteste v156 — atualizar Apps Script e frontend juntos; sem novas ativações. Abrir Recorrências com pessoal antiga, pessoal nova e terceiro: todos devem estar na mesma grade ativa, identificados em violeta/âmbar, duas colunas no computador e uma no celular. Desativadas só em seção recolhida com Retomar; nenhuma duplicação por reabrir a aba ou atualizar. Editar/Pular/Desativar antigas e novas devem manter comportamento e versões, inclusive série com mudança programada de valor e mês pulado.

Atualizar deve ficar discreto, mostrar Atualizando… e bloquear repetição durante consulta; sair/voltar deve consultar os dois tipos juntos. Alterar em outro aparelho e atualizar: refletir valores novos. Falha/restauração durante consulta não deve trocar lista por resposta antiga; Apps Script anterior deve pedir atualização em vez de afirmar sucesso parcial. Recorrências antigas devem refletir a mesma condição vigente que o Painel, sem recalcular o Painel inteiro para abrir a aba.

Medir Novo/Edição/Mensal/Anual e Recorrências; comparar diagnóstico v155 com v156 sem atribuir ganho antes da medição. Regressões verificam interpretação de série uma vez por conteúdo na execução, cópia não contaminável, mudança de metadado reconhecida e formato de Date reaproveitado sem atravessar requisições, sem alterar data original, fuso ou hashes. Conferências de fórmula/ano fechado e confirmação de gravação permanecem exigidas.


Reteste v155 — publicar frontend e Apps Script juntos, sem nova ativação. Histórico e Empréstimos: Editar → Criar recorrência deve abrir modo/prévia dentro do modal, sem ir à aba Recorrências; gasto salvo é preservado. Testar Variável/Fixo, mês histórico, dia 31 e edição não salva; mudar modo/campos enquanto confirmação aberta deve recusar. Conferir pedido repetido/erro e lista ao abrir Recorrências posteriormente. Atalhos de criação do zero continuam levando a Novo/Novo empréstimo com Recorrente ligado.

Conferir botão Recorrente abaixo de Valor no empréstimo, altura/estilo iguais aos atalhos; limpar e restaurar rascunho. Editor deve ordenar Aplicar valor → Data combinada → Aplicar data → três expansíveis; recebimento exclusivo não mostra recorrência. Digitar dia e mês nos quatro formulários: pular ano válido e focar descrição sem selecionar seu texto; ano manual continua disponível e inválido/ausente exige correção. Barra e mês incompleto/inválido não devem causar salto incorreto. Mudar data na edição continua sem mover automaticamente Mês Fatura.

Desempenho: medir Novo, Editar, Painel e categorias após publicação; comparar diagnóstico, sem prometer ganho antes da medição. Testes locais verificam uma leitura de perfis por consulta, hash de configuração equivalente inclusive com fórmulas e recusa após mudança externa. Nenhuma redução das confirmações de gravação.


Conferir Atividade após criação integrada: Desfazer isolado deve ficar indisponível e explicar a gestão separada do gasto e da repetição, preservando ambos.

Reteste v154 — publicar Apps Script (protocolo 19) e frontend/cache v154; não reativar proteção. Em Recorrências, abrir Gasto pessoal e De terceiros, confirmar substituição de rascunho se houver. Conferir 📌 Recorrente, modos Variável/Fixo, prévia pela data e fatura; trocar data/modo, recarregar rascunho e limpar. Modo desligado não deve criar modelo. Ativado deve guardar gasto atual 1/1 e modelo a partir do mês seguinte, sem duplicar atual ou gerar atrasados ao lançar gasto histórico. Dia 31: conferir fevereiro e retorno ao dia 31.

Variável: próximo mês só registra após revisar. Fixo: rotina existente registra na data, uma vez. Terceiros: mantém A Receber e pagamento ao banco independente, sem criar devolução combinada futura. Tentar duplicata e automático sem proteção: não deixar gasto isolado. Reenvio/incerteza/fila offline: recuperar o mesmo resultado sem duplicar; pendência impede substituir formulário. Simular frontend novo com backend antigo: recusar recorrência integrada e preservar rascunho/fila. Confirmar navegação celular/desktop, campos mínimos, gestão dos modelos anteriores e conversão dentro de Editar preservadas. Medir Novo/Edição separadamente; testes locais não comprovam latência real.


Reteste v153 — atualizar Apps Script e frontend juntos, sem novas ativações. Conferir 🟢/🚀 com compras antes/no dia/depois do fechamento, inclusive mês anterior; a competência sugerida deve ser coerente com a data e respeitar mês escolhido manualmente. No comparador, testar pacote múltiplo e empate: Copiar deve incluir preço do conjunto e unitário; Preencher Novo deve usar preço total, nome e 1 parcela, sem gravar. Rascunho existente exige confirmação; alterar formulário/comparação durante confirmação ou haver envio pendente deve impedir substituição. Quantidades/unidades alteradas exigem Comparar de novo. Comparação original deve permanecer.

Desempenho: repetir Novo e Edição aguardando confirmação; conferir registros únicos/valores/competência, diagnóstico de execução/plano/planoAnual/aplicação/leitura e latência percebida. Só atribuir ganho após medições; o teste local comprova menos leituras, não duração no Google. Simulações de edição externa de ano aberto/fechado/fórmula e reexecução pertencem à cópia descartável/testes automatizados; devem continuar bloqueando sobrescrita divergente. Não reenviar finanças confirmadas por falha da consulta posterior ou resumo pendente.


Reteste visual v152: atualizar frontend; abrir Editar pessoal e empréstimo à vista. Criar recorrência deve estar antes de Cancelar/Salvar, com seção violeta recolhida e seta lateral, seguindo o conversor. Abrir/recolher não deve gravar; Configurar deve levar ao formulário com os dados salvos. Reabrir editor deve recolher e não duplicar a seção; parcela de série não elegível não deve exibi-la. Botões principais continuam por último. Conferir em celular e computador. Não há função nova ou alteração financeira a ativar. Para o diagnóstico v151 que registrou HTTP504 após edição confirmada, conferir atualização quando disponível, sem refazer a edição; coleta de recuperação indisponível não é confirmação de estado novo do resumo.


Reteste v151 — publicar frontend/Apps Script juntos, atualizar aparelhos. Na cópia: salvar recorrência sem erro de parser e retomar série antiga; confirmar Pessoa apenas em terceiros/Categoria no pessoal. Abrir Criar recorrência dentro de Editar nos dois tipos, manter original intacto e início posterior; edição não salva deve exigir conclusão antes. Conferir formulário no celular sem rolagem horizontal. Em Empréstimo, testar À vista→3x→Início 2→À vista, três campos alinhados e observação separada; conferir prévia e rascunho. Sugestão de tags aparece antes dos chips e mantém tags manuais ao aplicar.

Recebimento integral/parcial e edição: só um envio mesmo com toque duplo; controles bloqueados até a atualização correspondente, erro não perde campos e nova sessão não é sobrescrita. Pode navegar sem cancelar a operação. Conferir fatura: setas atravessam dezembro/janeiro, inválidos não consultam, valor não enviado exige confirmação para trocar mês; não navegar durante pagamento nem confundir troca de mês com pagamento. Data antiga no Novo deve informar fatura sugerida, sem afirmar que ainda está aberta hoje.

Limite: primeiro Guardar migra o valor local para a planilha; atualizar outro aparelho deve mostrar mesmo limite/previsões, sem alterar Perfil de gastos. Alterações simultâneas devem recusar versão antiga; remoção vale nos dois aparelhos após atualizar. Offline/falha não pode anunciar sincronização concluída. Backup/restauração desses testes somente na cópia; backup antigo informa preservação da preferência. Perfil de gastos já vem dos registros/categorias: conferir categorias classificadas em ambos.

Resumo: coletar diagnóstico após rotina. Topo e recuperação devem usar a situação nova quando consultada. Comparação/gravação/flush ficam dentro da escrita; não somar subtempos ao total. Testes automatizados cobrem escrita diferencial/correção de fórmulas/cauda; interrupção e alteração direta ficam restritas à cópia descartável. Nenhum novo gatilho ou permissão a ativar. Filtros clicáveis adicionais nos cards seguem apenas como proposta de produto.


Reteste v150 (04/11/2026): publicar backend e frontend juntos, atualizar app e conferir v150. Na cópia descartável, cadastrar um modelo pessoal variável e outro de terceiros; salvar o modelo não deve criar lançamento. Na data de cobrança, confirmar valor diferente e conferir competência da fatura, único lançamento e próximo mês com último valor atualizado. Terceiros deve nascer A Receber, sem marcar recebimento ou quitar cartão. Em dois aparelhos, só a primeira confirmação da mesma versão deve criar ocorrência. Testar Pular mês sem gasto, editar, desativar, retomar e Criar recorrência em Histórico/Gerenciar com original pago preservado e primeiro período posterior. Testar rascunho, troca de abas e confirmação invalidada por edição. Não fazer confirmações financeiras fictícias na definitiva.

Para fixo automático novo, usar apenas a cópia: proteção ativa/gatilho existente, data de cobrança e fatura separados, execução diária sem duplicar. Se o modelo foi criado após a execução diária, aguardar próxima execução. Dia 31 deve ajustar para fevereiro e voltar a 31 nos meses cabíveis. Lote máximo 12 ocorrências; atrasados retomam nas execuções seguintes. Confirmar erro visível na consulta se cadastro ficou inválido. Não reinstalar a proteção nem ativar o resumo outra vez. Séries antigas continuam com Pular/Desativar/Retomar existentes; variável não confirmado não deve virar gasto no PDF/Horizonte.

Exportar backup restaurável com modelos e conferir prévia/recuperação somente na cópia; backup antigo sem Recorrências informa preservação da aba. Revisar períodos dos modelos após importar cópia antiga. Interrupção/PRONTO e fórmulas particulares são cenários automatizados/somente na cópia. Para desempenho real, repetir Novo/Edição e colher diagnóstico; resumoPlanilha.ultimaExecucao.etapas deve apresentar seis tempos após a rotina concluir. Subtempos já estão no total; ganho real depende da medição após publicação.


Reteste v149: publicar backend e frontend, confirmar v149. Na cópia, criar/editar empréstimo, registrar recebimento integral/parcial, excluir um pendente elegível e converter nos dois sentidos. Aguardar confirmação e verificar registros únicos, saldos bancários e de terceiros separados; resumoMs=0 quando elegível, estado pendente separado da fila, dados atuais no app e conclusão posterior do resumo. Reenvio com o mesmo identificador não pode duplicar. Testar interrupção/retomada e fórmula particular somente na cópia descartável. No celular, abrir teclado ou mudar altura não deve reconstruir Horizonte; atravessar celular/desktop deve ajustar colunas. Selo deve atualizar, inclusive por outra aba, sem afetar persistência. Não reativar gatilhos já instalados nem reenviar finanças por resumo pendente.


Reteste v148: publicar backend e frontend, confirmar v148 e repetir Novo/Edição aguardando Salvo. Conferir um único registro, valor, competência, parcelas e somatórias; exportar diagnóstico e comparar aplicacaoMs, aplicarDestinosMs e tempo total. Resumo pendente não deve ser confundido com envio pendente. Na cópia descartável, preservar cenários de interrupção/retomada e conversão legada de datas em notas/planejamento/registros anuais, inclusive divergência real de valor que deve continuar bloqueada. Não criar falhas artificialmente na base definitiva nem reinstalar gatilhos.


Reteste v147: publicar backend e frontend juntos (inclui medições v146). Na cópia de testes, criar Pix passado (Pago) e futuro (Agendado); conferir aviso nos próximos sete dias e dia exato na Agenda, inclusive domingo/feriado. Corrigir data do futuro para passada: opção de pagamento sugerida, revisão e confirmação antes de Pago. Desmarcar deve preservar pendência; pendente já corrigido deve permitir marcar explicitamente. Conferir um único registro, saldo, remoção do aviso e desfazer em Atividade; versão antiga/reenvio devem manter proteções. Cartão, recorrência e Pix parcelado não usam essa exceção. Data não deve mover Mês Fatura. Conferir Ajuda recolhida, cards Não classificado e diagnóstico v147. Não criar ou desfazer movimentos reais apenas para teste; não reinstalar gatilhos.


Reteste v146 (inclui v145): publicar backend e frontend uma única vez. Confirmar v146 no diagnóstico, salvar e editar aguardando confirmação; depois alternar filtros rapidamente e navegar/retornar. Conferir itens, somatória e ausência de duplicação. Exportar preparar*, plano*, aplicar*, atualizacao*, contagens e esperasConsultas. Comparar tempos sem somar subetapas novamente. Contagem de células não prova confirmação; verificar Salvo e pendências. Não reativar gatilhos.


Reteste v145: publicar backend e frontend, atualizar app e confirmar versão v145 no diagnóstico. Criar um lançamento e editar outro, aguardando Salvo; conferir registro único, valores e parcelas. Exportar diagnóstico com as subetapas preparar* e aplicar* para analisar gargalos. Não reinstalar rotinas nem repetir envios confirmados. Os subtempos estão contidos nos totais e não devem ser somados novamente. Ensaios de interrupção/recuperação continuam somente na cópia descartável.


Reteste v144: após atualizar backend e frontend, medir Novo, edição e filtros; conferir valores, competência, ordem do Histórico, somatória, parcelas e terceiros. Nova operação deve enxergar mudanças de outro aparelho. Testes de alteração de arquivo anual/fórmula e recuperação interrompida continuam na cópia descartável. Não reinstalar gatilho. Comparar tempos do executor e duração no app, sem atribuir variação de uma amostra integralmente à otimização.


Reteste v143 (módulos 2/5/6/10): publicar backend e frontend, sem reinstalar o gatilho. Alterar rapidamente busca/filtros do Histórico, sair para outra aba e retornar: somente o filtro vigente deve aparecer, com itens e soma coerentes; conferir paginação e copiar resumo. Salvar/editar e trocar de aba deve continuar confirmando uma única gravação. Exportar diagnóstico e verificar v143, filtrosSuperados e intervalos do servidor, comparando a última execução do resumo. Consulta já enviada ou outro aparelho ainda podem gerar espera; não repetir salvamentos por demora de leitura. A ativação e conclusão do resumo em segundo plano já foram observadas na conta antes deste pacote.


Preparado em 30/10/2026; orientação por módulos atualizada em 03/11/2026. Protocolo 17 e cache v71 identificavam o pacote original; para o estado atual, consultar CONTEXTO_COMPLETO_PARA_AUDITORIA_20261103.md. A continuação está em `PACOTE_BACKUP_PLANEJAMENTO_20261031.md`; a correção das datas/pendência e a explicação das metas estão em `CORRECAO_DATAS_NOTAS_PLANEJAMENTO_20261031.md`.

Use as caixas para anotar o resultado real. Elas estão desmarcadas porque os testes locais automatizados não substituem os passos na sua conta. Faça primeiro na **Cópia de Gestor de Gastos**; restauração e ensaio de virada usam uma cópia separada, descartável. Não precisa testar tudo de uma vez: siga a ordem e registre onde parou.

## 1. Preparar o teste

Reteste v141 (04/11/2026): publicar backend e frontend; antes de ativar, confirmar comportamento imediato. Executar ativarResumoEmSegundoPlanoGestor pela conta proprietária e conferir gatilho único rotinaResumoPlanilhaGestor. Salvar um gasto e editá-lo: confirmar uma única gravação e indicadores atuais, resumoMs=0 quando elegível, resumoPlanilha.pendente=true no retrato/diagnóstico. Fechar app somente após Salvo, aguardar rotina do Google e consultar novamente: pendente=false, resumo atualizado e sem duplicação. Em Atividade, resumo pendente deve aparecer separado de envio financeiro. Atualizar situação do backup confirma modo/gatilho.

Validação local final v141: 1.082 testes aprovados em 04/11/2026, zero falhas. Instalação do gatilho e reteste na conta real ainda pendentes.

Somente em cópia descartável: testar interrupção após PRONTO (worker deve aguardar recuperação), falha de materialização (tarefa preservada e erro visível), conclusão da marca interrompida (repetição inofensiva), vários envios antes do gatilho (resultado agregado), trava ocupada, identidade de base diferente e falta de permissão ao instalar. Em caso de falha ao registrar intenção ou fórmulas particulares nas entradas, o resumo deve continuar imediato. Ao reabrir após envio sem resposta, conferir pendência com mesmo identificador; pendência exclusiva de resumo não deve oferecer novo envio financeiro.

Reteste v140 — desempenho Novo/Edição (04/11/2026): publicar Code.gs na mesma implantação e frontend na Vercel; atualizar app instalado. Criar gasto e editar descrição/valor, aguardando concluir sem sair da tela. Conferir registro único, valor, competência, classificação e versão para edição seguinte. Exportar diagnóstico: versaoInterface=v140; atualizacoesConfirmadas e evento atualizacaoDadosConfirmada indicam tela atualizada com dados da confirmação; normalmente não haverá getDadosCompletos adicional logo após essas ações elegíveis. Comparar duração total clique→tela e atualizacaoMs. Conferir também empréstimos inalterados, cartões/limites, horizonte, autofill e recorrências. Depois atualizar manualmente: deve consultar a rede e mostrar os mesmos dados.

Última validação local deste pacote: suíte completa em 04/11/2026 com 1.073 testes aprovados e zero falhas; não substitui o reteste real acima.

Fallback v140: backend antigo, reenvio confirmado, saída/retorno ou mudança externa durante a gravação, retrato indisponível/expirado/grande, fórmula de entrada particular ou manutenção recorrente necessária devem continuar usando consulta completa normal. Falha acessória não deve transformar gravação confirmada em erro nem criar reenvio novo. Ensaios de perda de resposta/reenvio e virada de mês somente na cópia descartável, preservando requestId. Conferir backup/diário e anos fechados sem alterar retratos reais para teste.

Reteste frontend v139 (04/11/2026): publicar frontend e atualizar app, sem substituir Code.gs novamente. Primeiro salvar e editar um gasto mantendo a janela visível até terminar a atualização; exportar diagnóstico e confirmar versaoInterface=v139. Depois iniciar uma consulta, sair e voltar uma vez: foco/visibilidade devem produzir uma única invalidação de retomada; resposta anterior à saída pode ser descartada corretamente e substituída por consulta atual. Repetir nova saída para confirmar que continua revalidando. Alteração de outra aba e gravação devem continuar invalidando mesmo durante o mesmo ciclo de retomada. Suíte local: 1.054 testes aprovados; ganho real ainda exige comparação dos diagnósticos.

Reteste v138 (04/11/2026), foco Novo/Edição: publicar Code.gs na mesma implantação e frontend na Vercel; atualizar o app instalado. Criar um gasto de teste e editar a descrição, aguardando a atualização posterior de cada ação. Conferir ausência de duplicação, valor/competência/pagamento preservados na edição e registro correto no ano correspondente. Exportar diagnóstico somente ao terminar as recargas; desempenhoConsultas.versaoInterface deve informar v138. Comparar duração total, planoMs, aplicacaoMs e motivos das invalidações com a rodada anterior; não confundir queda de leituras locais nos testes com ganho real já comprovado. As 1.051 verificações locais passaram. Ensaios de interrupção/conflito apenas em cópia descartável, preservando o mesmo requestId.

Reteste frontend v137 (04/11/2026): publicar o frontend e atualizar o app instalado; Code.gs não mudou neste pacote. Salvar categorias e solicitar atualização durante o envio; a recarga visual deve aguardar a confirmação sem duplicar a gravação. Repetir com edição de gasto e conferir um único registro com os dados finais. Aguardar a atualização da tela antes de exportar diagnóstico e comparar envios/descartes/tempos. Se houver falha de envio, conferir pendências pelo app, preservando o mesmo identificador; a recarga não deve ficar presa nem reenviar a gravação. Testes locais: 1.046 aprovados, sem substituir a conferência na conta real.

Reteste de desempenho do refinamento backend de 04/11/2026: atualizar Code.gs na mesma implantação; sem mudança no frontend v136 ou nas permissões. Após publicar, abrir Painel, Mensal e Anual; cadastrar um gasto de teste e editar sua descrição. Conferir valor, competência, ausência de duplicação e formatação monetária na planilha; exportar diagnóstico depois de a edição e a atualização posterior terminarem. Comparar tempos do app e subtempos do resumo com a rodada anterior. Os 1.043 testes locais aprovados não medem latência real do Google. Não alterar um ano fechado real para ensaiar corrupção; usar somente cópia descartável.

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

v136: publicar Code.gs e frontend; manter implantação, permissões e manifesto. Numa edição real só de descrição/tags, verificar dados corretos sem necessidade de mudar Atualizado em do resumo se o conteúdo agregado for igual. Numa alteração de valor/pagamento, resumo deve refletir resultado novo e nova materialização. Copiar diagnóstico com subtempos resumoControle/Leitura/Calculo/Dashboard/Escrita/Formulas (ms), componentes de resumoMs. Reparação de corrupção e preservação de fórmulas particulares são testes automatizados; não adulterar a definitiva para testá-los. Conferir no uso habitual, sem repetir lançamentos apenas para medir.

v135 (frontend): editar lançamento real necessário no Histórico e conferir gravação e lista após atualização. Filtro solicitado durante edição local deve aguardar sem nova escrita; após falha deve destravar, preservando eventual envio incerto. Consultas internas de protocolo/Atividade não podem ficar presas pela coordenação. Outra aba/aparelho ainda pode retornar SERVICO_OCUPADO, tratado pelo servidor. Sem nova publicação Apps Script exigida somente por v135.

v134: publicar backend e frontend sincronizados. Abrir Mensal enquanto a carga inicial do Painel está pendente e conferir que o relatório do período escolhido aparece após a carga, sem valores de outro mês. Trocar período, editar/salvar e conferir invalidação normal. No próximo lançamento real, comparar resumoMs, total e consultas descartadas; períodos não constam no diagnóstico, portanto duas consultas próximas não provam duplicação. Anos fechados continuam conferidos a cada nova montagem; não alterar arquivo real para testar hash. Sem novas permissões ou mudanças no manifesto.

Escrita com SERVICO_OCUPADO deve preservar envio para conferência: uma tentativa anterior do mesmo requestId pode estar em execução. Testes devem distinguir essa situação da consulta ocupada; não apagar journal/reenviar como novo lançamento. O pacote v133 tem tratamento local e testes, ainda requer publicação dos dois lados.

Concorrência v133: publicar Code.gs e frontend; em projeto de testes simular trava ocupada e conferir SERVICO_OCUPADO, estado=ocupado no Diagnóstico e nenhuma escrita/liberação de trava alheia. Após término da operação, repetir consulta manualmente e conferir dados. Não provocar bloqueio ou interromper execução na definitiva. Não repetir gravação com resultado incerto; conferir confirmação por Atividade. Execução prolongada observada em 03/11/2026 foi limitada pelo Google aos seis minutos; origem interna continua sem comprovação.

Refinamento do cadastro de formas no resumo (03/11/2026): atualizar apenas backend na mesma implantação; HTML/manifesto/segredos permanecem. No próximo lançamento real, copiar diagnóstico e comparar resumoMs com 8.971 ms da amostra anterior, reconhecendo variação do Google. Conferir resumo, totais, forma exibida e ausência de pendência. Renomeações/aliases e nomes históricos continuam cobertos por regressões; não renomear cartões reais só para medir desempenho.

Pacote v132 (resumo): após publicar backend e frontend juntos, conferir Dashboard & Resumo e os relatórios com um lançamento real, edição/pagamento normal e categoria renomeada quando necessário. Fórmulas particulares devem continuar intactas; não criar nem apagar dados reais apenas para medir. Copiar diagnóstico e comparar detalhesGravacao com a medição anterior; subetapas estão dentro de gravacaoMs. Preservados PRONTO/CONFIRMADO, flush e recuperação. O teste local de acessos prova redução de operações, não o ganho em segundos no Google.

Diagnóstico v131: publicar Backend/Code.gs na mesma implantação Apps Script e frontend sincronizado na Vercel, mantendo destino/token/permissões. Usar um lançamento real necessário, abrir Mensal/Anual e copiar Diagnóstico. Conferir temposServidor com ação e durações (ms) correspondentes, separado de eventos.duracaoMs. Não repetir lançamento só para medir. Cache não produz nova medição de servidor; ações fora do executor transacional podem não fornecer etapas. Verificar resultado financeiro normal e preservação de pendências; nenhuma trava foi removida. Falta de medição não significa duração zero.

Evidência posterior do usuário em 03/11/2026: preparação de permissões executada com sucesso e nova versão Apps Script publicada; app exibe base Gestor de Gastos e os três recursos ativos, com backup confirmado às 19:28. Consultas declaradas corretas pelo usuário. Restam observar primeiro lançamento real sem duplicação, atualização em outro aparelho e rotinas futuras. Não marcar restauração real ou todos os PDFs como testados somente com essa captura.

Preparação de permissões (opcional em base já autorizada): seguir Backend/AUTORIZACAO_INICIAL.md e executar prepararAutorizacaoInicialGestor no editor pela conta da implantação. Conferir consentimento dos quatro escopos e ausência de mudança nos estados de proteção/organização/PDF; a função não cria backup nem gatilho. Não revogar acessos na definitiva para simular recusa. Testar consentimento inicial em projeto de testes, preservando fuso e dependências do manifesto. Google pode exigir nova autorização se permissões/conta mudarem; o teste local não comprova consentimento real.

Conferência após publicação em 03/11/2026: Production READY no commit 1c6ecdc da main; POST anônimo no domínio definitivo retornou 401, sem consulta financeira. Próximo passo: abrir domínio definitivo com login, confirmar base Gestor de Gastos e consultar Histórico/Mensal/Agenda comparando dados conhecidos antes da primeira gravação real. A publicação foi verificada; a conexão autenticada ainda não.

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
