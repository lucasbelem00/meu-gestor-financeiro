# Mensagens mais claras no celular — 30/10/2026

Os textos copiados de Empréstimos, Histórico e Simulação de Compra agora usam blocos separados. Nenhuma operação financeira ou situação de pagamento foi modificada.

## Empréstimos

- Descrição, tipo da compra e forma aparecem em linhas próprias.
- `1/1` aparece como `⚡ À vista`; parcelas como `➗ Parcela 3 de 6`.
- A competência selecionada e os demais filtros usados ficam identificados. Sem mês selecionado, o texto informa “todos os meses”; cada item identifica sua competência.
- Quando existe uma data combinada, aparece “Devolver até”. Essa data não é o vencimento bancário.
- Uma única compra pendente apresenta o valor apenas no fechamento “Valor a devolver”. Várias compras mostram seus valores e “Total a devolver”.
- Valores recebidos são identificados e separados dos valores ainda a devolver.
- Recebimentos parciais disponíveis e ligados à mesma compra/parcela explicam valor, já recebido e saldo. A identidade da compra é obrigatória para fazer essa associação; descrição e valor iguais não bastam. A quitação no banco não é usada para deduzir devolução da pessoa.
- A prévia editável e a opção já existente de acrescentar a chave Pix foram preservadas.

Exemplo com uma compra:

```text
🤝 *Resumo do Empréstimo — Núbia*
📅 Referência: 10/2026
Situação: A Receber

• *Hollywood Burguer*
⚡ À vista
Cartão: Azul Skyline

💰 *Valor a devolver: R$ 41,00*
```

## Simulação de Compra

A quantidade total de parcelas ganha uma linha própria. Quando a divisão em centavos gera valores diferentes, cada grupo aparece numa linha; o cálculo foi preservado. Cartão e primeira fatura aparecem se houver cartão selecionado. A comparação com preço à vista só aparece quando preenchida; a economia é indicada na direção correta.

```text
💳 *Simulação de compra*
Data: 30/10/2026

➗ *12 parcelas*
• 4x de R$ 333,34
• 8x de R$ 333,33

💰 *Total da compra: R$ 4.000,00*

⚡ Preço à vista: R$ 3.500,00
Economia à vista: R$ 500,00
```

O botão **Prévia WhatsApp** abre a mensagem em uma janela editável. A cópia acontece somente quando a pessoa confirma nessa janela. A Simulação não acrescenta chave Pix nem mostra opções de cobrança; a preferência de Pix usada nos outros resumos permanece preservada. Não registra uma compra nem envia uma mensagem automaticamente.

## Histórico

Cada lançamento fica em um bloco com descrição, data completa, tipo, forma, fatura, situação e valor. O ano deixa de ser omitido, evitando confusão ao compartilhar vários anos.

```text
• *Almoço - D'pizza Riverside*
Data: 18/10/2026
⚡ À vista
Cartão: Azul Skyline
Fatura: 11/2026
Situação: Em Aberto
Valor: *R$ 25,50*
```

O total continua vindo da consulta consistente do servidor. Todas as páginas da seleção são carregadas para a cópia. Ocorrências puladas e assinaturas canceladas permanecem numa seção “Registros fora do total”, com a identificação da exclusão.

## Organização e validação

- Novo módulo: `interface/compartilhamento.js`, incorporado pelo gerador existente.
- Versão do cache: `gestor-gastos-v65`, incluindo a prévia editável da Simulação.
- Novos cenários em `tests/compartilhamento-mobile.test.cjs`: centavos, recebidos, parciais com identidade, compras parecidas, quitação bancária separada de recebimento, divisão da simulação e cópia paginada do Histórico.
- Regressões antigas de compartilhamento foram adaptadas para carregar o novo módulo; suas verificações financeiras foram preservadas.
- Validação após a prévia da Simulação: **652 testes passaram, zero falhas**, incluindo edição, confirmação e isolamento da preferência Pix. Geração do CSS, interfaces espelhadas e arquivos públicos conferidos.
- As interfaces espelhadas e os arquivos públicos são gerados pelos scripts do projeto. Publicação é uma etapa separada; não existe função nova para executar na planilha para ativar estes textos.
