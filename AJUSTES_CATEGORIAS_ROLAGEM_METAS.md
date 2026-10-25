# Categorias, indicadores, Histórico e filtros mensais

Atualização posterior: o pedido de 25/10/2026 voltou a restringir o termômetro às categorias com gasto. As metas sem consumo permanecem cadastradas e disponíveis nos filtros. O botão de topo foi ampliado para as outras telas longas. Veja AJUSTES_ROTINA_USABILIDADE_20261025.md; as decisões abaixo registram a etapa anterior.

Implementação local, posterior ao pacote de restauração e desempenho. As alterações anteriores foram preservadas. Não houve publicação nem acesso à planilha real.

## Pedidos concluídos

- [x] Meta sempre abaixo do nome da categoria, em uma única etiqueta. Nomes longos podem quebrar; a moeda não se divide entre linhas. Ações ficam à direita, sem comprimir o texto. Os botões têm nomes acessíveis.
- [x] Indicador renomeado para Total registrado, com Todos os meses e anos. O detalhe explica que inclui parcelas futuras já gravadas e exclui terceiros, cancelamentos e previsões ainda não registradas.
- [x] Todas as trocas de aba iniciam no topo, inclusive a entrada no Histórico a partir de uma aba rolada.
- [x] Voltar ao topo aparece no Histórico após rolar a lista; não altera filtros ou páginas carregadas e não abre o teclado. Respeita a preferência por movimento reduzido.
- [x] Metas do Mensal são botões nativos com seleção persistente e indicação acessível. Seleção/desmarcação é sincronizada com os outros controles da mesma categoria.
- [x] Apenas um botão Limpar filtros no Mensal. O resumo dos filtros ativos foi mantido.

## O que significa Total registrado

É a soma das parcelas pessoais efetivamente gravadas em Lançamentos, de todos os meses e anos, incluindo as parcelas futuras já registradas. Considera pagamentos feitos e saldos em aberto. Não é um total anual, um saldo disponível ou dinheiro já pago. Não inclui Empréstimos, registros cancelados/pulados ou projeções que ainda não viraram registros.

Em aberto, Pago e Total do mês usam o mês atual. O gráfico de distribuição também usa o mês atual; seu título foi corrigido para Distribuição do mês (pessoal).

## Fragilidades adicionais encontradas e corrigidas

1. Uma resposta atrasada do Histórico podia restaurar sua rolagem depois de sair e voltar à aba. Cada navegação agora tem uma geração; posições antigas não são aplicadas em outra visita. A mesma proteção foi acrescentada à renderização geral e à atualização do Mensal. Editar na mesma visita continua preservando a posição.
2. Categorias equivalentes, com emoji ou marcador Antigo, e tags com/sem # podiam filtrar o mesmo conteúdo, mas mostrar seleções diferentes. Os controles agora usam a mesma comparação para selecionar e desmarcar.
3. Metas configuradas sem gastos eram omitidas e podiam resultar em Nenhuma meta configurada. O backend agora fornece as metas separadas dos dados do gráfico, com consumo zero. Selecionar essa meta mostra um resultado vazio correto e a escolha permanece após atualizar o mesmo mês. As categorias sem consumo não poluem o gráfico de gastos.
4. Novos anexos locais de conversas estavam aparecendo como arquivos a adicionar ao Git. `.codex-remote-attachments/` foi incluído no ignore. Isso não apaga arquivos locais, não remove anexos anteriormente versionados nem altera o histórico do Git.

## Pontos que ainda recomendo trabalhar

- Revisar os **8 anexos já rastreados pelo Git** antes de compartilhar o repositório. A proteção para novos anexos não retira esses arquivos. Não foi verificado se foram enviados a um repositório público; nenhum histórico foi reescrito.
- Ao editar uma categoria no fim da lista, rolar e levar o foco até o campo de edição. Hoje os campos são preenchidos acima; esse atalho tornaria a edição mais fácil de perceber.
- Oferecer um grupo recolhível para metas sem consumo, caso a lista de metas fique longa no celular. Os valores precisam continuar acessíveis; não devem ser omitidos como se não estivessem configurados.

## Validação

- **328 testes aprovados, zero falhas**, incluindo navegação, resposta atrasada, preservação de filtros/posição, escopo dos indicadores, metas zeradas e seleção equivalente.
- Conferência no navegador em 390 × 844: meta de R$ 1.000.000,00 sem quebra, entrada no Histórico com rolagem zero, botão após rolar 3.950 px e retorno ao topo com foco no Histórico, sem teclado.
- No Mensal, uma meta sem consumo foi selecionada com destaque, resultado de zero lançamentos e exatamente um botão Limpar filtros. Console sem erros no fluxo conferido.
- CSS compilado: 40.430 bytes. Principal, duas cópias do Apps Script e `dist/index.html` sincronizados; cache `gestor-gastos-v35`. `git diff --check` sem erros.
- Todos os dados e valores usados na conferência foram fictícios. A experiência em aparelho físico e na implantação Google/Vercel continua como conferência de publicação.

Evidências: [categorias em edição](C:/Users/lucas/Documents/Codex/categorias-metas-organizadas-mobile.png), [meta de valor alto](C:/Users/lucas/Documents/Codex/categorias-meta-valor-alto-mobile.png), [meta selecionada](C:/Users/lucas/Documents/Codex/meta-selecionada-mensal-mobile.png), [log da suíte](C:/Users/lucas/Documents/Codex/polimento-categorias-historico-suite.log).

Atualize backend e interface na cópia de teste. O novo campo de metas é opcional para interfaces antigas e a interface nova aceita a resposta anterior, mas mostrar metas sem consumo depende do backend atualizado. O protocolo permanece 9; não há novos endpoints neste ajuste. Para publicar todo o pacote acumulado, inclua também o proxy atualizado do pacote de restauração.
