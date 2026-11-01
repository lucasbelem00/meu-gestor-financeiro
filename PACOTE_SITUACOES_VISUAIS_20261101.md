# Situações e composição do Painel — 01/11/2026

- Total Carteira (nome azul-claro) → Terceiros nos cartões (nome âmbar) → Total Faturas (nome violeta).
- No Total do mês, Terceiros inclui gastos já recebidos. No A pagar, representa a parte dos terceiros ainda devida ao banco. Em ambos os modos, Carteira + Terceiros = Total Faturas, incluindo a previsão pessoal uma única vez.
- A receber da pessoa permanece indicado separadamente. Terceiros fora dos cartões (Pix e demais formas imediatas) não entram no Total Faturas e continuam visíveis em linha própria.
- Verde: pago ao banco/recebido. Âmbar: pendente, incluindo saldo parcial dentro do prazo. Laranja: prazo vencido ou mês encerrado sem recebimento. Os textos distinguem esses estados.
- Uma data combinada futura prevalece sobre a competência passada. Sem data, só depois de acabar o mês aparece Mês encerrado · A receber. Uma data inválida pede conferência, sem inventar atraso.
- Banco e pessoa têm indicadores independentes nos Empréstimos. A Mensal, a conferência de fatura e os lembretes do Painel usam vencimento bancário para destacar saldo atrasado.
- Agenda inclui compromissos datados já concluídos, com filtro de situações. Quadrados inteiros ficam verdes, âmbar ou laranja. Em dias mistos, atenção prevalece sobre pendência, que prevalece sobre concluído. A seleção é um contorno azul que não apaga o fundo da situação.
- Sem data combinada, a pendência do mês encerrado aparece no último dia da competência, com texto explícito de fim do mês. Isso não é uma data combinada inventada. Recebimento sem data não ganha uma data fictícia na Agenda.
- A Agenda representa a data programada, com sua situação atual; não é um relatório da data efetiva de movimentação do dinheiro.

## Código e verificação

`interface/situacoes.js` concentra as regras puras. `agenda.js`, `painel.js`, `usabilidade.js`, `faturas.js` e os cartões mensais/terceiros do HTML apenas apresentam os mesmos estados. Não houve alteração nas regras de gravação, pagamento ou recebimento do servidor.

`tests/situacoes-visuais-20261101.test.cjs` confere data combinada, competência encerrada, quitação separada, fevereiro bissexto, prioridade de dias mistos, seleção sem apagar cor e soma do Horizonte nos dois modos.

Para testar: confirme no ambiente de testes um cartão quitado, outro com saldo vencido, uma devolução futura e uma devolução recebida; confira as cores no calendário e alterne Todas/Pendentes/Concluídos. Em Empréstimos, confira um banco quitado com pessoa ainda devendo e o caso inverso. No Horizonte, valide a soma e a linha separada do Pix. As alterações são locais até a publicação da interface.
