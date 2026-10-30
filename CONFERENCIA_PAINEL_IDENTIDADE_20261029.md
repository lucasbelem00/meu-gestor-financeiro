# Conferência de fatura, Painel e nome do aplicativo

## O que muda

- O nome do aplicativo passa a ser **Gestor de Gastos** no cabeçalho, título da janela, manifesto instalado e título servido pelo Apps Script. Os arquivos/IDs das planilhas e os dados não são renomeados.
- **Conferir fatura** é a mesma janela nos acessos do Painel, Mensal e Atividade e sincronização. Não há novas abas ou atalhos na Central.
- A janela consulta somente totais: registrado, pago ao banco, restante, sua parte e terceiros. O botão para o Mensal abre a lista dos seus lançamentos; os empréstimos continuam em sua consulta própria.
- A comparação opcional usa o total da fatura do banco antes dos pagamentos. Mostra igualdade ou diferença, sem registrar pagamento, recebimento ou alterar o valor pago.
- A confirmação de pagamento apresenta os valores distribuídos entre gastos pessoais e de terceiros e explica a ordem por data/parcela. A distribuição, a versão da fatura, a trava e a idempotência continuam validadas no servidor. O modo resumido nunca é usado para reduzir essa validação.

## Carregamento

O resumo já carregado no Painel pode aparecer imediatamente, identificado como tal, sem habilitar pagamento antes da consulta. Uma consulta confirmada pode ser reaproveitada por até 15 segundos na mesma geração dos dados. Atualizar valores força nova consulta. Mutações e recargas invalidam o reaproveitamento. Respostas de meses anteriores e de janelas fechadas não substituem a consulta atual. Sem conexão ou após falha, o pagamento fica bloqueado.

O servidor ainda lê as linhas necessárias para somar os valores; o resumo dispensa descrições, referências e hashes individuais na resposta. A consulta Mensal continua responsável pelo relatório completo. Este pacote não promete eliminar a latência de rede/Apps Script.

Medição local com planilha fictícia de 1.001 lançamentos: resposta completa 393.381 bytes e 1.001 hashes; resposta resumida 159 bytes e nenhum hash individual. Os totais foram iguais. O teste local não mede o tempo real do Google.

## Painel

- Devoluções combinadas aparecem em um bloco recolhível: pendentes atrasadas e com data até os próximos sete dias. Não usa o mês da fatura para classificar atraso, nem classifica registros sem data combinada. Um toque abre a consulta da pessoa e do mês, em A Receber.
- O limite pessoal mensal é opcional e recolhível. Soma os gastos pessoais registrados do mês, inclusive pagos; exclui terceiros. Pode incluir as previsões de fixos já existentes naquele mês. Mostra percentual, margem ou excesso. Não cria meses, lançamentos ou saldo bancário.
- O limite é uma preferência deste aparelho, reaplicada a cada mês. É guardado com o gravador protegido existente, não sincroniza com outros aparelhos e não entra no backup da planilha. Essa informação aparece junto da configuração.
- Os dois recursos reutilizam a carga do Painel, sem acrescentar consultas à planilha.

## Atualização

Publicar a interface e o **Backend/Code.gs** atualizado para receber a consulta compacta. O frontend também aceita a resposta completa anterior. Build sincroniza as cópias HTML e prepara `dist/`. Cache PWA v61, protocolo 17 preservado. Nenhuma função ou gatilho novo precisa ser executado na planilha.

O nome do atalho instalado pode depender da atualização de identidade oferecida pelo navegador/sistema; mudar o manifesto não garante substituição imediata do nome de uma instalação antiga. A publicação não foi feita por este build.

## Verificação

Suíte completa: **625 testes passaram**. Inclui resumo sem hashes por item, terceiros recebidos ainda devidos ao banco, pagamento parcial e idempotência, versão alterada após a prévia, consultas concorrentes, cache invalidado, comparação sem gravação, data combinada inválida e preservação da configuração local em edição ou com armazenamento indisponível.

Conferência da interface completa com backend fictício e gravações desativadas: acesso do Painel e de Atividade à mesma janela; comparação igual e diferença de R$ 25,50; lembrete abrindo pessoa/mês em A Receber; limite de R$ 120 sobre R$ 150 registrados apontando excesso de R$ 30. Sem transbordamento horizontal na janela em 320 px, sem erros no console. Dados reais, rede do Google e instalação Android não foram alterados nem medidos.
