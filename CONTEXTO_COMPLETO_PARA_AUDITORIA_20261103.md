# Gestor de Gastos — contexto completo para continuidade e auditoria

Atualizado em **04/11/2026**, com base no código e na documentação local. Este documento pode ser enviado a outra IA junto dos arquivos do projeto. Não contém tokens, senhas, IDs privados de planilhas nem dados financeiros reais.

**Manutenção contínua:** por solicitação de Lucas, este arquivo deve acompanhar as alterações e melhorias futuras. A data no nome identifica sua criação; a data acima e as seções afetadas devem ser atualizadas a cada revisão relevante. As orientações permanentes estão em `AGENTS.md`.

## 1. Leia primeiro: o que é este documento

Validação final v136: 1.039 testes aprovados, zero falhas em 04/11/2026; log testes-resumo-v136.txt. Três regressões novas cobrem ausência de escrita/formatação em resumo idêntico, atualização por valor novo, reparação de valor/fórmula/cauda divergentes e leitura limitada do Dashboard sem tocar conteúdo externo. Testes de telemetria ampliados para subtempos opcionais. Interfaces/CSS/dist preparados; sem publicação remota, mudanças em permissões ou dados reais nesta etapa. Alterações frontend v135 ainda presentes no trabalho local são mantidas no pacote, sem reversão.

Pacote local v136 — 04/11/2026: atualizarResumoNativoGestor_ limita leituras do Dashboard à área das fórmulas gerenciáveis A1:H41 e aos nomes de categoria em B17:B41, preservando células particulares fora dessa região. Nova gravarResumoConferidoGestor_ compara conteúdo real normalizado e ausência de fórmulas da aba derivada antes de evitar escrita/reformatação quando o resultado é igual; não confia só no hash armazenado. Mudança só de descrição/tags pode preservar a materialização anterior. Atualizado em mantém a data da última materialização quando nada mudou. Qualquer diferença de dados/controle, fórmula inesperada, cauda indevida ou data inválida força a gravação completa existente, mantendo reparação de corrupção. Cabeçalho/propriedade/metadados seguem validados antes; nenhuma mudança no diário financeiro ou confirmação.
Diagnóstico adiciona subtempos opcionais resumoControleMs, resumoLeituraMs, resumoCalculoMs, resumoDashboardMs, resumoEscritaMs e resumoFormulasMs dentro de detalhesGravacao. São partes de resumoMs, não somar novamente ao total. Lista branca no backend e frontend; leituras em versões antigas continuam compatíveis. Cache v136/protocolo 18. Backend e frontend precisam de publicação para medir esses campos. Sem nova permissão; build/validação/publicação são etapas separadas e o ganho real ainda não foi medido.

Reteste do usuário em 04/11/2026 às 00:03 local: eventos recentes recebidos sem SERVICO_OCUPADO, nenhuma pendência financeira local e recuperação servidor vazia. Edição 18.761 ms no app/16.115 no executor, resumo 5.793 ms. Novo lançamento 30.998 ms no app/27.742 no executor, resumo 11.408 ms; atualização posterior 11.321 ms adicionais. Mensal 7.452/10.457 ms e Anual 11.389 ms no app. Uma consulta pendente no coordenador é leitura em andamento, não prova de envio financeiro pendente. Não declarar ganho uniforme ou latência resolvida: edição melhorou na amostra, salvamento piorou em relação ao reteste anterior, e resumo continua variável/pesado. Ausência de disputa recente é compatível com ajuste v135, mas não garante eliminação de concorrência em outros aparelhos. Nenhum código ou dado financeiro alterado nesta análise.

Validação v135: 1.036 testes aprovados, zero falhas na suíte completa de 03/11/2026; log testes-historico-v135.txt. Duas novas regressões cobrem espera do Histórico durante edição e desbloqueio após falha, com consultas internas de protocolo livres. Interfaces sincronizadas/dist preparado, sem mudança semântica em Code.gs; publicação frontend pendente. O ajuste não reduz diretamente resumoMs/aplicacaoMs nem elimina concorrência com outros aparelhos.

Diagnóstico e ajuste local v135 — 03/11/2026 às 23:04 local: editarLancamentoLinhaWeb recebeu sucesso em 23.073 ms no app/21.010 ms no executor, enquanto filtrarLancamentosWeb retornou SERVICO_OCUPADO após 11.836 ms (10.171 de espera). A falha observada foi na leitura do Histórico concorrente, não uma edição rejeitada; não é prova de que todo campo ficou conforme intenção do usuário. Recuperação servidor vazia e pendências locais zero. Resumo da edição 4.509 ms e aplicação 5.008 ms; novo lançamento anterior 26.798 ms no app. Não afirmar ganho adicional de salvamento com essa amostra.
Coordenador passa a aguardar mutações locais pendentes antes de iniciar filtrarLancamentosWeb. Sucesso e falha removem a espera; consultas internas getDadosCompletos/protocolo continuam livres, evitando espera circular. Compartilha filtros iguais após liberar; não reenvia edição nem aplica cache de Histórico novo. Proteções servidor continuam necessárias para outra aba/aparelho. Alteração somente frontend, cache v135/protocolo 18; backend não mudou neste pacote. Publicação ainda pendente.

Validação final v134: suíte completa executada em 03/11/2026, 1.034 aprovados e zero falhas; log local testes-leituras-v134.txt. Três novas regressões: carga completa + relatório compartilhado sem descarte, falha da carga sem prender relatório e leitura anual única com nova validação de hash na chamada seguinte. Build/HTML distribuído e dist preparados após resolver bloqueio temporário de arquivo no OneDrive. Sem publicação remota ou consulta financeira real por esta implementação.

Pacote local v134 — 03/11/2026: foco em leituras anuais do resumo e relatórios que atravessam carga completa. Resumo monta catálogo/ajustes uma vez e compartilha os dados conferidos de cada ano entre as matrizes pessoais/terceiros somente nessa montagem. Snapshot vinculado por referência à mesma base, com cópias de dados; consulta seguinte reabre/revalida anos e hashes. Chamadores sem snapshot de matrizFinanceiraAnualGestor_ mantêm comportamento anterior. Sem alteração de escrita, fechamento ou imutabilidade anual.
Coordenador aguarda cargas getDadosCompletos já iniciadas antes de enviar Mensal/Anual; a carga continua invalidando relatórios antigos, mas evita-se uma consulta iniciada durante ela e refeita por invalidação. Não elimina relatórios de períodos distintos nem suprime reconsulta após mutação. Falha de carga é observada sem impedir envio posterior do relatório. Operações financeiras/prévias não entram nessa espera de relatórios. Cache v134, protocolo 18 mantido; implantação remota pendente, ganho real ainda a medir.

Reteste informado pelo usuário após procedimento v133 — 03/11/2026 às 22:50 local: diagnóstico mostra respostas recebidas, pendências locais zero e recuperação servidor vazia. Salvar: 20.967 ms no app, 18.214 ms no executor, resumo 6.322 ms, aplicação 3.874 ms; atualização posterior 7.466 ms no app. Anual 8.125 ms; duas consultas mensais próximas com 8.564 e 11.186 ms, esperando trava 1.829/1.981 ms e uma resposta descartada no coordenador. Sem parâmetros de período, não afirmar que foram consultas idênticas/duplicação comprovada. Reteste não provocou contenção prolongada e não prova eliminação da causa da execução de seis minutos. O tratamento v133 não tem como objetivo reduzir o tempo de um salvamento sem contenção. Próximo foco continua resumo (leituras anuais) e investigar disparos Mensais concorrentes com evidência de período/geração sem dados financeiros.

Validação v133: suíte completa executada com 1.031 aprovados, zero falhas. Refinamento posterior conserva resultadoIncerto para escrita que não obteve trava: a tentativa atual não iniciou, mas sem trava não é possível descartar uma tentativa anterior do mesmo requestId ainda em execução. Assim frontend preserva o envio para conferência em vez de apagar seu comprovante local; consultas ocupadas não recebem essa marca. Regressões de diagnóstico/frontend repetidas após o refinamento. Backend/interface/cache v133 preparados localmente; nada publicado nesta etapa. Próximas otimizações de velocidade são propostas separadas: leituras anuais e reconsultas, sem promessa de tempo e sem retirar exclusividade.

Incidente de concorrência — noite de 03/11/2026 (horário local): usuário enviou diagnóstico com falhas de consulta após cerca de 32 s, sem novas medições pois aquisição da trava ocorria antes do bloco medido. Inspeção somente de leitura da lista Execuções confirmou um doPost iniciado às 22:33:58 que atingiu 360,873 s/Tempo limite atingido, enquanto outras chamadas esgotaram espera. A ação/ponto interno dessa execução não foi identificado; não atribuir causa à otimização de formas nem declarar causa raiz resolvida. Nenhuma execução foi encerrada manualmente. Usuário confirmou retorno das consultas após o término.
Diagnóstico posterior, gerado em 03/11/2026 às 22:42 local, confirmou respostas recebidas, nenhuma pendência local e recuperação servidor com pendencias vazias. Salvar 18.896 ms no app/17.044 ms no executor, resumo 5.374 ms, aplicação 4.005 ms; Mensal 7.350 ms e Anual 7.891 ms no app. Confirma retomada e novo ganho observado, não elimina risco de nova execução longa.
Tratamento local v133 em preparação: executor usa tryLock com até 10 s para leitura e 30 s para escrita; se indisponível retorna SERVICO_OCUPADO em português antes de acessar dados, sem liberar trava alheia, ignorar exclusividade ou repetir automaticamente a operação. Medição estado=ocupado passa também por envelope de erro e transportes para Diagnóstico. Não equivale a resolver o ponto desconhecido que levou a execução aos seis minutos. Não usar ausência de pendências antigas como prova enquanto consulta de recuperação estiver indisponível.

Validação do refinamento de formas no resumo: suíte completa com 1.029 aprovados, zero falhas em 03/11/2026; log local testes-resumo-formas-20261103.txt. Build/interface sincronizados e dist preparado, sem mudança de conteúdo da interface. Uma nova regressão mede número de leituras e valida renomeação/valores. Publicação remota não feita nesta etapa.

Refinamento local posterior ao v132 — 03/11/2026: registrosResumoNativoGestor_ chamava nomeFormaLeituraGestor_ para cada registro; fora de CONTEXTO_GESTOR_ isso relia e validava Formas de Pagamento a cada item. Agora monta uma vez o mapa validado de identidades/aliases por chamada, mantendo fallback para nomes antigos não cadastrados. Snapshot é local à montagem e não permanece entre operações, não é usado para pagamentos/gravação e não altera regras financeiras. Teste com 12 gastos e um empréstimo confirma uma leitura do cadastro, totais iguais e renomeação refletida na próxima chamada. Sem mudança de lock, diário, flush, retorno antecipado ou resumo assíncrono. Frontend/cache/protocolo permanecem v132/18, pois o ajuste é somente backend; publicar nova versão Apps Script ainda pendente. Ganho real do refinamento ainda não medido.

