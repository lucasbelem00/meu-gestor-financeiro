# Mapa do código do Gestor de Gastos

Atualizado em 03/11/2026. Este mapa descreve o pacote local de continuidade, protocolo 18. A publicação e a ativação na conta Google são etapas separadas.

## Ambientes

- Testes: **Cópia de Gestor de Gastos**.
- Uso definitivo: **Gestor de Gastos**.
- O destino é identificado pelo ID na propriedade `GESTOR_PLANILHA_ID` de cada projeto Apps Script, não pelo nome do arquivo. Alterar o nome de uma planilha não troca essa propriedade.
- Não copiar dados, propriedades de destino ou gatilhos de teste para a definitiva sem conferir o ambiente. Um teste de restauração deve usar uma cópia descartável.

## Caminho de uma ação

Otimização v134: registrosResumoNativoGestor_ monta snapshot local de catálogo/ajustes anuais e mapa de anos já conferidos; matrizFinanceiraAnualGestor_ aceita esse snapshot apenas para a mesma base, copiando as matrizes reaproveitadas. Cada nova montagem revalida origem/hash dos anos; não há cache financeiro entre operações. Coordenador em interface/desempenho.js adia relatórios cacheáveis enquanto getDadosCompletos já estiver pendente, evitando que a própria carga completa invalide um relatório recém-enviado. Falha da carga não prende relatórios; compartilhamento, invalidações e guardas de resposta tardia permanecem.

Concorrência v133: adquirirLockOperacaoGestor_ classifica indisponibilidade da trava do executor como SERVICO_OCUPADO, com espera limitada (leitura 10 s, escrita 30 s) e medição estado=ocupado. Nenhum dado é acessado antes da aquisição nem trava alheia liberada. doPost/apiCallServidor incluem tempos opcionais também em falhas; transportes validam/coletam antes de verificar sucesso. Não cria retentativa automática ou mudança no diário de recuperação.

Resumo/relatórios: registrosResumoNativoGestor_ lê e valida identidades/aliases de formas uma vez por montagem, em shared/relatorios.js, reutilizando o mapa somente na função. Elimina releitura por registro fora do contexto transacional (ex.: resumo pós-gravação). Não é cache entre chamadas; próxima montagem observa alterações no cadastro e mantém validação de ambiguidades. Incorporado pelo gerador em Backend/Code.gs.

Fonte da otimização do resumo: shared/relatorios.js. O gerador incorpora esse módulo em Backend/Code.gs; editar o bloco gerado sozinho não preserva a alteração no próximo build.

Otimização v132: atualizarResumoNativoGestor_ lê valores/categorias em matriz, relê fórmulas em matriz após persistir metadados e não reescreve fórmula já igual à gerada. Somente templates reconhecidos/aceitos são substituídos; nenhuma escrita sobre intervalo amplo do Dashboard. reconhecerFormulaPadraoResumoGestor_ aceita snapshot opcional de valores, mantendo comportamento para outros chamadores. Diagnóstico opcional detalhesGravacao inclui diarioMs, aplicacaoMs, confirmacaoMs, resumoMs e manutencaoMs; são subetapas de gravacaoMs, não tempos a somar novamente ao total.

Diagnóstico de duração (v131): executarOperacaoGestor_ registra medição opcional em memória da requisição; doPost/apiCallServidor reiniciam essa memória e incluem temposGestor no envelope de sucesso, sem alterar dados financeiros. Ambos os transportes coletam somente respostas reais, validam ação/campos numéricos e guardam até 30 entradas em gestorTemposServidorV1. montarDiagnosticoGestor exporta temposServidor com lista branca. Ausência de metadado permanece compatível; sem consultas novas, sem registro de parâmetros/IDs/valores. Módulos de sincronização, relatórios e operações financeiras afetados apenas pela instrumentação.

Configuração/autorização: Backend/appsscript.json é modelo de manifesto Apps Script com quatro escopos explícitos; não é o manifesto PWA. prepararAutorizacaoInicialGestor, em Backend/Code.gs, exige consentimento desses escopos por ScriptApp.requireScopes no editor, sem gravação ou ativação. Não integra o catálogo da API. Backend/AUTORIZACAO_INICIAL.md orienta preservar configurações do manifesto existente. Afeta módulos de configurações/identidades e backup/anual, sem mudar suas regras financeiras.

Liberação definitiva preparada em 03/11/2026: api/gestor.js atende também Production usando as variáveis próprias desse ambiente. Vercel Authentication em All Deployments é a barreira de login externa obrigatória; o proxy não autentica o usuário por conta própria. Validações de token, destino, método, tamanho e ações permanecem. Remoção do bloqueio absoluto é mudança local até publicação e conferência real.

`Tela → apiCall → proxy /api/gestor → doPost no Apps Script → regra financeira → planilha → confirmação → atualização da tela`.

O diário da operação permite reconhecer um reenvio. Falta de resposta não significa que a gravação falhou: a operação pode estar na planilha e ainda precisar de confirmação.

As sugestões de descrição no Novo usam `ordenarDescricoesAutofillGestor`: frequência de compras distintas, data da compra mais recente e ordem alfabética em português para desempate. `getDadosCompletos` acrescenta `frequencia` e `ultimaCompraEm` aos itens de `autofill`, sem mudar os campos usados para sugerir forma, categoria, valor ou tags. As parcelas de uma compra não multiplicam sua frequência. São reaproveitados os registros já usados pela memória de sugestões, sem consulta adicional ao servidor. Uma resposta antiga sem essas métricas continua utilizável, com ordenação alfabética.

