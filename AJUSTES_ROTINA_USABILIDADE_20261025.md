# Rotina, rascunhos, Pix e navegação — 25/10/2026

Implementação e validação locais. Nenhum lançamento real foi alterado e nenhuma versão foi publicada nesta etapa.

## Pedidos concluídos

- [x] Botão Voltar ao topo nas telas longas: Mensal, Anual, Empréstimos e demais ferramentas, Painel, Histórico, Categorias, Formas, Fixos e Atividade. Aparece após 400 px de rolagem, acima da navegação móvel; preserva filtros e respeita movimento reduzido. Não abre teclado.
- [x] Seleção de Consumo por forma em azul. Desmarcar restaura o fundo neutro; o botão Conferir pagamento continua sendo uma ação separada em verde.
- [x] Termômetro de metas volta a exibir apenas categorias com gasto positivo e meta no período. Metas sem consumo continuam cadastradas e disponíveis no seletor de categorias; não aparecem no termômetro. A mensagem de ausência distingue essa situação de não ter metas cadastradas.
- [x] Rascunhos separados por formulário/ferramenta. Limpar o formulário atual também atualiza o aviso, sem remover cópias úteis de outras páginas. Abrir a rachadinha vazia não gera rascunho recuperável.
- [x] Pix dividido mostra A pagar nos próximos meses quando existem valores pessoais futuros registrados e ainda em aberto. Usa o saldo restante, exclui pagos, cancelados, valores apenas projetados e recebíveis de terceiros. Não transforma Pix em cartão nem cria limite.
- [x] Consulta de empréstimos inicia em Todos os meses + A Receber. Um mês escolhido manualmente permanece selecionado durante a sessão e nas atualizações dos dados; não há avanço automático escondendo dívidas anteriores.
- [x] Busca e quatro seletores dos empréstimos com rótulos, alturas iguais e alinhamento responsivo. Pagamentos e recebimentos fica antes da grade completa do Painel, sem deslocar o gráfico e o Horizonte no computador.
- [x] Rachadinha vazia abre em Comida vs. Bebida. Divisão real em elaboração ou envio pendente mantém o modo e o preenchimento. Limpar retorna ao modo rápido.

## Fragilidades adicionais verificadas e corrigidas

1. A normalização da pessoa Eu criava ajustes vazios para os participantes; o detector interpretava esses objetos como conteúdo. O teste de vazio agora considera valores efetivos, preservando cotas alteradas, pagamentos, nomes em digitação e identificadores de envio.
2. Recuperar uma cópia aplicava campos pelos identificadores encontrados, sem limitar ao formulário correspondente. Agora somente os campos pertencentes àquele formulário podem ser recuperados.
3. A confirmação de Limpar divisão podia ficar aberta enquanto o conteúdo era alterado. A confirmação agora verifica a versão completa da divisão, incluindo nomes em digitação, modo, consumidores e envio, antes de apagar.
4. Uma falha retornada ao guardar obrigatoriamente a divisão podia ser tratada como sucesso. A falha agora impede continuar aquela gravação e mantém o preenchimento para conferência.
5. Células de mês/parcela armazenadas como datas nativas do Sheets, com outra máscara, podiam zerar consolidações, afetar fixos e alterar a competência na organização. Cópias de leitura agora normalizam essas células pelo seu significado, sem reescrever datas só para exibição.
6. O atalho para o resumo de empréstimos usava rolagem adiada sem conferir a navegação. Agora uma troca de aba ou ferramenta invalida a rolagem antiga.
7. O limite anterior do botão de topo podia deixá-lo indisponível no Anual móvel, mesmo ao final da página. O limite foi reduzido e esse caso foi incluído nos testes.

## Validação

- Suíte completa: 349 testes aprovados, zero falhas. CSS compilado com 40.472 bytes; interface principal, duas cópias para Apps Script e dist/index.html idênticos. git diff --check sem erros.
- Testes automatizados com planilhas fictícias, incluindo Pix futuro, datas nativas, rascunhos, confirmação desatualizada e preservação de filtros.
- Navegador local: interface real → proxy local → backend real executado sobre planilhas fictícias em memória → resposta e renderização.
- Computador de 1280 px: alinhamento do Painel e dos cinco campos de consulta conferido. Campos com 40 px de altura e a mesma posição vertical.
- Celular de 390 × 844 px: seleção azul, desmarcação neutra, somente metas com consumo, botão de topo no Mensal/Anual/Empréstimos, retorno sem perder filtro e entrada na rachadinha sem aviso fantasma.
- Fluxo manual: preencher empréstimo fictício → confirmar Limpar → abrir rachadinha → modo Comida vs. Bebida e nenhum rascunho vazio recuperável.
- Nenhum erro de console observado nos fluxos verificados. Isso não elimina a possibilidade de falhas em cenários não exercitados.

## Instalação

As cópias da interface para Apps Script são geradas a partir do index.html. Atualizar também Backend/Code.gs para que o futuro do Pix e as datas normalizadas funcionem. O cache desta etapa é gestor-gastos-v36; o protocolo permanece 9. Os relatórios anteriores descrevem o estado de suas respectivas etapas.

## Melhorias possíveis para uma próxima etapa

- Acompanhar o uso real do filtro Todos os meses antes de acrescentar atalhos como vencidos ou próximos 30 dias.
- Considerar rolar até o formulário ao editar uma categoria no fim da lista, mantendo confirmação para conteúdo já preenchido.
- Revisar os anexos já versionados antes de compartilhar o repositório; o ignore de novos anexos não remove arquivos antigos do histórico.
