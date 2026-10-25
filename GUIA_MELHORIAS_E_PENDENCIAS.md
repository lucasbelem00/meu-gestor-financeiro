# Guia das melhorias e do que ainda pode evoluir

Revisão em 25/10/2026. Este resumo compara o código local atual com os relatórios antigos. Implementado localmente não significa publicado no Apps Script/Vercel. Os documentos antigos preservam a situação de cada etapa; alguns ainda chamam de pendente algo entregue depois.

## Recursos que já existem e podem ter passado despercebidos

| Recurso | Onde encontrar e como ajuda |
|---|---|
| Horizonte com dois modos | Painel → Próximos Meses. Total do mês mantém o montante depois de pago; A pagar mostra o saldo. Verde indica pagamento dos registros. No celular aparecem dois meses; Comparar meses amplia a consulta. |
| Pagamento e recebimento separados | Painel → Pagamentos e recebimentos. Pagar ao banco não recebe automaticamente da pessoa. Receber dela não quita o banco. |
| Consulta e cadastro separados | Empréstimos → Consultar empréstimos ou Novo empréstimo. A consulta inicia em Todos os meses + A receber. |
| Recebimento integral ou parcial | Empréstimos → Registrar recebimento. Confira o recebido e o saldo antes de gravar, sem alterar o valor original da compra. |
| Data combinada da devolução | Novo empréstimo ou edição. Opcional e separada do vencimento bancário; parcelas seguintes usam o mesmo dia, ajustado ao fim do mês. |
| Parcelamento opcional do Pix | Novo e Empréstimos. Pix continua uma forma só; o parcelamento precisa ser escolhido. Valores pessoais futuros a pagar aparecem em Cartões e Limites quando existem. |
| Memória de lançamentos | A descrição pode sugerir forma e categoria, preservando escolhas manuais. Há atalho de último valor; em Empréstimos usa pessoa e descrição. Valores ambíguos colados exigem escolha. |
| Filtros combinados | Mensal → tipo, forma, situação, categoria e tag. Dentro de um grupo, as opções se somam; entre grupos, precisam coincidir. Soma, pago e saldo acompanham a seleção. |
| Rachadinha rápida e detalhada | Dividir c/ Galera. Comida vs. Bebida para a conta simples; Itens por Pessoa para consumidores diferentes, cotas, pagamentos feitos e partes adiantadas. Centavos fecham o total. |
| Histórico da calculadora | Calculadora → Contas recentes. Até 20 contas locais, com Usar resultado, Reabrir conta e Copiar. Não cria lançamentos. |
| Notas mais completas | Bloco de Notas. Pesquisa, edição, conclusão, fixação e rascunhos recuperáveis. Texto em elaboração fica local; notas adicionadas sincronizam. Fixação é por aparelho. |
| Rascunhos isolados | Novo, Empréstimos, Rachadinha e Notas preservam cópias úteis sem uma página sobrescrever a outra. Cópias antigas podem ser descartadas após conferir; envios incertos continuam protegidos. |
| Simulador com conferência | Simular Compra. Divisão exata em centavos, expansão de parcelas e transferência para o formulário com proteção do preenchimento existente. |
| Arquivar cartão com histórico | Cartões e Limites → Organizar. Cartões usados são arquivados, preservando registros e faturas; Mostrar arquivados permite reativá-los. |
| Exportação e restauração ampliada | Menu → Exportar dados e backup. JSON restaurável, prévia das mudanças, confirmação e cópia anterior. CSV é para consulta; PDF é relatório. |
| Central de sincronização | Menu → Atividade e sincronização. Pendências, histórico e diagnóstico; consulta ou reenvio protegido usa a identificação original da operação. |
| Navegação nas listas longas | Voltar ao topo em Mensal, Anual, Empréstimos e outras telas. Trocar de aba começa no topo; atualizar a mesma lista preserva a visita quando apropriado. |
| Edição de categorias localizada | Categorias e Metas → Organizar → lápis. Leva ao formulário, identifica a categoria e confirma antes de substituir preenchimento não aplicado. O foco não abre teclado automaticamente. |

## Sugestões antigas resolvidas depois