## Perfil dos gastos (protocolo 18)

- Categorias guardam padrões opcionais de tipo (Fixo/Variável) e prioridade (Essencial/Ajustável) na aba `Perfil de Categorias`, criada quando necessária. Não editar suas colunas técnicas manualmente.
- O padrão é registrado no novo lançamento; o formulário permite uma exceção por dimensão. Alterar o padrão depois não muda os lançamentos existentes. O passado continua Não classificado até ser revisado individualmente.
- `perfilRegistradoGastoGestor_` distingue ausência de classificação histórica de uma escolha registrada explicitamente vazia. Ao mover Pessoal → Empréstimos, preserva-se o perfil (inclusive desconhecido). No retorno, preserva-se esse retrato e desativa-se a data de devolução; empréstimos originalmente criados sem perfil recebem o padrão da categoria escolhida ao virarem gastos pessoais.
- A edição altera somente o lançamento selecionado, preservando as demais parcelas e os pagamentos. A classificação fica nos metadados financeiros, acompanhando backups e bases anuais; o cadastro de padrões permanece na base de controle.
- Nas respostas em formato de linha, a classificação ocupa o índice 20 e o estado de fechamento anual o índice 21, tanto na Mensal quanto no Histórico. Não inferir o formato pelo comprimento da linha: campos opcionais ampliam as duas listas. A tela aceita detalhes anuais legados somente com ano válido; uma classificação não é um fechamento. Respostas antigas sem classificação válida não enviam uma limpeza implícita ao salvar outra edição.
- `salvarRascunho` inclui os dois seletores de classificação no objeto compartilhado pelas cópias de sessão e durável, preservando também escolhas vazias explícitas e Padrão da categoria. Na prévia de restauração, Perfil de Categorias é identificado pelo nome na coluna A e comparado pelas três colunas; fórmulas nessa aba são recusadas antes de qualquer restauração.
- O resumo no Painel usa valores em centavos dos gastos pessoais registrados no mês atual, pagos ou em aberto. Exclui terceiros, ocorrências canceladas/puladas e previsões. Cada grupo abre o respectivo filtro no Histórico.
- Os relatórios mensal e anual devolvem `perfilGastos` para o período consultado. PDFs executivos e automáticos incluem tabelas de tipo e prioridade com valores e percentuais, inclusive Não classificado. O extrato executivo mensal inclui a classificação de cada lançamento.
- `_Gestor_Resumo` mantém as onze colunas financeiras originais e acrescenta Tipo de gasto e Prioridade no final. Grupos de classificações diferentes permanecem separados, sem duplicar valores. Fórmulas financeiras existentes mantêm suas referências.
- A revisão 2 dos PDFs automáticos inclui a classificação na identificação dos dados. Atualizar uma classificação gera nova revisão mensal/anual elegível na rotina já existente; PDFs anteriores não são sobrescritos. Mudar somente o padrão da categoria não muda o retrato financeiro. PDFs continuam sendo consulta; o backup JSON preserva os dados para restauração.
- `compararAnosGastosGestor_` em `shared/relatorios.js` centraliza a comparação anual em centavos. `obterRelatorioAnual` consulta também o ano anterior e devolve `comparacaoAnterior`; tela e PDF executivo reaproveitam essa resposta. PDFs automáticos anuais usam o mesmo cálculo e a revisão 3 inclui o comparativo na identificação, inclusive quando a base anterior muda. Totais anuais e perfil de gastos continuam representando o ano selecionado; o indicador do ano vigente usa apenas meses equivalentes.
- Para disponibilizar este pacote, atualizar tanto o webapp quanto o Apps Script para protocolo 18. Não há função nova a executar nem ativação adicional; as configurações de organização anual existentes continuam independentes.

## Roteiro permanente de revisão por módulos

Os dez módulos abaixo são áreas de responsabilidade para orientar manutenção e auditoria. Não são dez pacotes isolados: uma função pode atender mais de uma área e mudanças precisam verificar as integrações. Esta organização não exige dividir fisicamente os arquivos nem reescrever o aplicativo.

