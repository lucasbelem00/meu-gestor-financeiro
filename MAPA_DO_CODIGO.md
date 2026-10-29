# Mapa do código do Gestor de Gastos

Conferido em 29/10/2026. Este mapa descreve o pacote local de continuidade, protocolo 17. A publicação e a ativação na conta Google são etapas separadas.

## Ambientes

- Testes: **Cópia de Gestor de Gastos**.
- Uso definitivo: **Gestor de Gastos**.
- O destino é identificado pelo ID na propriedade `GESTOR_PLANILHA_ID` de cada projeto Apps Script, não pelo nome do arquivo. Alterar o nome de uma planilha não troca essa propriedade.
- Não copiar dados, propriedades de destino ou gatilhos de teste para a definitiva sem conferir o ambiente. Um teste de restauração deve usar uma cópia descartável.

## Caminho de uma ação

`Tela → apiCall → proxy /api/gestor → doPost no Apps Script → regra financeira → planilha → confirmação → atualização da tela`.

O diário da operação permite reconhecer um reenvio. Falta de resposta não significa que a gravação falhou: a operação pode estar na planilha e ainda precisar de confirmação.

## Onde procurar

| Arquivo ou pasta | Responsabilidade | Pontos de entrada importantes |
| --- | --- | --- |
| `index.html` | Estrutura das telas, integração e regras de interface ainda não extraídas | `apiCall`, `setAba`, `carregarDados`, renderização e formulários |
| `interface/rotina.js` | Rascunhos financeiros, identidade da edição e fluxos diários | `lerRascunhoRotinaGestor`, `guardarRascunhoRotinaGestor` |
| `interface/sincronizacao.js` | Orientações e recuperação das pendências | `orientacaoPendenciaGestor`, `conferirRecuperacaoServidorGestor` |
| `interface/usabilidade.js` | Horizonte, simulador, calculadora, notas e comportamento da Mensal | `renderizarNotasUI`; procurar também por horizonte, simulador e nota neste arquivo |
| `interface/rachadinha.js` | Pessoas, itens, prévia, rascunho e preenchimento da divisão | `calcularRachadinha`, `renderizarPessoasRachaDet`, `preencherParteRachaGestor` |
| `interface/desempenho.js` | Leituras compartilhadas, cache transitório e gráficos visíveis | `criarCoordenadorLeiturasGestor`, `invalidarLeiturasDesempenhoGestor`, `obterMetricasDesempenhoGestor` |
| `interface/restauracao.js` | Seleção, envio em partes, comparação e confirmação do backup | `criarControleRestauracaoGestor`, `lerExportacaoPreparadaGestor` |
| `interface/navegacao.js` | Rolagem por aba, botão de voltar ao topo e Voltar fechando a Central | `iniciarRolagemNavegacaoGestor`, `atualizarBotaoTopoGestor`, `voltarAoTopoGestor`, `criarHistoricoCentralGestor` |
| `interface/protecao.js` | Painel de backups, consulta dos arquivos anuais e filtros de empréstimos | `solicitarEmprestimosArquivoProtecaoGestor`, `restaurarFiltrosIniciaisEmpGestor` |
| `shared/rachadinha.js` | Cálculo da divisão em centavos, compartilhado pela tela e servidor | `calcularDivisaoContaGestor` |
| `shared/protecao.js` | Backup agendado, arquivo anual, compactação e recuperação da manutenção | `backupMensalProtecaoGestor_`, `planejarArquivoAnualProtecaoGestor_`, `rotinaProtecaoProgramadaGestor` |
| `shared/acoes.js` | Contrato único das ações, usado por interface, cache e proxy | `CATALOGO_ACOES_GESTOR`, `metadadosAcaoGestor` |
| `shared/notas-backup.js` | Compatibilidade do esquema antigo de Notas | `normalizarAbaNotasBackupGestor_`, `garantirCabecalhoNotasGestor_` |
| `shared/anual.js` | Bases por competência, fechamento, ajustes e restauração v3 | `matrizFinanceiraAnualGestor_`, `desdobrarPlanoAnualGestor_`, `conferirDestinosAnuaisPlanoGestor_` |
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
- `scripts/sincronizar-rachadinha.cjs` incorpora o motor compartilhado, os oito módulos de interface e a proteção do servidor. Apesar do nome antigo, não cuida somente da rachadinha.
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