Evidência real posterior ao pacote v132 — diagnóstico fornecido em 03/11/2026: salvarLancamentoWeb passou de 49.801 para 21.972 ms no executor, e de 52.909 para 24.584 ms no tempo percebido pelo app. Bloco de gravação 40.006 → 15.624 ms; novas subetapas diário 1.527 ms, aplicação 4.604 ms, confirmação 434 ms, resumo 8.971 ms. Atualização posterior getDadosCompletos 7.071 ms no app; Mensal 7.847 ms e Anual 9.439 ms. Sem pendências ou bloqueio. Amostras únicas de operações distintas/horários diferentes: redução observada é consistente com menos acessos, mas não garante percentual permanente nem atribui toda variação à alteração. Resumo continua maior subetapa individual medida do salvamento (cerca de 41% do tempo no executor). Próxima otimização deve mirar leituras/escritas do resumo restante e aplicação do plano, mantendo diário/flush/locks; não adiar resumo ou confirmar antes da gravação sem analisar consistência e recuperação. Nenhuma nova alteração financeira feita nesta análise.

Validação final v132: 1.028 testes aprovados, zero falhas, em 03/11/2026 após regeneração do módulo shared/relatorios.js e das interfaces. Teste novo demonstra duas leituras de matriz de fórmulas e nenhuma escrita no Dashboard ao repetir resumo sem mudança, preservando fórmula particular posterior. Teste de subetapas confirma retorno/erro originais e lista branca dos tempos. Build e dist preparados; ganho de tempo na conta e publicação seguem pendentes. Bloqueio temporário do OneDrive durante uma compilação foi resolvido com nova geração bem-sucedida antes da execução final.

Pacote local v132 — 03/11/2026: diagnóstico real v131 mostrou salvar em 49,801 s no executor, com 40,006 s no bloco de gravação, esperaLock de 207 ms; consultas Mensal/Anual em cerca de 8 s. Amostra aponta bloco de gravação como foco, não prova qual subetapa. Adicionados detalhesGravacao opcionais: diário até PRONTO, aplicação do plano, confirmação/flush, atualização do resumo e manutenção posterior. Sem remover travas/flush/diário ou antecipar sucesso. Lista branca de detalhes no frontend, compatível com v131; cache v132, protocolo 18 mantido.
Otimização concreta em atualizarResumoNativoGestor_: categorias em uma matriz, reconhecimento reaproveita valores, releitura em lote de fórmulas após persistir o controle de migrações e nenhuma regravação quando a fórmula já é a esperada. Templates particulares/modificados não reconhecidos continuam preservados. Apenas células migráveis alteradas são escritas; não reescrever a grade inteira. A trava continua protegendo operações do app; como antes, edição manual externa simultânea não compartilha essa trava. Testes de retomada, categoria alterada, fórmula particular e metadados inválidos continuam necessários. Ganho real ainda não medido; alterações não publicadas remotamente nesta etapa.

Validação final v131: suíte completa executada após ajustes, 1.026 testes aprovados e zero falhas em 03/11/2026; log local testes-tempos-v131.txt. Build CSS/HTML e dist regenerados. As cópias distribuídas contêm a instrumentação, não uma publicação remota. A coleta permanece opcional também quando um transporte é utilizado sem a função de diagnóstico, preservando compatibilidade. Quatro novos testes de tempos; total inclui os testes de autorização previamente adicionados.

Instrumentação local v131 — 03/11/2026: envelope de sucesso opcional temposGestor em doPost/apiCallServidor, alimentado pelo finally de executarOperacaoGestor_. Memória reiniciada a cada entrada de transporte evita herdar medição de chamada anterior; ações fora do executor não inventam etapas. Lista de etapas: esperaLockMs, preparacaoMs, execucaoMs, planoMs, gravacaoMs e residual outrosMs. Plano inclui finalização/manutenção de leitura; gravação inclui diário, aplicação, confirmação e resumo posterior, não apenas setValues. Total começa na entrada do executor: não inclui toda a passagem Vercel/rede, serialização ou preparação anterior; não subtrair tempos de chamadas diferentes para afirmar latência de rede. Erros não recebem esta medição no envelope; fases interrompidas não devem ser interpretadas como zero real.
Frontend coleta somente metadados de respostas reais bem-sucedidas dos dois transportes, sem misturar com payload financeiro/cache. Validação de versão/ação e durações finitas de 0 a uma hora, lista branca na escrita e leitura, até 30 entradas em gestorTemposServidorV1; copiar Diagnóstico passa a incluir temposServidor. Armazenamento/metadado indisponível não altera resultado de operação. Sem consulta adicional, mudança em lock, confirmação antecipada, nova permissão ou regra financeira. Cache v131; protocolo 18 preservado, metadado opcional e compatível com backend antigo. Interfaces sincronizadas e dist preparado; publicação remota ainda pendente. Quatro testes novos cobrem isolamento da requisição, erro de logging, privacidade/limite/validação e compatibilidade sem armazenamento/metadado.

Investigação de desempenho real em 03/11/2026: diagnóstico do usuário mediu salvarLancamentoWeb em 44.198/36.906 ms, seguido de getDadosCompletos em cerca de 10 s; Mensal 10–19 s e Anual cerca de 11 s, renderização 4–41 ms, nenhuma pendência. Consulta somente de leitura à lista Execuções do Apps Script definitivo confirmou doPost concluídos às 19:32:38 (43,255 s), 19:35:00 (36,046 s), 19:35:38 (18,010 s), 19:35:47 (14,602 s) e 19:36:12 (10,131 s). A associação das ações é por horário do diagnóstico, não por payload observado. Detalhes gestor_tempo não ficaram disponíveis ao selecionar a linha; menu Registros do Cloud desabilitado. Não há ainda evidência para separar espera de lock/preparação/cálculo/gravação. Não inferir trava como causa comprovada. Próximo passo recomendado: tornar tempos técnicos acessíveis no diagnóstico do app sem dados financeiros ou nova consulta, e investigar reconsultas/cache antes de alterar proteções. Sem alteração de código ou execução de função real nesta inspeção.

Confirmação de uso real fornecida por Lucas — 03/11/2026: após corrigir o conteúdo colado em Código.gs, executar prepararAutorizacaoInicialGestor e publicar nova versão na implantação existente, o registro de execução mostrou permissões concedidas e conclusão. Usuário informou consultas corretas. Captura posterior confirma base Gestor de Gastos, proteção automática/organização anual/PDFs ativados, ano 2026 aberto e último backup confirmado às 19:28 (período 2026-11). Isso comprova os estados exibidos e o backup informado pelo app após a atualização; não equivale a restauração testada, inspeção independente de cada PDF ou execução futura dos gatilhos. Próxima observação: primeiro lançamento real gravado uma única vez e consulta em outro aparelho; acompanhar rotina agendada e fechamento anual quando ocorrerem. Preparação de permissões não precisa ser repetida se os escopos concedidos permanecerem os mesmos.

Validação da preparação de permissões: 3 testes novos (escopos, interrupção por falta de consentimento e exclusão da API), executados com os 11 testes do proxy: 14 aprovados, zero falhas. Não foi reexecutada a suíte completa nem o consentimento real do Google; cache/protocolo da interface não mudaram, pois o pacote só altera preparação no backend/documentação.

Preparação de autorização inicial — 03/11/2026: adicionados LOCALMENTE prepararAutorizacaoInicialGestor em Code.gs e modelo Backend/appsscript.json com spreadsheets, drive, script.scriptapp e userinfo.email. ScriptApp.requireScopes exige todos os quatro na execução manual pelo editor, sem criar arquivos/gatilhos, gravar dados ou ativar recursos. Fora da API. Drive é escopo amplo exigido pelas operações DriveApp já existentes; não alegar restrição OAuth à pasta. Guia Backend/AUTORIZACAO_INICIAL.md manda atualizar apenas oauthScopes em manifesto existente, preservando fuso, dependências e implantação. Não é garantia de consentimento permanente nem substitui validação do destino. Código/manifesto ainda não publicados ou autorizados remotamente nesta etapa; não interromper ativação anual em andamento para isso.
Evidência do usuário na definitiva: telas confirmaram base Gestor de Gastos, proteção ativa e último backup confirmado em 03/11/2026 às 19:03. Ativação anual foi agendada; organização anual/PDF ainda não comprovados como concluídos. Permissões de consulta e criação no Drive foram concedidas pelo usuário em etapas; nova preparação visa reunir essas solicitações em instalações futuras.

Publicação confirmada em 03/11/2026: main e origin/main no commit 1c6ecdc (Liberação Definitiva), mesmo commit da New. Conector Vercel confirmou implantação Production READY dessa revisão. POST anônimo com ação inválida, sem cookies/token nem dados financeiros, no domínio definitivo retornou 401 após a publicação. Portanto, o novo proxy foi publicado e a barreira anônima continua ativa. Ainda falta consulta autenticada, conferência da base definitiva e totais; READY/401 não comprovam a conexão Apps Script nem liberam automaticamente o uso financeiro.

Validação específica da liberação local: 14 testes de proxy/build aprovados, zero falhas, em 03/11/2026. Não foi uma nova execução da suíte completa de 1.018 testes documentada anteriormente. Sem publicação remota do proxy nesta etapa.

Estado mais recente da migração — 03/11/2026: Lucas informou ter configurado as propriedades, substituído os arquivos e publicado a implantação do Apps Script definitivo. Ainda não houve validação autenticada do destino/conteúdo remoto. Conector Vercel confirmou GESTOR_API_URL e GESTOR_API_TOKEN separados em Production e Preview, sem descriptografar, e proteção All Deployments ativa. Removido LOCALMENTE o bloqueio absoluto de Production no proxy; validações e segredos de servidor preservados, login depende da proteção Vercel. Publicação do novo proxy e consultas reais permanecem pendentes. Anotações anteriores de bloqueio/ausência de variáveis descrevem etapas passadas. Não considerar o app definitivo liberado apenas pelo teste local.

Continuidade da migração (03/11/2026): Lucas informou ter salvo a credencial exclusiva nas propriedades do Apps Script definitivo. A conferência automatizada apenas da presença da propriedade não completou por indisponibilidade do controle da aba; não considerar valor ou configuração verificados. Próximo passo de configuração é GESTOR_PLANILHA_ID da definitiva. Nenhuma credencial deve constar neste documento. Código remoto, implantação, variáveis Production e liberação do proxy seguem pendentes.

Este é um resumo das decisões, da arquitetura, das regras de negócio e do ponto em que o desenvolvimento parou. Não é uma certificação de ausência de falhas. A IA que receber este material deve conferir o código atual antes de concluir que um problema existe ou já foi corrigido.

Distinga sempre:

1. Implementação presente no repositório.
2. Comportamento demonstrado por testes locais com dados fictícios.
3. Comportamento verificado na implantação real.
4. Proposta ainda não implementada ou decisão que exige discussão.

O projeto tem muitos relatórios datados. Alguns registram versões antigas e podem mencionar nomes, testes, protocolo e cache já superados. **O código atual, o mapa do código e os relatórios mais recentes têm prioridade sobre números históricos.**

### Orientação por módulos