| Nº | Área | Onde começar | Regras e verificações principais |
| --- | --- | --- | --- |
| 1 | Segurança, API e operações protegidas | api/gestor.js, shared/acoes.js, Backend/Code.gs | Autorização, ações permitidas, validação, diário e requestId. Não confundir proteção da publicação com proteção da API. |
| 2 | Sincronização, fila offline e PWA | index.html, interface/sincronizacao.js, interface/desempenho.js, sw.js | Envio incerto não é falha confirmada; preservar pedido, revisão dos rejeitados, ordem da fila, concorrência entre abas e versão do cache. |
| 3 | Lançamentos pessoais, recorrências e cálculos | Backend/Code.gs, shared/pular-fixo.js, shared/retomar-fixo.js, shared/competencias.js | Centavos, parcelas originais, pagamentos preservados, exclusão recalcula sobreviventes, pular/retomar recorrências sem recriar meses indevidos. |
| 4 | Divisão de contas e empréstimos | shared/rachadinha.js, interface/rachadinha.js, interface/compartilhamento.js, Backend/Code.gs | Soma por pessoa e por fatura, fragmentos de recebimento, prévias; receber da pessoa não paga o banco. |
| 5 | Painel, limites, horizonte e Agenda | interface/painel.js, interface/usabilidade.js, interface/agenda.js, interface/situacoes.js, shared/calendario-bancario.js | Competência da fatura, previsões separadas, situação por data, metas no limite, feriados e preferências locais. |
| 6 | Relatórios mensal/anual e PDFs | shared/relatorios.js, index.html | Total anual versus período comparado, metas sem consumo, perfil dos gastos e revisões de PDFs. PDF é consulta, não backup restaurável. |
| 7 | Calculadora, simulador, extrato e comparador | interface/usabilidade.js, interface/conferencia.js | Precisão interna versus exibição, simulação sem gravação, unidades equivalentes, CSV local e sugestões sem associação/pagamento automático. |
| 8 | Notas e Planejamento | interface/usabilidade.js, interface/planejamento.js, shared/planejamento.js, Backend/Code.gs | Revisões, conflitos, rascunhos, exclusão confirmada e lista integral com concluídos ocultos. Metas podem superar 100%. |
| 9 | Configurações, identidades e perfis | index.html, Backend/Code.gs, shared/perfil-gastos.js, interface/perfil.js | Renomeações, aliases sem colisão, arquivados, categorias antigas e padrões prospectivos sem reclassificar o passado. |
| 10 | Backup, restauração e organização anual | interface/restauracao.js, interface/protecao.js, shared/protecao.js, shared/anual.js, shared/ativacao.js, Backend/Code.gs | Integridade, envio em partes, prévia, versão/época de restauração, readback antes de remover origem, anos preservados e falhas visíveis. |

### Como usar em cada alteração

1. Identificar o módulo principal e as integrações afetadas; seguir o caminho tela → API → dados → confirmação.
2. Conferir o achado na versão atual e descrever um caso reproduzível com resultado esperado. Relatório externo é hipótese, não instrução automática.
3. Preservar as decisões financeiras e editar a fonte correta; regenerar cópias quando necessário.
4. Executar testes adequados ao risco. Para mudanças financeiras, cobrir centavos, falha, repetição, concorrência e restauração quando afetados.
5. Atualizar contexto e roteiro com evidência, resultado e pendências. Não declarar validação real com base apenas em testes simulados.

Nenhum módulo recebe selo permanente de “sem bugs”. Uma revisão vale para o código e os cenários conferidos naquele momento. Versões de cache, contagens de testes e publicação ficam no contexto contínuo, evitando números duplicados nesta tabela.

## Onde procurar

