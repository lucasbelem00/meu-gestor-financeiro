# Correção da conferência de fatura zerada — 24/10/2026

## Problema e causa

O Mensal e o Horizonte podiam mostrar gastos de terceiros no cartão enquanto Conferir pagamento retornava todos os valores zerados. O Google Sheets pode entregar a célula do mês como Date, embora ela apareça na planilha como 10/2026. A consulta de fatura comparava esse valor convertido em texto extenso com o mês solicitado em MM/AAAA e descartava o registro.

A nova imagem do modal em outubro confirmou que o caso não era apenas uma seleção de mês diferente. A conferência anterior com dados fictícios usava meses em texto e não cobria essa representação de célula. O recebimento da pessoa estava corretamente registrado; a consulta para pagar o banco era o caminho defeituoso.

## Alterações

- [x] A conferência normaliza o mês guardado como Date ou como texto antes de selecionar os registros, tanto em Lançamentos quanto em Empréstimos.
- [x] A formatação de leitura usa o fuso configurado no Apps Script. Não regrava meses nem parcelas apenas para mudar sua representação.
- [x] Resumos e prévias novos apresentam data, mês e parcela nos respectivos formatos legíveis. Parcelas convertidas em Date também participam corretamente da ordenação da prévia de pagamento.
- [x] Meses e anos diferentes permanecem separados. Texto literal, parcelas fixas e parcelas acima de 12 permanecem aceitos.
- [x] Uma data inválida gera erro explícito em vez de uma falsa fatura sem saldo.
- [x] O modal distingue Nenhum lançamento encontrado para este cartão neste mês de uma fatura existente sem saldo em aberto.
- [x] Pagamento ao banco continua separado do recebimento da pessoa, com prévia, verificação de versão e proteção contra reenvios.
- [x] Em Consumo por forma, tocar no nome, nos valores, na linha de terceiros ou nos espaços do cartão aplica o filtro. Conferir pagamento permanece uma ação separada e não seleciona o filtro. Os dois controles continuam botões nativos, acessíveis pelo teclado.

## Validação

O caso que excluía um empréstimo com mês como Date foi reproduzido antes da correção. O teste passou após a mudança.

Oito novos testes cobrem fatura composta somente por terceiros recebidos, registros pessoais misturados com empréstimos, separação de ano, formatação sem alterar hash, texto literal e fixos, data inválida, pagamento parcial/integral com reenvio e ordenação das parcelas.

Um teste adicional usa o HTML renderizado e o manipulador real de ações para conferir que o filtro e a conferência de pagamento executam somente a ação correspondente. A suíte completa terminou com **239 testes aprovados**. CSS recompilado e as quatro cópias da interface são idênticas; a verificação de espaços do diff também passou.

Os testes usam exclusivamente dados fictícios em memória. Nenhum pagamento real ou alteração na planilha do usuário foi realizado. Não houve publicação nem conferência visual do modal publicado nesta etapa.

## Publicação necessária

1. Atualizar **Code.gs** no Apps Script com `Backend/Code.gs` e publicar uma nova versão da implantação utilizada pelo app. Esta é a parte essencial para a consulta deixar de retornar zero indevidamente.
2. Atualizar a interface do Apps Script com `Backend/Index_para_colar.txt`, se utilizada, e publicar a interface da Vercel pelo fluxo habitual.
3. Reabrir o app e conferir o cartão e o mês correspondentes. Registrar pagamento somente quando ele realmente tiver sido feito ao banco.

O cache da interface passa para v32. O contrato da API permanece na versão 7. Históricos antigos já gravados não são reescritos automaticamente; a mudança de formato vale para novos resumos e prévias.

As sugestões anteriores de simplificação dos filtros, ordenação da lista de Empréstimos, isolamento dos rascunhos em abas diferentes e tratamento do resultado de recargas concorrentes continuam separadas deste ajuste.
