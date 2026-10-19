# Ajustes visuais e de interação — 18/10/2026

## Varredura direcionada

Revisados os estados de toque, mouse, seleção e foco dos filtros do Mensal, a navegação mensal, a estrutura dos cartões e as mensagens de carregamento.

- O fundo cinza persistente era compatível com hover preso após toque. Os cartões de forma de pagamento deixaram de usar hover de fundo; em dispositivos com mouse, o hover apenas realça discretamente a borda.
- Seleção real usa aria-pressed e destaque verde. Desmarcar remove o estado; filtros por tag também mostram seleção. Foco pelo teclado continua visível sem contorno persistente após clique.
- A ação de filtrar passou a ser um botão nativo. Conferir pagamento fica como botão irmão, evitando ação interativa dentro de outro controle de filtro.
- Layout permite quebra de nomes, valores e ações dentro do cartão.
- As correções anteriores preservam mês e ano após atualizar dados, removem meses duplicados nas setas e sinalizam carregamento e erro sem deixar a mensagem de busca indefinidamente.

## Limites da revisão

Os testes locais verificam alternância e limpeza dos filtros, estrutura dos controles e navegação. Ainda é necessária a conferência visual no PWA publicado, com toque e mouse reais. A revisão não mede o tempo da rede nem do Apps Script; a investigação de desempenho permanece separada. Não foi alterada a lógica de pagamentos nesta etapa.

## Publicar

Enviar a interface e o service worker pela branch New no GitHub/Vercel. Esta etapa visual não exige nova implantação do Apps Script. Reabrir o PWA após a publicação e testar: selecionar Pix, tocar Pix novamente, trocar para cartão, filtrar uma tag e limpar o filtro. O fundo deve voltar ao original quando não há seleção. Conferir pagamento deve abrir sua própria ação sem alternar o filtro.