| Arquivo ou pasta | Responsabilidade | Pontos de entrada importantes |
| --- | --- | --- |
| `index.html` | Estrutura das telas, integração e regras de interface ainda não extraídas | `apiCall`, `setAba`, `carregarDados`, renderização e formulários |
| `interface/botoes.js` | Identidade textual dos botões de ação, inclusive após mudanças de texto, sem alterar dimensões, callbacks ou registros | `rotuloAcaoBotaoGestor`, `padronizarBotaoAcaoGestor`, `iniciarPadraoBotoesGestor` |
| `interface/rotina.js` | Rascunhos financeiros, identidade da edição e fluxos diários | `lerRascunhoRotinaGestor`, `guardarRascunhoRotinaGestor` |
| `interface/sincronizacao.js` | Orientações, recuperação e revisão local dos rejeitados da fila | `orientacaoPendenciaGestor`, `conferirRecuperacaoServidorGestor`, `executarRevisaoFilaGestor`, `renderizarRevisaoFilaGestor` |
| `interface/compartilhamento.js` | Mensagens em blocos para WhatsApp: empréstimos, Histórico e Simulação; totais e situações separados | `montarCobrancaMensagemGestor`, `montarResumoHistoricoMensagemGestor`, `montarSimulacaoMensagemGestor` |
| `interface/usabilidade.js` | Horizonte, simulador, calculadora, notas e comportamento da Mensal | `renderizarNotasUI`, `copiarNotaGestor` (lista), `copiarTextoEditorNotaGestor` (campo atual); procurar também por horizonte, simulador e nota neste arquivo |
| `interface/rachadinha.js` | Pessoas, itens, prévia, rascunho e preenchimento da divisão | `calcularRachadinha`, `renderizarPessoasRachaDet`, `preencherParteRachaGestor` |
| `interface/desempenho.js` | Leituras compartilhadas, cache transitório e gráficos visíveis | `criarCoordenadorLeiturasGestor`, `invalidarLeiturasDesempenhoGestor`, `obterMetricasDesempenhoGestor` |
| `interface/faturas.js` | Consulta resumida, comparação com banco e confirmação do pagamento | `conferirPagamentoFaturaGestor`, `atualizarComparacaoFaturaGestor`, `confirmarPagamentoFaturaGestor` |
| `interface/painel.js` | Ordem do Painel, lembretes pela data combinada e limite pessoal sem novas consultas | `organizarPainelDiarioGestor`, `listarDevolucoesPainelGestor`, `renderizarRotinaPainelGestor` |
| `interface/perfil.js` | Classificação, perfil dos gastos e estado visual comum das metas de categoria | `criarCamposPerfilLancamentoGestor`, `renderizarPerfilGastosPainelGestor`, `abrirPerfilHistoricoGestor`, `estadoMetaCategoriaGestor` |
| `shared/perfil-gastos.js` | Validação, padrões por categoria, classificação registrada no lançamento, resumo em centavos e filtros | `perfilNovoLancamentoGestor_`, `definirPerfilGastoGestor_`, `resumoPerfilGastosGestor_`, `correspondePerfilGastoGestor_` |
| `interface/agenda.js` | Calendário de consulta dos saldos bancários e devoluções com data; reaproveita os dados carregados | `compromissosAgendaGestor`, `renderizarAgendaGestor`, `moverMesAgendaGestor` |
| `interface/planejamento.js` | Metas, compras planejadas, rascunho local, confirmação e envio ao simulador | `carregarPlanejamentoGestor`, `renderizarPlanejamentoGestor`, `selecionarItensPlanejamentoGestor`, `enviarPlanejamentoGestor` |
| `shared/planejamento.js` | Aba permanente Planejamento, valores em centavos, validação e versão da lista para evitar sobrescrita concorrente | `validarPlanejamentoGestor_`, `obterPlanejamentoWeb`, `salvarPlanejamentoWeb` |
| `shared/datas-recuperacao.js` | Retomada estrita de conversões texto→Date em planos pendentes; exige coincidência integral do resultado e usa o fuso do destino | `recuperarDatasTextoPlanoGestor_` |
| `interface/restauracao.js` | Seleção, envio em partes, comparação e confirmação do backup | `criarControleRestauracaoGestor`, `lerExportacaoPreparadaGestor` |
| `interface/navegacao.js` | Rolagem por aba, botão de voltar ao topo, destino atual destacado na Central e Voltar fechando a Central | `iniciarRolagemNavegacaoGestor`, `atualizarBotaoTopoGestor`, `voltarAoTopoGestor`, `sincronizarSelecaoCentralGestor` |
| `interface/modais.js` | Histórico temporário coordenado de Menu, editores, confirmação, fatura, exportação e cobrança; Voltar fecha a camada superior usando os fechamentos existentes | `criarHistoricoModaisGestor`, `iniciarHistoricoModaisGestor` |
| `interface/protecao.js` | Painel de backups, consulta dos arquivos anuais e filtros de empréstimos | `solicitarEmprestimosArquivoProtecaoGestor`, `restaurarFiltrosIniciaisEmpGestor` |
| `shared/rachadinha.js` | Cálculo da divisão e distribuição conjunta das parcelas em centavos | `calcularDivisaoContaGestor`, `parcelarDivisaoConjuntaGestor` |
| `shared/competencias.js` | Intervalo de anos e validação da primeira/última competência das parcelas | `anoCompetenciaValidoGestor_`, `validarPeriodoParcelasGestor_`; incorporado na interface e no backend pelo gerador |
| `shared/calendario-bancario.js` | Calendário bancário automático único para a interface e o fallback dos avisos no servidor | `vencimentoFaturaBaseBancarioGestor`, `feriadosBancariosGestor`; gerado em `interface/situacoes.js` e no backend. Correções manuais locais permanecem na interface |
| `shared/protecao.js` | Backup agendado, arquivo anual, compactação e recuperação da manutenção | `backupMensalProtecaoGestor_`, `planejarArquivoAnualProtecaoGestor_`, `rotinaProtecaoProgramadaGestor` |
| `shared/acoes.js` | Contrato único das ações, usado por interface, cache e proxy | `CATALOGO_ACOES_GESTOR`, `metadadosAcaoGestor` |
| `shared/notas-backup.js` | Compatibilidade do esquema antigo de Notas | `normalizarAbaNotasBackupGestor_`, `garantirCabecalhoNotasGestor_` |
| `shared/anual.js` | Bases por competência, fechamento, ajustes e restauração v3 | `matrizFinanceiraAnualGestor_`, `desdobrarPlanoAnualGestor_`, `conferirDestinosAnuaisPlanoGestor_` |
| `shared/apresentacao-anual.js` | Cabeçalhos e resumo visual de cada base anual; preserva os registros financeiros e personalizações detectadas | `prepararApresentacaoAnoGestor_`, `atualizarResumoVisualAnualGestor_`, `hashResumoVisualAnualGestor_` |
| `shared/ativacao.js` | Agendamento e acompanhamento da ativação anual sem espera HTTP | `solicitarAtivacaoAnualGestor_`, `retomarAtivacaoAnualGestor`, `statusAtivacaoAnualGestor_` |
| `shared/relatorios.js` | Resumo nativo e PDFs mensais/anuais derivados | `atualizarResumoNativoGestor_`, `gerarRelatoriosPDFProgramadosGestor_` |
| `Backend/Code.gs` | API e regras de dados no Apps Script; inclui blocos gerados | Ver tabela seguinte |
| `api/gestor.js` | Validação e encaminhamento ao Apps Script, com token mantido no servidor | `ACAO_PERMITIDA` e função exportada `gestor` |
| `sw.js` e `manifest.json` | Instalação e cache do PWA | Versão do cache e regras de atualização |
| `icons/gestor.svg` e PNGs em `icons/` | Marca própria, favicon e ícones instalados; mestre incorporado no cabeçalho pelo build | `scripts/sincronizar-rachadinha.cjs`; convenções em `IDENTIDADE_VISUAL.md` |
| `tests/` | Regressões com dados fictícios | `tests/README.md` e arquivos por assunto |

