# Edição da data prevista de recebimento — 25/10/2026

O aviso de pagamento na fatura original foi reproduzido localmente ao editar a data combinada de uma parcela com pagamento bancário registrado. A coluna do mês estava armazenada como data nativa do Google Planilhas, enquanto o formulário enviava o mesmo período como texto MM/AAAA.

## Correção

- A proteção compara agora o mês/ano pelo seu significado, aceitando representações equivalentes.
- A edição de empréstimos normaliza a leitura de datas, mês e parcela antes de decidir se houve mudança de fatura ou se deve reorganizar os meses seguintes.
- Uma mudança real do mês continua bloqueada quando a parcela tem pagamento ao banco. Redução abaixo do pagamento registrado continua bloqueada também.
- Alterar somente a data combinada conserva pagamento bancário e situação de recebimento separados.

## Uma parcela ou todas?

A data combinada editada é da parcela aberta no editor. A caixa **Aplicar valor também às outras parcelas em aberto** continua aplicando somente o valor; ela não propaga a data de devolução. Uma opção de propagação de datas não foi acrescentada neste ajuste.

No cadastro de um empréstimo parcelado, a data da primeira devolução já gera as seguintes mensalmente, com ajuste para o último dia quando necessário. Isso é diferente de editar datas de um empréstimo já registrado.

## Verificação e publicação

Quatro novos testes reproduziram o bloqueio antes da correção e passaram depois. Cobrem pagamento integral, parcial, propagação de valor sem propagar a data, conservação dos meses seguintes e a mesma proteção na edição de despesas pessoais. Os 42 testes direcionados de edição, integridade e versões passaram. Suíte completa: **379 testes aprovados, zero falhas**.

Esta correção exige atualizar **Backend/Code.gs** e publicar uma nova versão do Apps Script. Não foi feita alteração em registros reais nem publicação automática. Não é necessário desfazer um pagamento apenas para alterar a data prevista de recebimento.
