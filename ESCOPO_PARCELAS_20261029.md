# Símbolos e alcance das alterações de parcelas — 29/10/2026

## Interface

- Histórico e Mensal usam ⚡ À vista para compras 1/1, ➗ Parcela 2/6 para parcelamento e 📌 Fixo mensal (∞) para recorrências. Pix e demais pagamentos únicos seguem a mesma indicação. O status de pagamento permanece separado: compra à vista no cartão pode ter fatura em aberto.
- Os dois controles do editor de empréstimos são menus suspensos: Aplicar o valor e Aplicar a data combinada. Ambos oferecem Somente esta parcela e Esta e próximas a receber. A opção em conjunto fica indisponível para compras únicas; parcelas já recebidas abrem com alcance individual desabilitado.
- Cada abertura do editor reinicia os dois menus no individual. As escolhas são independentes: é possível alterar só o valor atual e distribuir datas, ou distribuir valores mantendo a data individual.
- O painel passa a se chamar ➖ Registrar recebimento parcial. Continua registrando a parte recebida e preservando o saldo para cobrança, sem conceder desconto.

## Regras e confirmação

O novo escopo de valor filtra pela compra, quantidade total de parcelas, número igual ou posterior ao atual e situação A Receber. Não depende da ordem das linhas nem apenas do mês da fatura, que pode ter sido antecipado.

A prévia de valor apresenta parcelas, competências e valores antes/depois. Sua assinatura inclui identidade, versão, valores e pagamento bancário. O envio confere novamente a mesma seleção; alterações ocorridas depois da prévia exigem nova conferência. A prévia de datas existente continua usando a mesma regra de parcelas atuais/próximas a receber, repetindo o dia nos meses seguintes e ajustando meses curtos.

O valor de cada parcela não pode ficar abaixo do pagamento já registrado ao banco. A prévia de troca para Pix usa os valores corretos de cada parcela; selecionar só as próximas não altera o valor das anteriores. O recebimento da pessoa permanece independente do pagamento bancário.

O contrato legado sem escopo explícito conserva o comportamento anterior para compatibilidade. O editor atualizado envia `escopoValorParcelas` e exige protocolo 17 para consultar/enviar. Dessa forma ele não encaminha os menus novos ao backend antigo, que interpretava a aplicação de valores de outro modo.

## Código e validação

- `formatarInfoParcelaCard`: rótulos comuns do Histórico e Mensal.
- `indicesValorEmprestimoGestor_`: escolha dos registros conforme o escopo explícito ou contrato legado.
- `planoValoresEmprestimoGestor_`: prévia e assinatura dos valores.
- `previaEdicaoEmprestimoWeb` e `editarEmprestimoLinhaWebInterno_`: conferência e aplicação.
- `tests/escopos-emprestimos-20261029.test.cjs`: alcance, independência de valor/data, recusa de envio sem prévia, valor alterado, recebimento posterior, pagamento bancário, Pix, versão antiga do servidor e reinicialização dos menus.
- `tests/pacote-visual-20261029.test.cjs`: rótulos com símbolos e indicação de compra única.

Prévia local em 390 × 844 com dados fictícios: menus com as mesmas opções, alcance individual inicial e novo nome do recebimento parcial. A conferência não fez gravações na conta Google.

Validação final: 613 testes passaram, sem falhas ou testes ignorados. Build concluído; scripts com sintaxe válida e HTMLs da raiz, Backend e dist idênticos. O checkbox antigo de valor não permanece na interface.

## Publicação necessária

Cache PWA v59 e protocolo 17. Publicar o frontend e atualizar **Backend/Code.gs e o HTML do Apps Script**, criando a nova versão da implantação usada pelo proxy. O editor novo recusa o envio ao servidor antigo e preserva os campos. Não é necessário executar função nova na planilha ou reativar backups/gatilhos. Não houve publicação remota neste trabalho.