## Funções principais do servidor

### Apresentação e filtros em `index.html`

- `iconeFormaPagamentoVisualGestor`: escolhe ícone pelo tipo da forma, inclusive Pix renomeado.
- `corValorLancamentoGestor` e `obterClasseBadgeStatus`: cores de valores e situações nas listas.
- `rankingCategoriasVisualGestor`: ordenação, posições e empates do ranking anual.
- `normalizarFiltrosMensaisGestor` e `situacoesFiltroMensalGestor`: normalizam seleções e expandem os atalhos A pagar/Pago em situações visíveis.
- `aplicarFiltroInternoMensal`, `sincronizarEstadoFiltrosMensalGestor` e `filtrarItensMensaisGestor`: seleção, estado acessível e combinação dos filtros. Categorias e metas compartilham o mesmo grupo.

### Entradas do Apps Script

| Necessidade | Funções em `Backend/Code.gs` |
| --- | --- |
| Escolher a base configurada | `obterPlanilhaGestor_` |
| Ler mês como texto ou data e exportar datas no JSON | `parseMesFat`, `valoresCelulasBackupGestor_` |
| Preservar texto financeiro e retomar transferência com conversão de formato | `textoCelulaRegistroGestor_`, `recuperarTextosTransferenciaAnualGestor_` (fonte em `shared/anual.js`) |
| Receber pedidos do app | `doPost` |
| Preparar leitura inicial | `getDadosCompletos` |
| Gravar e reconhecer reenvios | `executarOperacaoGestor_`, `consultarOperacaoWeb` |
| Novo gasto | `salvarLancamentoWeb` |
| Relatórios | `obterRelatorioMes`, `obterRelatorioAnual` |
| Conferir e registrar pagamento ao banco | `previaPagamentoFaturaWeb`, `registrarPagamentoFaturaWeb` |
| Editar empréstimo | `editarEmprestimoLinhaWeb`, `editarEmprestimoLinhaWebInterno_` |
| Aplicar valores à parcela atual e próximas a receber | `indicesValorEmprestimoGestor_`, `planoValoresEmprestimoGestor_`, `previaEdicaoEmprestimoWeb` |
| Gravar notas com revisão | `salvarNotasWeb`, `salvarNotasWebInterno_` |
| Alterar categorias e nomes de formas | `salvarCategoriasWebInterno_`, `renomearFormaNasAbas` |
| Restaurar dados | `restaurarBackupDadosWeb` e funções de prévia/importação |
| Investigar pendências | `diagnosticarPendenciasWeb` |

O sufixo `Interno_` costuma indicar a implementação chamada pela entrada pública. As entradas públicas podem acrescentar diário, trava, validação e confirmação. Não contornar essas camadas chamando a função interna diretamente pela interface.

## Fontes e arquivos gerados

- Editar módulos em `interface/` e `shared/` quando a responsabilidade já estiver lá. Não editar apenas a cópia incorporada entre marcadores `GERADO`.
- `scripts/sincronizar-rachadinha.cjs` incorpora o motor compartilhado, os módulos de `interface/`, competências, catálogo de ações e módulos do servidor. Apesar do nome antigo, não cuida somente da rachadinha. A lista real de módulos fica nesse gerador.
- `scripts/gerar-css.cjs` chama essa incorporação, compila o CSS e sincroniza os três HTMLs.
- `scripts/sincronizar-interface.cjs` apenas copia o HTML raiz para `Backend/Index.html` e `Backend/Index_para_colar.txt`; não incorpora alterações dos módulos por conta própria.
- `scripts/publicar-estatico.cjs` prepara `dist/` com os arquivos públicos. `npm run build` executa a compilação e essa preparação; não publica uma implantação remota.
- `Backend/Index.html`, `Backend/Index_para_colar.txt` e `dist/` são artefatos de distribuição. Não são versões independentes a manter manualmente.
- `scripts/medir-desempenho.cjs` mede cenários locais. Medidas locais não equivalem ao tempo da rede real.

## Como manter a documentação durante a otimização

Ao extrair ou consolidar uma função, atualizar este mapa. No módulo, explicar a responsabilidade, as entradas e saídas relevantes, os efeitos na planilha/armazenamento e as regras que precisam ser preservadas. Comentar o motivo de uma proteção, sem repetir cada linha de código.

Foram consolidadas 13 implementações de interface, removidos três auxiliares sem referências e retirados cálculos antigos de vencimento sem efeito. As camadas sobre `apiCall` e `setAba` que cumprem funções reais permanecem. O catálogo das ações é único; não remover as camadas de diário, integridade, diagnóstico e cache apenas porque envolvem a mesma função. Os relatórios antigos descrevem suas respectivas versões; seus números de protocolo, cache e testes não devem ser usados como estado atual.

## Organização anual implementada localmente

Objetivo: um único webapp, bases financeiras por ano e consulta do passado sem trocar o endereço do app.