Adotamos dez áreas permanentes de revisão, com mapa de arquivos e regras em [Roteiro permanente de revisão por módulos](MAPA_DO_CODIGO.md#roteiro-permanente-de-revisão-por-módulos). Para validação prática, usar a matriz por módulos no [roteiro de testes](ROTEIRO_TESTES_VERSAO_DEFINITIVA.md#matriz-de-validação-por-módulos).

As análises externas foram confrontadas com o código; nem todo elogio ou correção sugerida foi aceito. Decisões preservadas: exclusões parciais recalculam o total remanescente sem apagar parcelas pagas; fila rejeitada é recuperável; rachadinha usa rateio conjunto; calculadora mantém precisão interna; histórico técnico não tem expurgo automático. Não reintroduzir sugestões antigas como pendências sem verificar o estado atual.

Lucas informou ter implementado o pacote anterior. Isso é relato de aplicação, não comprovação de validação integral em produção. A organização documental não altera código, protocolo, cache nem a última contagem de testes.

## 2. Objetivo e perfil do projeto

O produto se chama **Gestor de Gastos**. É um aplicativo financeiro pessoal, instalável como PWA em celular e computador, com armazenamento principal em Google Sheets e backend em Google Apps Script.

O objetivo é controlar gastos pessoais, cartões, parcelas, recorrências e dinheiro adiantado para terceiros, sem misturar pagamento ao banco com recebimento das pessoas. Também reúne ferramentas práticas de planejamento, comparação e compartilhamento de resumos.

Lucas, o usuário e responsável pelo projeto, programa como hobby. As explicações devem ser em português simples, mostrando o motivo e o efeito de cada mudança. Ele valoriza clareza, praticidade no celular, consistência visual, preservação do histórico e segurança dos dados. Prefere discutir alterações de conceito antes de implantá-las; correções já autorizadas devem ser concluídas e verificadas.

Estamos lapidando o app na base de testes antes de transferir o conjunto para uso definitivo. Não pretendemos declarar o sistema “perfeito” apenas por uma revisão estática ou por testes automatizados.

## 3. Estado atual conferido

| Item | Estado na preparação deste documento |
| --- | --- |
| Repositório local | `C:\Users\lucas\OneDrive\Documentos\GitHub\meu-gestor-financeiro` |
| Branch local | `New` |
| Último commit observado | `82bd1a4` — `Módulo 4 Gemini` (o ajuste seguinte de metas ainda está no trabalho local) |
| Protocolo do pacote | 18 |
| Cache do service worker | `gestor-gastos-v130` |
| Última suíte completa documentada | 1.018 testes aprovados, zero falhas |
| Último build documentado | CSS, interfaces espelhadas e pacote estático gerados com sucesso |
| Último pacote de correções | Cores consistentes das metas, distinção entre atingir/ultrapassar e explicação da competência no Painel |

Esses números representam o estado observado, não uma promessa para versões posteriores. Confira `git status`, `git log`, `sw.js` e os resultados dos comandos antes de continuar. Os testes não foram repetidos apenas para escrever este resumo.

A última rodada de desenvolvimento não publicou a implantação nem alterou planilhas reais. Um commit no GitHub pode disparar publicação automática na Vercel conforme a configuração do projeto; isso **não publica automaticamente o código do Apps Script**. Não presumir que frontend e backend remotos estejam atualizados só porque o código está salvo no Git.

## 4. Ambientes e separação dos dados

- Planilha de testes: **Cópia de Gestor de Gastos**.
- Planilha definitiva: **Gestor de Gastos**.
- Cada projeto Apps Script usa sua propriedade `GESTOR_PLANILHA_ID` para escolher a base. O nome da planilha não determina o destino.
- Não trocar esse ID a cada janeiro: existe um controle permanente responsável pelas bases anuais.
- Não copiar tokens, gatilhos, IDs ou configurações do ambiente de testes para o definitivo sem conferir seus destinos.
- Restauração e ensaios destrutivos devem usar outra cópia descartável, nunca a planilha definitiva.
- O PWA de testes foi instalado pelo endereço fixo da branch `New`, não por um link individual de implantação.

O endereço usado historicamente para essa branch é `meu-gestor-financeiro-git-new-lucasbelem00.vercel.app`. Isso não comprova que a implantação atual corresponde ao código local.

## 5. Arquitetura e caminho de uma operação

```text
Navegador / PWA
  → index.html + módulos de interface incorporados
  → apiCall
  → /api/gestor na Vercel
  → doPost no Apps Script, com token mantido no servidor
  → validação, identidade, versão, trava e diário da operação
  → planilha de controle / bases anuais / ajustes vinculados
  → resposta e confirmação para a interface
```

O frontend é principalmente HTML, JavaScript e CSS compilado com Tailwind/PostCSS. **Não é um aplicativo React ou Next.js.** Não propor reescrita em outro framework como requisito para resolver bugs localizados.

A Vercel serve os arquivos públicos e o proxy Node.js. O Apps Script executa as regras financeiras e acessa Sheets e Drive. O PWA mantém recursos estáticos, cópias de leitura, rascunhos e uma fila de envios conforme o fluxo.

Uma falha de rede ou HTTP 504 **não significa que a gravação não aconteceu**. É possível a planilha ter recebido os dados e a resposta ter se perdido. O sistema usa identificações estáveis de envio e consulta de confirmação para evitar duplicidade.

## 6. Recursos e telas existentes

### Novo registro

Cadastro de data da compra, competência da fatura, descrição, forma, categoria, valor, parcelas, tags e recorrência. Há sugestões de descrição e preenchimento auxiliar, prévia de parcelas e distribuição dos centavos.

As sugestões priorizam frequência de **compras distintas**, depois compra mais recente e ordem alfabética em português. Doze parcelas da mesma compra não contam como doze compras frequentes. O fluxo reaproveita os dados já consultados, sem buscar todos os anos novamente só para ordenar sugestões.

Rascunhos preservam também as escolhas de tipo e prioridade do gasto. Há proteção para não substituir campos relacionados a um envio ainda em conferência.

### Painel

Resumo da rotina: mês atual, valores em aberto e pagos, compromissos que precisam de atenção, atalhos de fatura e terceiros, Horizonte dos próximos meses, distribuição dos gastos e análise/planejamento.

No computador, gráfico à esquerda e Horizonte à direita, usando área maior. No celular, conteúdo empilhado; não comprimir uma tabela inteira para forçar o encaixe. A comparação de meses precisa de espaço suficiente e navegação legível.

O **limite pessoal mensal** é um teto opcional de gastos pessoais, incluindo os já pagos. Não é saldo bancário nem limite do cartão. Exclui empréstimos a terceiros e permite incluir previsões de recorrências. Sua preferência é local ao aparelho e não faz parte do backup da planilha. Quando configurado, o resultado fica visível sem exigir abrir a edição; quando ultrapassado, há indicação de excesso.

### Histórico

Busca, filtros, paginação e gerenciamento dos lançamentos pessoais. Possui resumo da seleção, repetição, edição, exclusão e compartilhamento. O valor de uma compra continua fazendo parte do gasto mesmo depois do pagamento; quitação muda o saldo, não apaga a despesa.

### Mensal

Consulta por competência, indicadores, composição da fatura, consumo por forma, tags, metas de categorias, filtros e lançamentos. O filtro pode ser acionado pelos indicadores e gráficos, além dos controles próximos da lista.

**Entrar normalmente na Mensal seleciona o mês vigente do calendário.** A opção antiga de avançar porque os cartões estavam quitados foi removida. Uma consulta manual permanece enquanto o usuário está na tela e durante atualização dos dados. Atalhos explícitos para uma fatura respeitam o período clicado.

Dentro de um mesmo grupo, seleções se somam; entre grupos, os filtros se combinam. Por exemplo: duas categorias funcionam como “categoria A ou B”; categoria mais tag exige as duas condições. Metas e lista de categorias controlam o mesmo grupo. O resumo azul aparece quando há filtro, com X vermelho para limpar a combinação.

### Balanço anual

Totais, evolução por mês, ranking de categorias, perfil dos gastos, comparação com ano anterior e PDF executivo. No ano vigente, a comparação usa meses equivalentes; anos encerrados podem ser comparados integralmente. Sem base adequada, o indicador precisa informar isso, sem inventar porcentagem.

### Empréstimos para terceiros

Cadastro e consulta por pessoa, forma, mês e situação. Edição de valor e data combinada, recebimento total ou parcial, cobrança com prévia para WhatsApp e movimentação entre gasto pessoal e terceiro com proteções.

“Empréstimo” também representa uma compra feita no cartão/Pix para outra pessoa, não apenas empréstimo bancário. O dinheiro que a pessoa deve e o saldo que Lucas deve ao banco são controles separados.

### Recorrências / despesas fixas

Séries mensais, alterações programadas, pular cobrança, desativar e retomar. A interface passou a usar “Recorrência” em situações antes exibidas como “Assinatura”. Os dados internos ainda contêm estados antigos por compatibilidade.

Pular uma ocorrência não é desativar a série. Uma ocorrência com pagamento exige conferência antes de ser pulada. Retomar usa revisão das condições, inclusive cobrança, sem apagar o histórico anterior.

### Cartões e limites

Cadastro, ordem, edição, arquivamento e reativação de formas, limite e compromissos. Uma forma pode ser cartão, Pix ou outra modalidade suportada. Não decidir o tipo apenas pelo nome escrito: Pix e cartões podem ser renomeados.

### Categorias e metas

Categorias com meta de consumo e padrões opcionais de classificação. “Outros” tem tratamento protegido e posição própria. Não remover sua proteção como simples limpeza visual.

### Agenda financeira

Calendário de faturas com saldo e devoluções com data combinada, com filtros de tipo e situação. A Agenda **consulta compromissos**, não cria gastos nem efetua pagamentos.

O vencimento bancário usa calendário compartilhado para fins de semana e feriados bancários nacionais contemplados. Há ajustes manuais locais na interface. A data prometida por uma pessoa não deve ser adiada automaticamente como vencimento bancário. Um prazo de hoje deve aparecer como hoje, e não como vencido.

### Metas e compras planejadas

Planejamento persistido na base de controle: objetivo ou compra, valor, progresso manual, prazo, prioridade e situação. Possui rascunho, proteção contra edição concorrente, ocultação de concluídos e ordenação por prazo/prioridade. Concluído continua no histórico. Enviar ao simulador ou preencher um formulário não equivale a gravar uma compra automaticamente.

### Ferramentas

- **Dividir com a galera:** divisão rápida com/sem bebida e modo detalhado por pessoas/itens, cálculo em centavos, acertos entre pessoas, rascunho e prévia compartilhável.
- **Simular compra:** cálculo e distribuição de parcelas, comparação com preço à vista e prévia editável de mensagem. Simulação não registra despesa por conta própria.
- **Calculadora:** resultado copiável, sem copiar resultado antigo quando a expressão atual é inválida.
- **Bloco de notas:** criar, editar, excluir e copiar o texto em edição ou uma nota salva. Usa controle de revisão e sincronização; não substituir por uma gravação integral sem tratamento de conflito.
- **Comparar preços:** preço total, conteúdo por pacote, quantidade de pacotes e unidade; normalização de unidades compatíveis, resultado organizado e rolagem até ele. A primeira opção sugere a unidade das demais; escolhas manuais específicas são respeitadas.
- **Conferir extrato:** análise local de CSV para comparar com dados do app e apontar diferenças. O conteúdo do CSV não é enviado à API por esse recurso. Deve oferecer diagnóstico útil, sem transformar diferenças em lançamentos automáticos.

Outras áreas: Atividade e sincronização, exportação/backup e chave Pix de cobrança. Novas ferramentas devem trazer utilidade concreta, sem preencher espaços vazios com duplicações.

## 7. Regras financeiras indispensáveis

### Banco e pessoa são independentes

Exemplo: R$ 100 pessoais e R$ 40 de outra pessoa na mesma fatura:

- Fatura do banco: R$ 140.
- Pagar R$ 140 ao banco zera o saldo da fatura.
- A pessoa continua devendo R$ 40 até o recebimento ser registrado.
- Receber primeiro os R$ 40 da pessoa não paga o cartão automaticamente.

Um pagamento bancário parcial não torna todos os itens quitados. Sua distribuição segue regra estável e revisável, preservando os valores já pagos. Juros e encargos não devem aparecer como diferenças silenciosamente absorvidas.

### Valores e parcelas

- Divisões, somas e comparações sensíveis usam centavos e regras explícitas de arredondamento.
- R$ 100 em 3 parcelas deve continuar somando exatamente R$ 100.
- Não arredondar cada parcela independentemente e perder/somar centavos.
- Compra `1/1` é exibida como **⚡ À vista**; isso descreve parcelamento, não significa que o banco já foi pago.
- `∞/∞` permanece como identificação técnica de recorrência, embora o infinito tenha sido retirado dos rótulos visuais.
- Comparar gasto pessoal com total bancário sem considerar terceiros gera falsas divergências.
- No registro conjunto da rachadinha, `parcelarDivisaoConjuntaGestor` conserva tanto o total de cada parte quanto o total por competência. Os restos são distribuídos em ciclo entre as partes; não parcelar cada pessoa isoladamente, nem repartir cada mês sem conferir os totais individuais. O alvo global é somente o montante registrado nessa operação, não os pagamentos de outras pessoas nem uma parte própria explicitamente omitida.

### Conferir fatura

A função consulta totais e permite registrar pagamento ao banco com prévia. A comparação opcional pergunta o total mostrado no app do banco e calcula a diferença em relação ao total registrado. **Comparar não é pagar nem importar automaticamente a diferença.**

### Exclusões e movimentos

Na revisão de 03/11, exclusões de parcelas selecionadas com pagamento, inclusive parcial, e de parcelas de terceiros com recebimento ou pagamento bancário passaram a ser bloqueadas. Conferir/desfazer o movimento é necessário antes de excluir o registro pago. Isso também afeta Pix já registrado como pago. O lote de “outras parcelas em aberto” pode preservar as pagas e excluir as abertas sem pagamento, recalculando o total das sobreviventes. Não retirar o bloqueio para fazer um teste antigo “passar” sem discutir a regra.

Depois de uma exclusão parcial pessoal, o campo de total da compra representa a soma em centavos das parcelas remanescentes em Lançamentos, como já ocorre na edição e antecipação. A quantidade e a posição original (por exemplo, 1/5) não são renumeradas. O diário preserva o estado anterior e o resultado traz totais e quantidades antes/depois; isso não equivale a armazenar um novo contrato original em cada linha. Não há reescrita automática do passado ou inferência das parcelas ausentes em bases legadas.

Mover entre pessoal e empréstimos não pode perder pagamento, criar recebimento implícito nem apagar metadados. Alterar descrição/categoria não pode mudar competência ou quitação por efeito colateral.

## 8. Classificação do perfil dos gastos

Duas dimensões independentes:

- Tipo: **Fixo / Variável / Não classificado**.
- Prioridade: **Essencial / Ajustável / Não classificado**.

Recorrência automática e classificação “Fixo” não são sinônimos: uma conta pode ter frequência previsível, mas valor variável; classificar não cria uma série de cobranças.

Os padrões ficam em `Perfil de Categorias`. Novos lançamentos registram um retrato do padrão vigente, com possibilidade de exceção. Mudar a categoria depois **não reclassifica o passado automaticamente**. A edição individual altera somente o registro selecionado, não as outras parcelas.

Ausência de classificação histórica e escolha explicitamente vazia são situações distintas. Não usar um fallback que preencha o passado com o padrão atual silenciosamente.

Pessoal → terceiros preserva o perfil. No retorno, preserva esse retrato e desativa a data de devolução. Empréstimo originalmente sem perfil pode receber o padrão da categoria escolhida ao virar pessoal, conforme as regras existentes.

O resumo do Painel considera gastos pessoais registrados no período, excluindo terceiros, cancelados/pulados e previsões. Perfil e classificações também acompanham relatórios e PDFs. Mudar um padrão de categoria, sozinho, não muda o retrato financeiro anterior.

## 9. Identidade, versões, diário e dados técnicos

Não confundir posição da linha com identidade do registro. Ordenação e inserção retroativa mudam o número da linha. Registro ID e Compra ID têm funções diferentes: cada parcela tem identidade própria, mas pertence a uma compra/série.

As linhas financeiras têm 18 colunas. As sete últimas, de L a R, usam estes índices JavaScript:

| Coluna | Índice | Função |
| --- | --- | --- |
| L | 11 | Registro ID |
| M | 12 | Compra ID |
| N | 13 | Versão |
| O | 14 | Estado Banco |
| P | 15 | Migração/metadados estruturados |
| Q | 16 | Conteúdo SHA256 |
| R | 17 | Pago ao banco |

As primeiras onze colunas não são idênticas entre Lançamentos e Empréstimos. Não copiar os índices de descrição, pessoa, categoria e observação entre as duas abas sem conferir o esquema.

Os metadados preservam informações de série, devolução e perfil, incluindo formatos anteriores quando necessário. Sobrescrever a célula inteira com um único novo atributo pode apagar informações de outro recurso.

O contrato de consulta da interface é diferente da linha bruta da planilha. Nas respostas de 22 posições:

| Índice | Histórico | Mensal / relatório no modo correspondente |
| --- | --- | --- |
| 17 | Indicador de arquivo anual | Valor pago ao banco |
| 18 | Valor pago ao banco | Saldo |
| 19 | Saldo | Indicador de arquivo anual |
| 20 | Perfil/classificação | Perfil/classificação |
| 21 | Estado/retrato anual | Estado/retrato anual |

Conferir `completarLinhaConsultaGestor_` e `itemLancamento`. Antes da última revisão, 18/19 do Histórico podiam estar vazios; o frontend mantém fallback para respostas antigas. **Não identificar o modo apenas pelo comprimento do array.**

O diário protege reenvios e recuperação, com estados como PREPARANDO, PRONTO e CONFIRMADO. PRONTO pode significar que parte do plano já foi aplicada. Cancelar uma operação nessa situação não pode ser equivalente a apagar o diário.

Versão e hash detectam telas antigas e mudanças externas. IDs duplicados e divergências de arquivos anuais são tratados como problemas de integridade. Não gerar um novo ID automaticamente só para eliminar o erro, pois uma duplicação acidental pode virar uma despesa aparentemente válida.

## 10. Offline, rascunhos, notas e concorrência

- A fila conserva o mesmo `requestId` no reenvio. Não gerar novo ID para uma operação sem confirmação.
- Na revisão recente, a validação passou a ser por item: inválidos recebem posição/motivo, válidos podem ser confirmados.
- Uma falha durante a execução continua interrompendo o restante para respeitar a recuperação.
- A interface envia até 50 itens por solicitação e informa se restaram outros guardados.
- Somente confirmações ou cópias recuperáveis conferidas permitem retirar um item da fila ativa: rejeitados são preservados na área de revisão local, nunca descartados automaticamente.
- A inclusão tem data em metadado local separado do pedido financeiro. Itens antigos sem data usam desempate estável, sem data histórica inventada.
- Rascunhos e notas têm estados e regras próprios. Não substituir toda a persistência por sessionStorage nem apagar localStorage para “resolver” um erro.
- Edição concorrente deve avisar conflito e preservar o dado mais recente.
- Confirmações de ações sensíveis precisam corresponder à versão e aos campos apresentados; mudanças posteriores exigem nova revisão.

O armazenamento local é útil, mas contém informações pessoais no aparelho. Uma futura política de limpeza precisa distinguir cache descartável de rascunhos e envios não confirmados. Um PIN visual não equivale automaticamente a criptografia dos dados.

## 11. Organização anual, backup e PDFs

Objetivo decidido: **um único webapp, com bases financeiras por ano e consulta do passado pelo mesmo endereço**. Não reconstruir a planilha única apagando o ano anterior e confiando somente em PDFs.

O controle permanente mantém cadastros, catálogo de anos, continuidade, notas e evidências. Os registros financeiros são organizados por competência. Uma parcela em janeiro pode exigir preparar a base seguinte antes da virada do calendário.

- `_Gestor_Anos`: catálogo das bases abertas/fechadas.
- `_Gestor_AjustesAnuais`: estado de alterações posteriores ao fechamento, vinculado ao retrato original.
- `_Gestor_Resumo`: informação derivada, reconstruível.
- `_Gestor_RelatoriosPDF`: acompanhamento de preparações e revisões.
- Outras abas técnicas mantêm diário, atividade e proteção. Não excluir abas apenas por estarem ocultas ou parecerem auxiliares.

Ano fechado é um retrato preservado. Pagamento ou recebimento tardio não deve reescrever o arquivo fechado nem contar novamente a despesa. O app pode mostrar o estado atualizado por ajustes vinculados.

A ativação anual/PDF foi tornada assíncrona para evitar concentrar toda a operação numa requisição HTTP e gerar 504. A interface acompanha os estados, e o trabalho deve ser retomável.

PDFs executivos e automáticos são relatórios de consulta, com período e revisão. Incluem perfil dos gastos e comparação anual conforme o período. Não substituem JSON restaurável nem a planilha estruturada. Arquivos anteriores não devem ser sobrescritos indiscriminadamente.

O backup restaurável precisa incluir dependências anuais e ajustes. A restauração tem prévia, confirmação e verificações de integridade; seu teste deve usar uma cópia separada. Não presumir sincronização perfeita da planilha real apenas porque a transformação funciona nos mocks.

## 12. Datas e calendário: histórico dos problemas

Houve falhas envolvendo competência inválida, texto convertido automaticamente para Date pelo Sheets e planos pendentes após exclusão/restauração. Foram acrescentados validadores, serialização e recuperação estrita de conversões conhecidas.

Regras para novas revisões:

- Distinguir data de compra, competência, vencimento e devolução combinada.
- Não confiar em `new Date(textoBR)` para interpretar `dd/mm/aaaa`.
- Conferir dia real do calendário, mês, ano e fuso do destino.
- Não converter uma competência para ISO com deslocamento de fuso que mude o mês.
- Não tratar todo erro de consulta como ausência de internet: um ReferenceError da interface já interrompeu a renderização e gerou mensagem enganosa de dados não atualizados.
- Preservar os testes de domingo seguido de Finados, fim de mês, virada de ano e conversões de texto/data.
- O calendário bancário compartilhado não é uma garantia de todas as exceções locais ou das condições específicas de cada contrato bancário.

A referência de calendário foi implementada no pacote v130: horário e fuso do servidor, com avanço local e retomada offline estimados. Os limites e testes estão na seção Relógio civil abaixo. Datas digitadas e históricas não são convertidas.

## 13. Segurança e publicação

O proxy `api/gestor.js` já possui catálogo de ações, POST obrigatório, limite de envio de 1 MiB, validação do destino Apps Script, token no servidor, resposta sem cache e tratamento de timeout. O timeout interno é de 55 segundos; `vercel.json` configura duração máxima de 60 segundos para a função.

**A API recusa o ambiente Vercel de produção com 404 intencionalmente.** Não remover esse bloqueio como se fosse um bug sem definir e testar o acesso no ambiente definitivo.

Na inspeção remota de 03/11, o conector retornou autenticação Vercel habilitada para `meu-gestor-financeiro`, com escopo `all_except_custom_domains`. Isso exclui domínios personalizados dessa regra. Não houve alteração remota de configuração.

A prévia direta do Apps Script (`preview=1` e `apiCallServidor`) foi reforçada: exige habilitação e identidade verificável igual à conta executora. Identidade vazia, diferente ou indisponível é recusada. A API `doPost` usa token e continua independente dessa prévia. Para o uso normal pela Vercel, a prévia pode ficar desativada.

**Não foram consultadas as Script Properties e as permissões da implantação Apps Script atual.** A correção local não comprova que a versão antiga publicada esteja protegida. É necessário publicar a nova versão do backend.

Não incluir segredos em HTML, logs, relatórios, mensagens a outras IAs ou exemplos. Não confiar no conhecimento do endereço como autenticação. Conferir a superfície de funções públicas do Apps Script ao revisar o acesso; não avaliar somente o proxy.

## 14. Organização do código e geração dos arquivos

| Caminho | Responsabilidade |
| --- | --- |
| `index.html` | Estrutura das telas e integração; contém módulos incorporados e código ainda não extraído |
| `interface/` | Fontes dos módulos do navegador: rotina, perfil, painel, agenda, ferramentas, navegação, modais, proteção, desempenho etc. |
| `shared/` | Regras compartilhadas e fontes de módulos incorporados no backend: calendário, competências, perfil, anual, proteção, relatórios, planejamento, divisão etc. |
| `Backend/Code.gs` | Código distribuído para Apps Script; regras principais e blocos gerados |
| `api/gestor.js` | Proxy Node.js na Vercel |
| `shared/acoes.js` | Catálogo comum de ações e seus efeitos |
| `scripts/sincronizar-rachadinha.cjs` | Incorpora muitos módulos; o nome histórico não significa que cuide somente da divisão |
| `scripts/gerar-css.cjs` | Incorpora módulos, compila CSS e sincroniza HTMLs |
| `scripts/sincronizar-interface.cjs` | Copia HTML para os espelhos; sozinho não incorpora módulos alterados |
| `scripts/publicar-estatico.cjs` | Prepara `dist/`; o nome não significa publicação remota |
| `Backend/Index.html`, `Backend/Index_para_colar.txt` | Espelhos de distribuição do HTML |
| `sw.js`, `manifest.json`, `icons/` | Cache, instalação e marca do PWA |
| `tests/` | Regressões com dados fictícios e simulações de interface/serviços |

Quando uma função estiver num módulo-fonte, editar essa fonte e regenerar. Não corrigir somente a cópia entre marcadores GERADO. Não manter variantes manuais divergentes dos três HTMLs. Não remover blocos finais do HTML só por parecerem duplicações: muitos são a distribuição gerada de uma fonte única.

Camadas sobre `apiCall`, `setAba` e renderização possuem finalidades como cache, diário, diagnóstico e navegação. Consolidar só após rastrear os efeitos. Repetição de nome não prova que a camada seja obsoleta.

Funções importantes: `executarOperacaoGestor_`, `consultarOperacaoWeb`, `registrarPagamentoFaturaWeb`, `completarLinhaConsultaGestor_`, `perfilRegistradoGastoGestor_`, `compararAnosGastosGestor_`, `rotinaProtecaoProgramadaGestor` e os pontos de entrada de `MAPA_DO_CODIGO.md`.

## 15. Identidade visual e decisões de usabilidade

Consultar `IDENTIDADE_VISUAL.md` antes de trocar ícones ou cores.

- Marca própria: bolsa dourada sobre azul, a partir de `icons/gestor.svg`; não reutilizar o cartão como marca do app.
- Mesmo significado pode repetir símbolo. O problema é o mesmo símbolo representar ações diferentes.
- Mensal 📅; anual 📆; Agenda 🗓️; Planejamento 📑; Histórico 🧾; Notas 📝; Pix 💠; recorrência 📌; repetir 🔁; à vista ⚡; parcelas ➗; comparar preços ⚖️.
- Gerenciar ⚙️; editar ✏️; excluir 🗑️; adicionar ➕; limpar 🧹; copiar 📋; cobrar 🫴; recebimento parcial ➖; antecipação ⏩.
- Verde indica pago/recebido; âmbar, pendência; vencido usa laranja mais distinto; hoje tem destaque próprio; meta/limite excedido exige alerta. Cor de total não deve insinuar quitação.
- Compras não pagas usam valor neutro; pagas podem usar verde. Recorrência ativa é uma condição da série, não prova de pagamento.
- A Central tem fundos neutros, cor no ícone e seleção do destino atual. Desktop em grupos/colunas; celular em pares, sem rolagem vazia artificial.
- Botões devem ser compactos, consistentes e legíveis. Editar fica à esquerda e Excluir à direita nas ações correspondentes.
- Voltar do celular deve fechar a camada superior de modal/Menu antes de sair do app. Trocar de aba abre o topo, não a posição rolada da outra aba.
- Mensagens para WhatsApp usam blocos curtos; ferramentas apresentam prévia antes da cópia. Cobrar abre prévia e permite copiar. Não encher uma única linha com descrição, cartão, parcela e valor.
- Ícone instalado e tela de abertura dependem também do cache do navegador/sistema. A identidade do pacote deve ser conferida separadamente da atualização percebida no aparelho.

## 16. Últimas correções e onde paramos

A rodada mais recente analisou um relatório externo extenso e aplicou os achados confirmados de forma conservadora:

1. Proteção por identidade da prévia direta do Apps Script.
2. Desativação de `quitarFaturaWeb` como caminho de gravação; algoritmo antigo removido. Rótulos de atividade antiga foram preservados para histórico.
3. Bloqueio de exclusões com pagamento/recebimento registrado.
4. Pago/saldo no Histórico inicial e paginado, com apresentação e mensagem compartilhada de pagamento parcial.
5. Validação por item na fila offline, preservação dos inválidos e confirmação dos válidos.
6. Normalização consistente dos nomes de pessoas em agrupamento, filtro, cobrança e ligação de fragmentos recebidos, sem renomear fisicamente os registros.
7. Manutenção manual também processando recorrências antes de organizar.

Antes dessa rodada, foram corrigidos problemas de perfil nos rascunhos/backups, datas, classificação perdida em transferências, estados anuais indevidos (“Ano undefined”), ReferenceError na renderização do Histórico, layout do Painel/comparador, modais/Voltar, contraste e ordenação de sugestões por frequência. Consulte testes e relatórios, sem assumir que a lista de correções elimina toda possível regressão.

Após os ajustes de moeda e rascunho do botão metade, foram aprovados 912 testes. A revisão recuperável e ordenação da fila offline elevou a suíte a 926; o recálculo dos totais nas exclusões parciais, a 936; o parcelamento conjunto e a clareza dos fragmentos, a 949. Com a padronização das metas e explicação do período, a suíte completa passou a **961 testes aprovados**, zero falhas. Em rodada anterior, houve também conferência em planilha simulada: a manutenção completou agosto/setembro/outubro de 2026 e não duplicou os períodos numa segunda execução.

**O próximo passo de liberação é atualizar/conferir a implantação de testes e executar os testes reais essenciais.** Não há autorização implícita para restaurar a planilha definitiva, remover proteção de produção ou apagar arquivos anuais.

## 17. Recomendações externas que não foram aplicadas automaticamente

### Achados adicionais corrigidos em 03/11 — Planejamento e botão metade

- **Moeda no Planejamento:** objetivo e progresso usam a máscara comum. Colagem aceita moeda brasileira como `1.500,00`, `R$ 1.500,00` e inteiro em reais. `centavosPlanejamentoGestor` faz leitura estrita em centavos, compartilhada pelo salvamento e rascunho. Texto inválido não vira zero silenciosamente; o rascunho preserva a digitação para correção. A máscara é registrada antes do salvamento automático; a validação do servidor permanece. IDs: `plano-valor` e `plano-progresso`.
- **Estado do botão metade após recarga:** `capturarEstadoMetadeGestor` guarda versão, original em centavos, metade e autoria automática da tag no rascunho de sessão e durável. `restaurarEstadoMetadeGestor` só ativa ×2 se os números salvos forem coerentes com o campo restaurado. Desfazer retorna ao original inclusive com centavo ímpar, retira somente a tag automática e preserva a tag manual. Cópias antigas sem metadados não recebem original inventado; estado incompatível é ignorado sem apagar tags.
- **Validação:** 912 testes aprovados na suíte completa. Mudanças locais de frontend/cache; nenhuma publicação remota nem função manual de ativação foi executada para esses dois ajustes.

### Fila offline em 03/11 — melhorias implementadas localmente

- Rejeitados identificados pelo índice e requestId do lote são copiados para `gestorFilaRevisaoV1:` com payload original, ID, motivo e origem. A cópia é gravada e relida antes de retirar a chave ativa; falha de armazenamento mantém o original. Se houver queda entre as etapas, a fila ignora a cópia ativa idêntica já guardada para revisão. Cinquenta rejeitados deixam de bloquear o lote seguinte.
- Atividade apresenta dados, motivo e ações de copiar, consultar confirmação, recolocar o original, preparar correção e cancelar com segurança. Preparar correção exige cancelamento confirmado pelo servidor; somente depois cria um rascunho separado em Novo → Rascunhos de novo lançamento, preservando o formulário atual e a classificação. Um pedido já confirmado não gera nova cópia; gravação em conferência ou falha de rede não autoriza correção. A correção usa outra identidade de rascunho, sem alterar o pedido antigo.
- Revisões resolvidas continuam consultáveis em “Revisões anteriores neste aparelho” e não contam como pendências. São cópias locais; não se tornam backup da planilha. Identificadores locais inválidos exigem revisão técnica e conservam a opção de copiar dados, sem gerar uma operação nova por suposição.
- A ordem usa `gestorFilaOrdemV1:` separado do payload, com horário da primeira inclusão e desempate por chave. Registros antigos sem metadado usam ordem estável por chave e precedem os datados; nenhuma data histórica é inventada. Reenvios mantêm o conteúdo, requestId e horário já guardados; tentativa de sobrescrever o mesmo ID com outro conteúdo é recusada. O backend continua calculando a impressão digital do pedido completo, sem receber os novos metadados locais.
- O diagnóstico informa a contagem `emRevisao`, sem copiar o conteúdo financeiro. A coordenação entre abas usa a trava existente da fila. O resgate manual de qualquer rascunho também restaura/limpa seu estado próprio de ÷2/×2, para não herdar o estado do formulário anterior.
- Web Locks coordena abas na mesma origem quando disponível; há fallback local, e a proteção financeira principal contra duplicação continua no backend. Não prometer exclusão perfeita entre aparelhos.
- Notas têm mecanismo próprio e tentativas automáticas de sincronização; não afirmar que todas as falhas de Notas exigem reenvio manual. O fluxo de empréstimos pendentes não é igual ao lote dos gastos pessoais. A recuperação por requestId/diário não é upload de arquivo resumível.
- Validação local: 926 testes aprovados, incluindo armazenamento insuficiente, queda entre cópia e retirada, cinquenta rejeitados, confirmação anterior, bloqueio de correção sob incerteza e preservação do pedido no reenvio. Cache v115. Não houve publicação nem teste desta interface na conta real.

### Exclusão parcial de compra parcelada — correção implementada localmente

Foi reproduzida inconsistência no campo de total: compra de R$ 100 em 5x, primeira de R$ 20 paga e exclusão das quatro abertas deixava o total antigo. A correção adicionou `prepararTotaisExclusaoPessoalGestor_`, que usa Compra ID e soma em centavos, recalculando sobreviventes tanto na exclusão individual quanto em lote. Só a coluna de total é ajustada antes da remoção e ordenação das linhas, dentro do plano transacional existente.

Agora o caso resulta numa parcela paga de R$ 20, total registrado de R$ 20 e numeração histórica 1/5, preservando quantidade original, IDs, classificação, datas e pagamento. O resultado registra `compra` com totais e contagens antes/depois. O diário conserva o estado anterior e permite desfazer. O recálculo de uma parcela de ano fechado segue os ajustes de continuidade; o arquivo fechado permanece intacto. As mensagens de confirmação e conclusão explicam o alcance. Recorrências continuam no fluxo próprio de pular mês.

Dez regressões novas cobrem exclusão individual, lote, exclusões sucessivas, centavos, compra homônima, bloqueio de pagamento parcial, exclusão integral sem órfãos, desfazer, interrupção/reenvio e ano fechado. Suíte completa: 936 aprovados. Cache v116. Atualizar o Apps Script e o frontend correspondentes para disponibilizar o pacote; não há função nova de ativação. Não houve publicação nem alteração dos dados reais nesta rodada. Não foi acrescentada uma migração que tente reconstruir exclusões antigas sem evidência.

### Rachadinha parcelada e edição de fragmentos — correções implementadas localmente

- Corrigido o desvio mensal: R$ 100 divididos em duas partes de R$ 50 e parcelados em 3x agora geram R$ 33,34 / R$ 33,33 / R$ 33,33 por fatura, preservando R$ 50 para cada pessoa. `parcelarDivisaoConjuntaGestor`, em `shared/rachadinha.js`, distribui os restos ciclicamente, com custo limitado a pessoas × parcelas e sem multiplicação de valores monetários grandes. Cada parte mantém seu total e cada coluna segue a convenção global de centavos do app.
- `previaRachadinhaWeb` devolve o plano por competência/parte e o inclui na assinatura. `registrarRachadinhaWeb` recalcula o plano no servidor e o passa por argumento interno aos gravadores pessoal/terceiros. O plano não é aceito de um campo arbitrário do pedido público. `valoresParcelasInternasGestor_` confere quantidade, positividade e soma; cadastros independentes conservam o parcelamento padrão anterior.
- A confirmação mostra totais por fatura e distribuição de cada parte, agrupando somente períodos consecutivos com o mesmo valor. A regra usa o montante desta gravação, respeitando múltiplos pagadores e a parte própria omitida. O frontend recusa registro parcelado se o backend não devolver o plano compatível. A distribuição real do banco pode diferir; a mensagem não promete correspondência universal. Não foi feita redistribuição retroativa de compras antigas.
- A prévia de edição de empréstimo agora informa o valor já recebido preservado e o total recomposto da parcela, tanto no escopo individual quanto nas próximas a receber. No exemplo de R$ 40 recebidos e restante alterado de R$ 60 para R$ 70, mostra total de R$ 100 → R$ 110. A semântica do campo não mudou e os recebimentos continuam intactos. O plano em lote inclui os totais apresentados na assinatura; soma fragmentos pelo Compra ID, parcela e competência.
- A regra de Pix não foi alterada: parte pessoal futura pode permanecer em aberto e o terceiro conserva banco pago, independentemente de A Receber. A adequação a financiamento/cheque especial continua uma discussão de produto separada; não confundir um Pix à vista com devolução parcelada e um financiamento real.
- Validação: 13 regressões acrescentadas, incluindo 500 combinações num teste de conservação, 100 pessoas/600 parcelas, gravação/fatura, assinatura, reenvio após interrupção, desfazer, ano seguinte, recebimentos fragmentados e backend antigo. Suíte completa: 949 aprovados. Cache v117; protocolo 18 e colunas existentes preservados. Atualizar backend e frontend; sem função manual nova, sem publicação remota ou alteração das planilhas reais nesta rodada.

### Metas e critério temporal do Painel — ajustes implementados localmente

`estadoMetaCategoriaGestor`, em `interface/perfil.js`, centraliza o estado visual das metas de categoria, usando valores em centavos e percentual não arredondado. Formulário Novo e termômetro mensal usam verde abaixo de 80%, âmbar de 80% até 100% inclusive e rosa somente acima da meta. Exatos 100% mostram “No limite da categoria”; arredondar 99,6% para 100% não produz excesso nem elimina a margem real. A barra do limite pessoal também usa o percentual não arredondado no limiar de 80%, preservando sua identidade azul abaixo do alerta e a indicação de limite atingido.

O Total do mês continua usando a competência da fatura e inclui registros pagos e em aberto; não é agrupado pela data efetiva do pagamento. A ajuda do Painel explica esse critério e que mês da compra e mês da fatura podem diferir. Não foi criado outro indicador nem alterada a agregação financeira. Uma regressão confirma que compra de dezembro com fatura em janeiro continua em janeiro mesmo depois de paga. Não chamar esse critério simplesmente de regime de caixa. Os alertas recalculados com correção manual continuam respeitando uma preferência local ao aparelho, não uma mudança sincronizada do contrato bancário.

Validação: 12 regressões novas, suíte completa com 961 aprovados, zero falhas. Cache v118; mudanças de frontend e documentação, sem publicação remota nem função manual nova no Apps Script. A validação na implantação real continua pendente.

### Revisão dos relatórios e PDFs — recomendações aplicadas

- Metas zeradas já são devolvidas pelo backend em `metasCategorias`, inclusive em mês sem consumo. O termômetro usa deliberadamente categorias com gasto, comportamento coberto por testes de interface. Não é perda de configuração nem ausência no payload. Recomenda-se opção “Mostrar metas sem gastos”, preservando o padrão compacto e reutilizando o payload, sem consulta extra. Categorias zeradas devem permanecer informativas, sem filtros que produzam lista vazia.
- Total do ano inclui todos os registros do ano escolhido, inclusive parcelas futuras já lançadas. A comparação anual vigente limita-se aos mesmos meses dos dois anos. São escopos diferentes, não uma soma errada. Melhorar rótulos na tela e no PDF executivo: total registrado no ano versus valor do período comparado, explicitando meses e parcelas futuras. PDFs automáticos anuais são destinados a anos anteriores/concluídos, portanto não presumir o mesmo conflito YTD em todos os PDFs. Não mudar as somas para forçar igualdade entre escopos.
- PDFs antigos são revisões preservadas intencionalmente. Crescimento no Drive merece acompanhamento, sem exclusão automática ou política de retenção presumida. Não foi feita medição do consumo real de armazenamento.
- Geração de até dois PDFs por execução reduz trabalho, mas não elimina falhas, tempo excedido ou limites da plataforma. jsPDF usa dados já carregados e a geração ocorre no navegador, mas pode precisar carregar a biblioteca e não é instantânea em qualquer aparelho. Limpar caracteres não suportados protege a apresentação com a fonte usada; não é prova de invulnerabilidade do formato binário. Filtros locais evitam ida à API, mas não têm latência literalmente zero. Não usar elogios do relatório externo como garantia de escalabilidade ou ausência de falhas.

Estes pontos continuam úteis para investigação ou discussão, sem tratá-los como falhas já demonstradas e sem implementar atalhos arriscados:

- Reconciliação assistida de uma pendência PRONTO quando a planilha sofreu alteração externa incompatível. Não basta marcar o plano como abandonado: pode haver efeitos parciais a conferir.
- Prévia de quantidade exata de recorrências retroativas. Deve vir das mesmas regras do servidor, considerando períodos existentes e pulados.
- Fonte de calendário implementada no pacote v130; conferir comportamento na implantação após atualizar ambos os lados. Offline usa estimativa, não uma consulta autoritativa ao servidor.
- Mostrar melhor diferença entre parcelas originalmente contratadas e registros remanescentes após exclusões.
- Fusão explícita de categorias/pessoas, busca global, atalhos de teclado, política de privacidade local e limites uniformes de campos: evoluções próprias, não reparos a aplicar sem desenho.
- Desempenho de travas, leituras anuais, snapshots, ordenação física e paginação: medir antes de refatorar. Não retirar travas de consultas que fazem manutenção.
- Modo de consulta parcial de arquivo anual indisponível: só com indicação clara dos dados faltantes; nunca apresentar total incompleto como completo.

Não adotar recomendações de recriar IDs duplicados automaticamente, limpar persistência indiscriminadamente, enfraquecer proteção de CSV ou sobrescrever anos fechados. Também não foi demonstrado erro financeiro no modo rápido com bebida; os controles existentes já distinguem a parte com e sem bebida.

## 18. Como testar e preparar o pacote

Na pasta do projeto, com Node.js e dependências disponíveis:

```powershell
npm test
npm run build
```

Equivalentes diretos:

```powershell
node --test
node scripts/gerar-css.cjs
node scripts/publicar-estatico.cjs
git diff --check
```

O Node disponível no ambiente desta sessão estava em:

```text
C:/Users/lucas/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe
```

Esse caminho é específico da máquina e pode mudar. Não tratar como dependência do produto. Evitar builds simultâneos, porque o gerador escreve nos mesmos arquivos. A pasta OneDrive já apresentou erros transitórios de arquivo ocupado; conferir se uma falha é de acesso antes de atribuí-la à lógica financeira.

Teste prioritário com dados fictícios: compra pessoal de R$ 100 + terceiro de R$ 40 na mesma fatura; pagar parcialmente e depois quitar banco; receber R$ 15 e depois R$ 25 da pessoa. Conferir banco e pessoa em ordens inversas, sem duplicação e sem misturar saldos.

Conferir também: centavos, edição concorrente, resposta perdida, reenvio, exclusões protegidas, Pix, mudança de forma, rascunhos/notas, recorrência pulada/retomada, dezembro/janeiro, ano fechado com movimento posterior, JSON restaurado em cópia isolada, PDFs e consistência entre Histórico/Mensal/Agenda.

Os testes locais não substituem PWA real, rede, permissões, quotas, gatilhos, arquivos Drive, aparência em todas as telas nem restauração real. Não marcar uma caixa do roteiro como aprovada sem executar seu cenário correspondente.

## 19. Atualização remota e liberação definitiva

1. Guardar backup completo e versão anterior do código/implantação.
2. Confirmar que o Apps Script de testes aponta para a cópia correta.
3. Atualizar `Backend/Code.gs`, salvar e publicar uma nova versão da implantação existente de teste.
4. Atualizar o frontend correspondente e conferir a versão realmente servida no PWA.
5. Conferir acesso autorizado/não autorizado, estado das pendências e totais conhecidos.
6. Executar `ROTEIRO_TESTES_VERSAO_DEFINITIVA.md` em conjunto com os documentos atuais. Seu cabeçalho antigo não define o protocolo/cache atuais.
7. Verificar proteção automática, organização anual e PDFs pelos estados reais do app e pelos arquivos gerados; não concluir que estão ativos só pela cor do botão.
8. Planejar a publicação definitiva com autenticação própria conferida, destinos corretos e preservação dos dados reais. Não remover simplesmente o 404 de produção.

Não foi acrescentada uma função de migração a executar manualmente só por causa dos novos campos da consulta. Isso não dispensa atualizar o backend. Ativação de proteção/organização anual e permissões/gatilhos são assuntos separados.

## 20. Instrução sugerida para outra IA fazer auditoria

> Você está revisando o Gestor de Gastos, um PWA pessoal com frontend HTML/JavaScript na Vercel e backend Google Apps Script/Sheets. Leia este documento, MAPA_DO_CODIGO.md, IDENTIDADE_VISUAL.md e REVISAO_RELATORIO_20261103.md; depois confira os arquivos atuais. Não suponha que relatórios antigos descrevem a versão presente. Procure falhas reproduzíveis de integridade, cálculos, datas, concorrência, offline, restauração, continuidade anual, segurança e usabilidade. Para cada achado, informe arquivo/função, cenário concreto, comportamento esperado/atual, impacto e evidência. Separe confirmação, hipótese, decisão intencional e sugestão de evolução. Examine as duas pontas do contrato e os módulos-fonte, não só o HTML gerado. Preserve a independência entre banco e pessoa, os centavos, IDs, versões, diário, metadados e retratos anuais. Não proponha limpar armazenamento, recriar identificadores ou remover travas para esconder erros. Antes de editar, confira git status/diff; não altere dados reais nem publique sem instrução. Ao corrigir, faça mudanças pequenas, testes relevantes e build, explicando em português simples os resultados e os limites da validação.

## 21. Arquivos a fornecer para uma revisão externa

Ideal: fornecer o repositório sanitizado, sem `.env`, tokens, credenciais, exports financeiros reais, caches pessoais e anexos privados.

Para revisão técnica abrangente, incluir pelo menos:

- Este documento, `MAPA_DO_CODIGO.md`, `IDENTIDADE_VISUAL.md` e `REVISAO_RELATORIO_20261103.md`.
- `Backend/Code.gs`, `index.html`, `api/gestor.js`.
- Pastas `shared/`, `interface/`, `scripts/`, `tests/`.
- `package.json`, lockfile, `vercel.json`, `sw.js`, `manifest.json` e configuração de build relevante.
- `ROTEIRO_TESTES_VERSAO_DEFINITIVA.md`, com a ressalva de que partes registram verificações antigas.

Enviar somente `Code.gs` e `Index.html` permite parte da auditoria, mas não basta para concluir sobre proxy, geração, cache, acesso e implantação. Uma análise estática nunca deve alegar que verificou permissões ou dados remotos sem ter acesso e evidência dessa conferência.


Atualização do Módulo 6: opção “Mostrar metas sem gastos” na Mensal usa metasCategorias já carregadas; padrão compacto mantido e metas zeradas sem ação de filtro. Anual e PDF executivo distinguem total registrado (inclui parcelas futuras) e valor do período comparado, com intervalo explícito. Cálculos e revisões dos PDFs preservados. Cache v119, pacote local, sem publicação remota. Dois testes de regressão adicionados; suíte completa: 963 aprovados, zero falhas. CSS compilado, interfaces sincronizadas e dist preparado com sucesso.


### Módulo 7 — calculadora e conferência local
Calculadora: histórico e cópia exibem até duas casas decimais, como o visor; resultados internos e reutilização preservam a precisão original. Conferência: candidatos estritos por data/valor e grupos ambíguos preservados. Nova seção sugere correspondências com mesmo valor e diferença de um ou dois dias corridos apenas entre itens sem correspondência. Não consome registros, não associa automaticamente nem registra pagamentos; sugestões podem se sobrepor e os itens continuam nas listas sem correspondência. Índices por dia/valor evitam busca quadrática. Diagnóstico inclui somente a contagem de grupos próximos, sem conteúdo do extrato. Cache v120. Implementação local, sem publicação remota.

Validação do Módulo 7: quatro regressões novas; suíte completa com 967 aprovados, zero falhas. CSS compilado, cópias de interface sincronizadas e dist preparado. Validação na implantação real continua pendente.


### Módulo 8 — exclusão no Planejamento
Adicionado Excluir à direita de Editar, com confirmação nominal e aviso de que lançamentos financeiros não são excluídos. Usa lista integral, incluindo concluídos ocultos, e salvamento existente com versão e requestId. Confirmação invalida após mudança de campos, lista ou época de restauração. Excluir outro item preserva formulário e rascunho; excluir o item editado informa descarte do próprio rascunho, realizado só após sucesso. Falha/conflito preserva estado; envio incerto bloqueia repetição. Metas acima de 100% continuam mostrando percentual real com barra limitada. Cache v121, código local sem publicação remota.

Validação do Módulo 8: quatro regressões novas; suíte completa com 971 aprovados, zero falhas. CSS compilado, interfaces sincronizadas e dist preparado. Validação na implantação real pendente. Nenhuma função manual nova no Apps Script.


### Falhas da proteção automática no Painel
Resumo leve alertaProtecao em getDadosCompletos lê propriedades, sem abrir arquivos ou consultar gatilhos. Indica falha registrada na rotina, relatórios, ativação anual ou configuração inválida; não alerta só por estar desativado ou em execução. Painel mostra um único aviso compacto com Conferir proteção, abrindo a área existente com detalhes e última cópia confirmada. Atualizar situação bem-sucedido atualiza o aviso; só desaparece quando o servidor não reporta falhas. Não há pop-ups, notificações externas nem sondagem adicional. Dados guardados no aparelho podem refletir uma consulta anterior até atualização online. Cache v122; requer frontend e Apps Script atualizados, sem nova função manual. Implementação local, sem publicação.

Validação do aviso de proteção: três regressões novas; suíte completa com 974 aprovados, zero falhas. CSS e cópias sincronizados; dist preparado. Publicação e validação real pendentes.


### Novo: retorno à vista e prévia de parcelas
Botão ⚡ À vista abaixo de Início retorna quantidade e início a 1, usa layout existente para ocultar Início e salva rascunho. Preserva valor, descrição, tags e demais campos. Prévia em duas linhas distingue quantidade e valores, informando início posterior e somente parcelas restantes com distribuição original de centavos. Atualiza ao digitar início; início fora do intervalo exibe orientação. Sem mudanças no cálculo ou gravação do backend. Cache v123, implementação local.

Validação de Novo/À vista: duas regressões novas; 976 testes aprovados, zero falhas. CSS compilado, interfaces sincronizadas e dist preparado. Sem publicação remota ou alteração no backend financeiro; conferência visual no aparelho pendente.


Correção visual de Novo: com parcelamento, Valor/Parcelas/Início ficam na mesma linha inclusive no celular (três colunas, espaços menores em telas estreitas). Mantido À vista sob Início e ocultação ao retornar a 1x. Campo de valor usa fonte/padding compactos no celular. Cache v124. Sem mudança financeira, implementação local.

Validação desta correção visual: 13 testes direcionados aprovados e execução direta de atualizarLayoutParcelas conferiu três colunas em parcelado e ocultação de Início em 1x. CSS/espelhos e dist preparados. Última suíte completa permanece a documentada anteriormente, 976 testes; não foi repetida para esta mudança visual. Conferência no aparelho ainda pendente.


Ajuste de proporção no Novo parcelado: Valor/Parcelas/Início usam pesos 1,68/1,32/1 (42%/33%/25% da largura disponível após os espaços). Mantidos mesma linha, altura, fonte e atalhos; À vista acompanha Início. Objetivo: reduzir corte do valor no celular sem remover atalhos. Cache v125. Alteração visual local para teste no aparelho, sem mudança financeira.

Validação do ajuste proporcional: 13 testes direcionados aprovados; CSS proporcional presente na compilação, interfaces sincronizadas e dist preparado. Última suíte completa permanece 976 testes da execução anterior. Sem publicação remota; teste visual no celular pendente.


Refino do Novo parcelado: proporção passa a 48% Valor / 33% Parcelas / 19% Início (descontados espaços). Início com padding horizontal reduzido; À vista em contêiner flex, altura h-6, conteúdo centralizado sem quebra e sem padding extra. Remove diferença de alinhamento causada pela linha de base do botão inline em contêiner de bloco. Não restringe a quantidade de dígitos aceita pela regra existente. Cache v126, alteração visual local; conferência no celular pendente.

Validação do refino 48/33/19: 13 testes direcionados aprovados, CSS proporcional compilado e contêiner flex conferidos, interfaces sincronizadas e dist preparado. Sem publicação remota. Última suíte completa permanece 976 da execução anterior; não repetida nesta mudança visual.


Novo: campo numérico de parcelas apresenta rótulo visual À vista quando desfocado e em 1, mantendo valor real numérico para payload/rascunho. Ao focar em 1, remove o valor para digitação; ao sair vazio ou em 1, normaliza para 1, atualiza layout e salva rascunho. Em 2+ mostra número e mantém Início. Rótulo sem captura de toque e ajuda acessível, sem mudar campo para texto. Cache v127, implementação local sem publicação.

Validação de À vista no campo: duas regressões novas; 978 testes aprovados, zero falhas. CSS compilado, interfaces sincronizadas e dist preparado. Publicação e conferência visual no aparelho pendentes.


### Auditoria externa em três partes — correções aplicadas
- Recorrências: novas ocorrências automáticas e criadas pela edição preservam perfil registrado do modelo, inclusive escolha explicitamente não classificada. Somente modelo legado sem perfil herda padrão da categoria. Meses já gravados não são reclassificados. Substitui a regra histórica do teste que reaplicava o padrão a cada mês.
- Editores pessoais/terceiros: situação é apresentada somente para consulta. Backend recusa mudanças entre pago/não pago ou recebido/a receber pela edição, em ambos os sentidos; registrar e desfazer usam fluxos próprios. Editar descrição e outros dados continua preservando pagamentos existentes. Alterar valor mantém as proteções e o recálculo já existentes.
- Reordenar formas: linhas tipo resumo ficam nas posições originais, incluindo fórmulas. Cadastros sem fórmulas são reordenados nos espaços restantes com identidades/tipos. Fórmulas em cadastros móveis bloqueiam a reordenação antes de gravar, evitando converter resultados em valores ou deslocar referências relativas.
- Fechamento mantém regra atual: compra no dia exato segue para próxima fatura. Não aplicar feriados ao fechamento; ajuste bancário por dias úteis permanece no vencimento. Testar anterior/exato/posterior e virada de ano; correspondência com cartão real deve ser conferida no banco.
- Backup: mensagens esclarecem que recuperação assistida exige análise técnica; não existe assistente automático para volume ou personalizações fora do limite.
- Dicionário de títulos centralizado em shared/portugues.js, incorporado pelo gerador nos dois ambientes. Mantida fonte do backend, acrescentando à apresentação nove entradas que só existiam no servidor; sem reescrever descrições antigas.
- Segurança: consulta somente de leitura à configuração da Vercel confirmou proteção SSO ativada com escopo all_except_custom_domains. Proxy local continua bloqueando produção. Naquela rodada, tentativas HTTP sem autenticação não completaram conexão. A verificação posterior está registrada na seção Verificação anônima e preparação da definitiva. Nenhuma configuração remota foi alterada.
- Permanecem etapas próprias: autenticação definitiva e teste anônimo real; medições em base fictícia ampliada; diagnóstico/otimização de armazenamento (tratados no v129); fonte de data/fuso para uso offline (tratada no v130). Sem retirada de travas, expurgo por idade, índices novos ou migração para IndexedDB neste pacote.
Cache v128; frontend e Apps Script precisam ser atualizados juntos. Código local, sem publicação remota e sem função manual de ativação.

Validação da auditoria em três partes: 12 regressões novas; suíte completa com 990 aprovados, zero falhas. Atualizado teste anterior de recorrência para a decisão de herança do perfil registrado. CSS compilado, interfaces espelhadas sincronizadas e dist preparado. Conferência visual e fluxos reais nos dois aparelhos pendentes.


### Desempenho conservador — 03/11/2026
Lucas já realizou vários testes manuais anteriores; este pacote acrescenta verificações específicas de desempenho/recuperação, sem reiniciar todo o roteiro. Não altera cálculos financeiros, locks, requestIds, prazo do cache de consultas, exclusões ou política de retenção.

- Pendências locais: agruparLeiturasLocaisGestor reutiliza somente a lista de chaves durante uma coleta síncrona; valores continuam sendo lidos no momento do uso e nada é reaproveitado na próxima coleta. Migração da fila legada ocorre antes da primeira enumeração. Proteção por finally libera o agrupamento após erro. Não é um cache persistente nem um índice de envios. Badge só altera DOM quando texto/visibilidade mudam.
- Atividade: mapa financeiro passa a ser construído somente se a página contém uma ação reversível ainda não desfeita. Se necessário, monta uma vez por consulta. Desfazer continua revalidando o estado atual no servidor. Busca, paginação e proteções permanecem.
- Competências: parseMesFat reutiliza resultados escalares apenas dentro da execução corrente, até 240 entradas, devolvendo cópia. Não guarda registros financeiros, não compartilha objetos mutáveis e não sobrevive à próxima operação. Datas recebidas como Date continuam convertidas no fuso existente antes da leitura.
- Diagnóstico copiado inclui contagem de chaves e estimativa UTF-16 por grupo, sem nomes de chaves, textos, valores financeiros ou remoção de conteúdo; não representa cota nem espaço livre. Inclui métricas já existentes do coordenador de consultas. A medição de armazenamento só ocorre ao montar diagnóstico.
- Ensaio scripts/medir-desempenho-local.cjs usa exclusivamente dados fictícios e planilha simulada. Em três rodadas após preparação, medianas observadas do getDadosCompletos: 300 pessoais + 50 terceiros, 305 ms antes / 154 ms depois; 1.500 pessoais + 50 terceiros, 929 ms antes / 720 ms depois. São medições locais sujeitas à variação, sem latência de Google/Drive e sem garantia de igual ganho no aparelho. Chamadas de hash mantidas; não se removeu validação para obter esses resultados.
- Ensaio determinístico de armazenamento: seis listas com 1.200 chaves passaram de 7.200 chamadas key() para 1.200, com resultados iguais. Teste de 1.000 consultas da mesma competência fez uma construção de data, preservando isolamento; histórico não reversível dispensou mapa financeiro sem afetar conferência de ações reversíveis.
Cache v129. Frontend e Apps Script devem ser atualizados juntos; não há função nova a executar manualmente. Código local, sem publicação e sem acesso às planilhas reais. A inferência de desempenho real exige observação após atualização; não é necessário repetir toda a bateria manual anterior.

Validação do pacote de desempenho conservador: dez regressões novas; suíte completa com 1.000 aprovados, zero falhas. CSS e interfaces sincronizados, dist preparado. Não houve publicação ou alteração nas planilhas reais. Conferência manual limitada aos fluxos afetados após atualizar frontend e backend.


### Relógio civil e fusos — pacote v130
- shared/relogio-civil.js centraliza o cálculo do dia no fuso do projeto por Intl, com fábrica testável. interface/relogio.js guarda uma única referência técnica local (gestorRelogioCivilV1) e expõe hojeCivilGestor, instanteCivilGestor e dataCivilISOGestor antes da inicialização das telas. Gerador incorpora as duas fontes em bloco próprio no início do HTML, incluindo a cópia do Apps Script. Não depende de biblioteca ou consulta adicional.
- doPost e apiCallServidor acrescentam relogioGestor opcional ao envelope de sucesso, com versão, instante, fuso e dia. Os dois transportes atualizam o relógio antes de entregar os dados à interface. Respostas antigas/invalidas são ignoradas; uma falha no acessório de horário não transforma uma gravação confirmada em erro. Leituras atendidas pelo cache financeiro não são uma nova sincronização do relógio. Backend antigo permanece compatível com o fallback.
- Agenda, situações de banco/devolução, alertas, mês atual da Mensal, seletores, Hoje/Ontem, padrões de Novo/Empréstimo/Simulador, notas novas, competência inicial de recorrências e nomes de exportação usam calendário civil. Cronômetros, identificadores e instantes ISO de operações conservam suas funções; fechamento/vencimento e datas escolhidas não são recalculados por fuso. Atualizar relógio não reescreve datas escolhidas, rascunhos, histórico ou preferência de mês explícito. Se o dia mudar na sincronização, corrige apenas o padrão de data de Novo/Empréstimo inteiramente vazios, sem foco nem envio; datas digitadas têm marcação manual preservada.
- Online, referência vem do fuso do Apps Script. Na sessão, tempo monotônico avança a referência recebida. Ao retomar após suspensão ou reabrir offline, a passagem do tempo é estimada pelo relógio do aparelho. Referência salva tem janela de 30 dias e exige tempo decorrido não negativo; fora disso, usa relógio do aparelho no último fuso válido. Sem sincronização anterior, padrão America/Sao_Paulo. O diagnóstico identifica fuso, origem e uso de estimativa. Não é possível garantir hora real offline se o relógio do aparelho for alterado; isso exige nova sincronização.
- Revalidação diária compara o dia civil do projeto e mantém os intervalos de tentativa baseados em instantes. Detecta virada mesmo quando UTC ainda está no mesmo dia, sem recarregar formulários em edição.
- Testes cobrem virada de ano, fusos UTC/Auckland/Los Angeles/Tokyo, aparelho adiantado, retomada offline/suspensão, resposta fora de ordem, metadados inválidos, armazenamento indisponível, integração de transportes, mês manual preservado e campos já preenchidos.
Implementação local; requer frontend e Apps Script atualizados juntos, sem função manual nova. Publicação e observação no aparelho continuam separadas da validação automatizada.

Refinamento: uma referência salva futura não bloqueia a primeira resposta online válida. A proteção contra respostas fora de ordem compara somente referências recebidas na sessão. A correção automática de formulários vazios foi testada com foco, rascunho e trava de envio.

Validação do relógio civil: 18 regressões novas; suíte completa com 1.018 aprovados, zero falhas. Conversão de fuso reutilizada por segundo (saídas copiadas), sem atrasar a virada do dia; CSS e interfaces sincronizados, dist preparado. Cache v130, protocolo 18 mantido pois metadado é opcional. Sem publicação remota ou alteração em dados reais. Conferência necessária após atualizar ambos os lados: Hoje/Ontem, mês vigente e origem/fuso no Diagnóstico, sem repetir toda a bateria anterior.


### Verificação anônima e preparação da definitiva — 03/11/2026
Consulta à configuração atual da Vercel confirmou SSO em all_except_custom_domains. Com rede liberada, POST sem cookie/token, ação inválida e sem dados financeiros em /api/gestor da branch New retornou HTTP 401; GET da página retornou 302. Endpoint de produção retornou 404 no teste GET, coerente com o bloqueio atual de produção no proxy. Não foi feita chamada de leitura financeira, gravação ou exportação. A pendência de testar acesso anônimo ao endpoint de teste foi concluída; isso não comprova configuração de um domínio definitivo futuro.
Recomendação de acesso definitivo: Vercel Authentication em All Deployments, sem exceção pública para o app, mantendo login pela conta Vercel autorizada. Comunicado oficial de 09/09/2026 informa disponibilidade em todos os planos sem custo adicional: https://vercel.com/changelog/protect-production-deployments-for-free-on-every-plan . Conferir a opção na conta e testar o domínio definitivo sem login antes de alterar o bloqueio de produção do código. Não foi modificada a configuração remota nem liberada a API de produção nesta etapa.


### Proteção definitiva ativada na Vercel — 03/11/2026
Por autorização explícita de Lucas, alterada somente ssoProtection.deploymentType de all_except_custom_domains para all (All Deployments), mantendo Vercel Authentication ativada. Configuração relida e confirmada. POST sem cookies, token ou bypass, com ação inválida que não acessa dados, retornou HTTP 401 tanto no endereço de produção quanto na branch New. Nenhuma leitura financeira, escrita, exportação, mudança de planilha ou publicação de código foi feita.
Concluída esta verificação de proteção anônima dos dois endereços atuais. O bloqueio adicional de produção no proxy permanece; liberar a API e ligar à base definitiva exigem a preparação da migração, backup e conferência do destino. Usuário autorizado acessa por login Vercel. Revisar esta proteção se trocar domínio, criar exceção pública ou alterar configurações. Cache/protocolo/testes não mudaram por esta operação remota.
### Preparação da migração — conferência em 03/11/2026
Drive confirmou a existência das bases distintas Gestor de Gastos (definitiva) e Cópia de Gestor de Gastos (testes). Metadados da Vercel listaram GESTOR_API_URL e GESTOR_API_TOKEN somente para preview, sem variáveis de produção. O proxy continua bloqueando produção. Portanto, proteção de acesso concluída não significa conexão definitiva pronta.
A tentativa de criar backup pré-migração na pasta Backups do Gestor de Gastos foi rejeitada pela revisão automática por falta de autorização explícita do destino/propriedade comprovada. Nenhuma cópia foi criada. A consulta posterior confirmou pasta sem compartilhamento e permissão de proprietário, mas não identificou inequivocamente o proprietário como a conta conectada. Aguardar autorização do destino. Depois, verificar a cópia e configurar separadamente o Apps Script da definitiva; não reutilizar a conexão de testes por suposição. Sem alteração de código, publicação ou dados financeiros nesta etapa.

Acompanhamento da preparação em 03/11/2026: após autorização explícita do destino por Lucas, criada cópia nativa da planilha definitiva chamada Gestor de Gastos — backup pré-migração — 2026-11-03. Leitura de metadados confirmou arquivo na pasta Backups do Gestor de Gastos e shared=false. Esta é uma cópia da planilha, não uma comprovação de backup JSON, gatilhos ou propriedades de implantação.
Inspeção pelo navegador identificou o projeto Apps Script vinculado à definitiva, distinto do projeto vinculado à cópia de testes. Configurações da definitiva exibem fuso Brasília/Fortaleza, V8 ativado e nenhuma propriedade do script cadastrada. Interface remota ainda mostra título antigo e Tailwind via CDN; não presumir código atualizado. Nenhum código remoto, propriedade, credencial, gatilho ou configuração de produção foi alterado. Próxima etapa: participação do usuário para criar credencial exclusiva no projeto definitivo, definir destino correto, atualizar os arquivos e configurar variáveis somente em Production; então liberar proxy de forma controlada e validar consultas autenticadas antes do uso real. Nunca copiar o token de testes por conveniência nem enviar credenciais no chat.