| O que um relatório antigo dizia | Situação atual |
|---|---|
| Restauração completa e maior reorganização de desempenho adiadas | Implementadas no [pacote posterior](PACOTE_RESTAURACAO_DESEMPENHO.md). |
| Gerar CSS fora do navegador era tarefa futura | A compilação já gera CSS estático e sincroniza as cópias da interface. |
| Atividade transferia todo o histórico técnico por página | A consulta comum já é paginada no backend. Busca textual ampla pode examinar mais eventos para manter resultados completos. |
| Notas em elaboração duravam só a sessão | Agora há rascunhos duráveis por página e recuperação. Há aviso se o aparelho não permitir guardar a cópia durável. |
| Rachadinha tinha uma cópia compartilhada por abas | Hoje há cópias por página, preservando identificadores de envio. A abertura vazia não deve gerar cópia fantasma. |
| Empréstimos mostrava parcelas em ordem invertida | A lista detalhada foi ordenada por mês crescente. |
| Simplificar situações para Não pagos, Parciais e Quitados | Já são apresentadas dessa forma. |
| Indicar o intervalo exibido no Horizonte | O intervalo já aparece acima da tabela. |
| Recolher cadastro de empréstimos ao consultar | Modos Consultar e Novo já separam as áreas. |
| Botões de pagamento difíceis de encontrar | Foram levados para antes da grade de gráficos e Horizonte no Painel. |
| Agrupar metas sem consumo | Pedido posterior escolheu termômetro só com consumo. Elas seguem cadastradas e disponíveis no seletor; não é pendência de implementação. |

## Melhorias possíveis ainda úteis

Atualização do pacote de backups: os itens 1 e 4 foram implementados. Veja [Backups automáticos e arquivos anuais](BACKUPS_AUTOMATICOS_E_ARQUIVOS_ANUAIS.md) para ativação e limites.

1. **Voltar aos filtros iniciais em Empréstimos — entregue.** O atalho Voltar ao padrão também aparece com resultados e retorna a Todos os meses + A Receber, todas as pessoas e formas e busca vazia.
2. **Reaplicar a memória da descrição por escolha — dispensado.** Conforme combinado depois, a memória automática existente foi mantida, sem acrescentar outro botão.
3. **Vencidos e Próximos 30 dias em Empréstimos.** Continuam em observação, conforme combinado. Precisariam usar a data combinada de devolução, sem confundir com vencimento bancário nem classificar sem data como atraso.
4. **Planejar o crescimento técnico — entregue localmente.** Há compactação segura com provas de operações confirmadas/canceladas, backups mensais no Drive e arquivos anuais consultáveis. A ativação real ainda depende da atualização e autorização do Apps Script. Não apagar linhas técnicas ou arquivos de comprovantes manualmente.

Vencidos e Próximos 30 dias continuam em observação, conforme combinado.

## Anexos e privacidade do repositório

Foram revisadas as oito imagens anteriormente rastreadas em .codex-remote-attachments. São capturas do app, incluindo telas com valores, nomes, datas, categorias e pendências. Não são necessárias para executar ou publicar o aplicativo.

As oito foram retiradas somente do índice do Git. Os oito arquivos continuam no computador, e a pasta já está no .gitignore. No GitHub Desktop, as remoções fazem parte das alterações para o próximo commit; as imagens locais não foram apagadas.

**Os commits antigos ainda contêm essas imagens.** Não houve commit, push, verificação da visibilidade remota ou reescrita do histórico nesta etapa. Antes de tornar o repositório público, é necessário decidir se o histórico antigo também deve ser limpo. Remover da versão atual, sozinho, não remove versões anteriores.

## O que foi feito nesta etapa

- Edição de categoria com rolagem, indicação do alvo e proteção de conteúdo anterior, inclusive contra confirmação desatualizada.
- Nome e meta com nomes acessíveis; foco no grupo do formulário, sem teclado automático.
- Margem de rolagem considera a altura real do cabeçalho para não esconder Editando.
- Remover a categoria em edição limpa também sua meta, evitando reaproveitar um valor antigo sem perceber.
- Oito anexos deixam de ser rastreados, permanecendo locais.
- Este guia reúne recursos já feitos, sugestões substituídas e pendências reais.

## Leituras por assunto

- [Rotina, filtros, Pix e rascunhos](AJUSTES_ROTINA_USABILIDADE_20261025.md).
- [Restauração e desempenho](PACOTE_RESTAURACAO_DESEMPENHO.md).
- [Notas, calculadora e proteções](CORRECOES_AUDITORIA_20261024.md).
- [Rachadinha](RACHADINHA_USABILIDADE_20261024.md).
- [Fixos, recebimentos e integridade](PACOTE_ROTINA_INTEGRIDADE_20261024.md).
- [Checklist geral](CHECKLIST_ROBUSTEZ.md).

## Verificação desta etapa

356 testes aprovados, zero falhas. Sete cenários novos cobrem a navegação do editor, substituição de rascunho, confirmação desatualizada, remoção do alvo, envio em andamento e preservação de Outros. No navegador móvel de 390 × 844, a indicação de edição ficou 16 px abaixo do cabeçalho e o foco permaneceu no grupo, sem teclado automático. A confirmação de troca de preenchimento apareceu e o console não apresentou erros no fluxo conferido.

CSS compilado: 40.657 bytes. Interface principal, duas cópias para Apps Script e dist/index.html idênticos. Cache gestor-gastos-v37; protocolo 9. Os oito anexos continuam locais e nenhum permanece rastreado na versão preparada. Não houve publicação ou alteração de registros reais.