1. Manter um controle permanente com catálogo dos anos, identidades, cadastros, regras fixas, notas, provas de operações e continuidade de obrigações. Separar o ambiente de testes do definitivo por IDs.
2. Organizar os registros financeiros por competência da fatura, com IDs estáveis da compra e de cada parcela. Uma parcela de janeiro pode exigir a preparação da base do ano seguinte antes da virada do calendário.
3. Preparar e conferir o novo destino antes de ativá-lo. A troca deve ser retomável e reconhecer repetições; mudar apenas `GESTOR_PLANILHA_ID` não faz uma migração segura.
4. Não encerrar o ano automaticamente só porque chegou janeiro. Manter um estado de fechamento e conferir operações pendentes, totais, parcelas futuras e saldos. O uso do ano novo não deve depender de todos os devedores antigos já terem pago.
5. Após o fechamento, preservar o arquivo anual como retrato daquela data. Recebimentos, pagamentos e correções posteriores precisam de registros vinculados no controle de continuidade, sem reescrever o arquivo fechado nem contar novamente a despesa original.
6. Mostrar no histórico a diferença entre a situação no fechamento e os movimentos posteriores. Os totais precisam distinguir competência do gasto e data do pagamento/recebimento.
7. Gerar PDFs mensais/anuais como relatórios de consulta com período, data e revisão. Preservar o JSON restaurável e incluir todas as dependências anuais e de continuidade. PDF não substitui a base estruturada.
8. Validar virada, envio atrasado/offline, fatura aberta, recebimento tardio, mudança de cartão, interrupção e restauração na cópia de teste antes de ativar na definitiva.

A ativação fica em Menu → Exportar dados e backup → Ativar organização por ano e PDFs, após a proteção automática. A base configurada continua sendo o controle permanente; não trocar manualmente `GESTOR_PLANILHA_ID` todo janeiro.

`_Gestor_Anos` aponta para as bases abertas e fechadas. `_Gestor_AjustesAnuais` guarda o estado atual das alterações posteriores ao fechamento; o diário preserva as operações. O importador reconstrói esses ajustes a partir do estado efetivo e dos retratos anuais do JSON v3. `_Gestor_Resumo` é derivado e pode ser reconstruído. `_Gestor_RelatoriosPDF` acompanha preparações e revisões dos relatórios.

O arquivo anual antigo, de compras integralmente encerradas, continua compatível. A ativação incorpora os registros desse catálogo sem duplicar IDs e preserva os arquivos anteriores. Colunas ou fórmulas particulares que impeçam restauração automática bloqueiam a migração anual, sem remover seu conteúdo.

O ciclo confere pendências e destinos, prepara o ano atual e fecha os anos passados. Saldos financeiros em aberto continuam recebendo baixas por ajustes vinculados. As telas indicam a origem fechada e a diferença em relação à situação preservada. PDF considera competência e situação na data da geração; não é um relatório de fluxo de caixa pela data do pagamento.

Para instruções e limites, consulte [o pacote de continuidade](PACOTE_CONTINUIDADE_ANUAL_20261028.md).

`interface/conferencia.js` reúne o comparador de preços (`compararPrecos`), o leitor CSV (`csv`), a comparação somente de leitura (`conciliar`) e o diagnóstico sem conteúdo financeiro (`diagnostico`). A geração incorpora esse módulo nas três interfaces. Uso, limites e roteiro de testes: [Comparador e extrato](PACOTE_COMPARADOR_EXTRATO_20261031.md).

O [pacote da auditoria de 01/11](PACOTE_CORRECOES_AUDITORIA_20261101.md) documenta o CSV restrito em partes (`montarDadosExportacaoCSVGestor_`), a revalidação de dia (`criarRevalidadorDiaGestor`), a limpeza do comparador e os controles independentes de leitura e consulta do extrato. JSON e CSV usam a mesma preparação e conferência de integridade; só o JSON é restaurável.

`interface/situacoes.js` concentra a apresentação de recebimentos, pagamentos e prioridade dos dias da Agenda, sem registrar baixas. Regras e composição do Horizonte: [Situações visuais](PACOTE_SITUACOES_VISUAIS_20261101.md).

A [auditoria profunda de 01/11](AUDITORIA_PROFUNDA_20261101.md) descreve a validação estrita das datas, proteção de confirmações e respostas do Planejamento, normalização do limite, reconhecimento de recebimentos parciais por identidade e retomada da consulta na reconexão. `assinaturaEdicaoPlanejamentoGestor` e `confirmarAcaoPlanejamentoGestor` protegem o formulário; `normalizarConfigLimitePessoalGestor` isola preferências locais inválidas.

O Planejamento oculta concluídos por padrão, permite consultar o histórico desmarcando o filtro e oferece ordenação por prazo/prioridade ou prioridade/prazo. A filtragem é somente visual, com contagem de itens ocultos; a lista integral permanece na persistência e no backup. Trocar filtro ou ordem atualiza apenas a lista, preservando os campos em edição.

Calendário nacional de vencimentos, exceções locais e limites da implementação: [Calendário bancário](CALENDARIO_BANCARIO.md).

Despesa fixa: prévia protegida e ação reversível para pular uma competência em [Pular mês](PULAR_MES_FIXO.md), implementadas em shared/pular-fixo.js.

Retomada de assinaturas encerradas: [fluxo, validações e publicação](RETOMAR_ASSINATURA.md). Servidor em shared/retomar-fixo.js; modal em interface/retomada.js.

## Revisão de segurança e consistência de 03/11/2026

Ver `REVISAO_RELATORIO_20261103.md` para decisões e roteiro. `acessoPreviaDiretaGestor_` protege a prévia do Apps Script com identidade; o token de `doPost` permanece independente. `sincronizarLoteWeb` informa erros por item e confirma os válidos; a tela envia até 50 itens por vez. `completarLinhaConsultaGestor_` preenche 18/19 com pago/saldo no Histórico, preservando os índices técnicos existentes. Exclusões financeiras verificam movimentos antes de apagar linhas. A rota antiga `quitarFaturaWeb` recusa novas gravações; os rótulos antigos são preservados para atividades já registradas.

## Moeda do Planejamento e rascunho da metade — 03/11/2026

`interface/planejamento.js`: `centavosPlanejamentoGestor` valida moeda brasileira e converte em centavos para salvamento e rascunho; `configurarMoedaPlanejamentoGestor` aplica a máscara comum e trata colagem sem confundir inteiro em reais com centavos. Texto incompleto/inválido é preservado no rascunho, sem envio como zero.

`index.html`: `capturarEstadoMetadeGestor` e `restaurarEstadoMetadeGestor` guardam/validam original, metade e autoria da tag. `salvarRascunho` e `dadosFormularioRascunhoGestor` em `interface/rotina.js` preservam esses metadados nas cópias de sessão e duráveis. Rascunhos antigos não permitem inferir o original. A rodada de moeda usou cache v114 e 912 testes; a seguinte está descrita abaixo. Sem nova ativação no Apps Script.

## Fila offline recuperável e ordenada — 03/11/2026

No HTML principal, `entradasFilaOrdenadasGestor` ordena pelos metadados locais `gestorFilaOrdemV1:`, com desempate estável para registros antigos; `guardarRejeicoesFilaGestor` confere a resposta contra o lote, guarda e verifica a cópia em `gestorFilaRevisaoV1:` antes de retirar da fila ativa. `lerFilaOfflineGestor` não reenvia uma cópia idêntica já em revisão após interrupção. Nenhum timestamp é acrescentado ao pedido financeiro.

`interface/sincronizacao.js` apresenta a revisão em Atividade, com consulta, reenvio do original, cancelamento e preparação de correção. `criarCopiaCorrecaoFilaGestor` só é chamado após cancelamento confirmado; guarda rascunho separado, não substitui o formulário e não reutiliza o requestId cancelado para novo conteúdo. Originais resolvidos continuam acessíveis em uma seção recolhida local. `interface/rotina.js` restaura também o estado de metade ao recuperar rascunhos manualmente.

Na rodada da fila, cache v115 e 926 testes aprovados. O recurso depende do backend já existente que retorna rejeições por item e oferece consulta/cancelamento seguros. Atualização local de frontend, sem função manual nova e sem publicação remota realizada nessa rodada.

## Exclusão parcial e total da compra — 03/11/2026

`Backend/Code.gs`: `prepararTotaisExclusaoPessoalGestor_` calcula o grupo por Compra ID e os totais em centavos antes/depois da exclusão. `excluirLancamentoWebInterno_` verifica os pagamentos dos alvos, atualiza somente a coluna E dos sobreviventes antes de remover linhas e mantém quantidade/posição original das parcelas. O resultado traz `compra` com totais e contagens; o diário existente preserva o estado anterior para conferência e desfazer. Não há novo formato de metadados nem migração automática de exclusões antigas.

O plano anual existente transforma alterações em registros fechados em ajustes de continuidade, sem reescrever o retrato. As mensagens de `excluirLancamentoLocal` no HTML explicam o total das parcelas restantes. Cache v116; última suíte completa: 936 testes aprovados. Atualizar backend e frontend; sem nova função manual de ativação. Nenhuma publicação remota executada nesta rodada.

## Rachadinha parcelada e prévia de fragmentos — 03/11/2026

`shared/rachadinha.js`: `parcelarDivisaoConjuntaGestor` conserva totais por parte e fatura, distribuindo restos em ciclo. `previaRachadinhaWeb` assina o plano e `registrarRachadinhaWeb` o recalcula, usando argumentos internos de `sincronizarLoteWebInterno_` e `salvarEmprestimoWebInterno_`. `valoresParcelasInternasGestor_` valida o plano; campos do pedido público não controlam essas parcelas. Os demais cadastros mantêm seu cálculo anterior.

`interface/rachadinha.js`: `textoParcelamentoRachadinhaGestor` apresenta a distribuição antes de gravar, agrupando períodos de valor igual. Registro parcelado exige o plano compatível do backend. O total considera apenas o que será registrado, não partes omitidas ou valores pagos por outro participante.

`recebidosPorParcelaEmprestimoGestor_` e `resumoFragmentoEmprestimoGestor_` recompõem o recebido/total da parcela para a prévia, sem alterar os recebimentos. `textoPreviaValorEmprestimoGestor`, em `interface/compartilhamento.js`, apresenta o efeito da edição tanto individual quanto em lote. As proteções de pagamento e a regra de Pix foram preservadas.

Última suíte completa: 949 testes aprovados; cache v117. Atualizar Apps Script e frontend. Protocolo 18, sem nova coluna nem ativação manual. Não há redistribuição retroativa de divisões já registradas. Nenhuma publicação remota executada nesta rodada.

## Metas e competência do Painel — 03/11/2026

`estadoMetaCategoriaGestor`, em `interface/perfil.js`, calcula o estado visual em centavos, sem usar o percentual arredondado para decidir alerta/excesso. `atualizarVisorMetaCategoria` e o termômetro mensal no HTML reaproveitam a função: verde abaixo de 80%, âmbar até 100% inclusive e rosa acima. O percentual arredondado permanece apenas na apresentação. `interface/painel.js` também usa o valor exato no alerta intermediário da barra de limite pessoal.

`interface/rotina.js` explica a competência/mês da fatura nos indicadores, incluindo pagos e em aberto. As somas do backend e os critérios de período não mudaram. Cache v118; última suíte completa: 961 testes aprovados. Atualização de frontend, sem nova ativação no Apps Script e sem publicação remota nesta rodada.

- Relatórios: renderizarTermometroMensalGestor em index.html atualiza a opção de metas sem gastos com o cache mensal, sem API; categorias zeradas não filtram.

- Módulo 7: interface/usabilidade.js formata histórico/cópia da calculadora em até duas casas, preservando precisão interna. interface/conferencia.js calcula proximos por índices de data/valor e renderiza sugestões sem alterar candidatos, pagamentos ou itens sem correspondência.

- Planejamento: excluirItemPlanejamentoGestor (interface/planejamento.js) confirma e remove por ID da lista integral; enviarPlanejamentoGestor recebe preservarEditor opcional para exclusões que não envolvem o rascunho aberto. Fluxos antigos mantêm comportamento padrão.

- Proteção no Painel: resumoAlertaProtecaoGestor_ em shared/protecao.js compõe flags leves da carga getDadosCompletos; renderizarAlertaProtecaoPainelGestor em interface/protecao.js controla aviso e acesso aos detalhes, atualizado também pela consulta de situação.

- Novo em index.html: voltarPagamentoAVistaGestor reutiliza atualizarLayoutParcelas e salvarRascunho; atualizarPreviewParcelas apresenta parcelas restantes sem alterar a divisão original em centavos.

- Novo: atualizarRotuloParcelasNovoGestor, iniciarEdicaoParcelasNovoGestor e concluirEdicaoParcelasNovoGestor em index.html controlam rótulo visual sem alterar tipo numérico do campo; atualizarLayoutParcelas sincroniza apresentação após atalhos/rascunhos.

## Correções da auditoria em três partes — 03/11/2026

- Backend/Code.gs: validarTransicaoStatusEdicaoGestor_ protege editores pessoais e de terceiros; processarAssinaturasAutomaticas e editarAssinaturaWebInterno_ preservam perfil do modelo.
- reordenarFormasPagamentoWebInterno_: preserva posições de resumo/fórmulas e recusa fórmulas nos cadastros móveis, sem tentar traduzir referências.
- shared/portugues.js: fonte única de DICIONARIO_ACENTOS_PT; scripts/sincronizar-rachadinha.cjs incorpora no HTML e Apps Script. Editar a fonte, não as cópias geradas.

## Desempenho conservador — 03/11/2026

- index.html: agruparLeiturasLocaisGestor limita o reaproveitamento de chaves à coleta síncrona de listarPendenciasAtividadeGestor; lerEntradasLocaisGestor continua lendo os valores atuais. atualizarBadgeAtividadeGestor evita alterações repetidas do DOM.
- Backend/Code.gs: parseMesFat tem cache limitado ao contexto da execução e resultados copiados; obterAtividadeWeb só monta mapaRegistrosAtividadeGestor_ quando a página precisa avaliar ação reversível.
- interface/desempenho.js: diagnosticoArmazenamentoGestor agrega estimativas de volume sem conteúdo; montarDiagnosticoGestor integra esse resumo e as métricas das consultas.
- scripts/medir-desempenho-local.cjs: ensaio com 300/1.500 gastos e 50 terceiros em mocks, três rodadas, sem acesso remoto. Testes de redução de trabalho e recuperação em tests/desempenho-conservador-20261103.test.cjs, atividade-paginada e fila-revisao-ordem.

## Relógio civil — v130

- shared/relogio-civil.js: criarRelogioCivilGestor, núcleo puro com instante/fuso, referência salva estimada e fonte de tempo injetável para testes.
- interface/relogio.js: integração com armazenamento e retomada; hojeCivilGestor fornece Date de calendário local ao meio-dia representando o dia do projeto, não o instante real; instanteCivilGestor fornece o instante estimado. Não usar hojeCivilGestor como cronômetro. dataCivilISOGestor devolve YYYY-MM-DD no fuso configurado.
- Backend/Code.gs: referenciaRelogioServidorGestor_ acrescenta metadados opcionais aos envelopes de doPost/apiCallServidor, sem alterar dados nem autenticação.
- scripts/sincronizar-rachadinha.cjs: gera bloco do relógio no início do HTML a partir das duas fontes, antes dos consumidores. interface/desempenho.js aceita função dia no revalidador para separar dia civil de passagem de tempo.
- tests/relogio-civil-20261103.test.cjs: cenários de fuso, viradas, offline e compatibilidade.
