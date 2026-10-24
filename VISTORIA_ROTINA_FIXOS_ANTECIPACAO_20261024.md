# Vistoria de rotina: despesas fixas e antecipação — 24/10/2026

Esta rodada buscou casos diferentes dos relatórios anteriores. Foram executados sete cenários com o backend atual e planilhas fictícias em memória, incluindo controles que demonstram quando o comportamento funciona. Nenhuma alteração funcional foi aplicada.

## 1. Alta prioridade: excluir, recarregar e desfazer pode duplicar uma despesa fixa

**Exemplo reproduzido:** uma mensalidade fictícia de R$ 90 possuía ocorrência em setembro e uma ocorrência gerada em outubro.

| Etapa | Ocorrências de outubro | Total de outubro |
|---|---:|---:|
| Antes da exclusão | 1 | R$ 90 |
| Excluir somente a ocorrência de outubro | 0 | R$ 0 |
| Recarregar os dados | 1, com outro ID | R$ 90 |
| Desfazer a exclusão | 2 | R$ 180 |

A duplicação persistiu em outra recarga. O Histórico de Atividade ainda oferecia Desfazer antes de produzir a segunda ocorrência.

**Causa observada:** a geração da recorrência considera o mês excluído como ausente e o recria. O desfazer restaura o registro antigo por seu ID, sem detectar que a mesma ocorrência lógica, da mesma série e do mesmo mês, já foi recriada com outro ID.

**Controle:** desfazer antes da recarga restaurou uma única ocorrência, com R$ 90. Portanto, o problema depende da interação entre exclusão, geração automática e desfazer; não significa que todo desfazer está incorreto.

**Correção proposta:** preservar a intenção de excluir/pular aquela ocorrência e conferir a identidade lógica série + mês antes de restaurar. Se já existir outra versão, interromper e pedir conferência. Não apagar automaticamente a versão substituta, que pode ter recebido pagamento ou edição depois.

Código: [geração](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:272), [exclusão](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:2229), [desfazer](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:4256).

## 2. Fixos antigos com data nativa podem passar para o dia 1

**Exemplo reproduzido:** uma despesa antiga datada de 30/09/2026, armazenada como Date e sem o controle explícito de dia da série, gerou a ocorrência de 01/10/2026. O esperado, havendo evidência do dia 30, era 30/10/2026.

**Causa:** a busca do dia de referência tenta interpretar o valor bruto com o leitor de texto DD/MM/AAAA. Ele não reconhece o objeto Date e o cálculo usa o dia 1 como padrão.

**Controle:** com diaReferencia = 30 explicitamente guardado na série, o resultado foi corretamente 30/10/2026. O achado não afeta indistintamente todas as despesas fixas novas.

**Correção proposta:** aceitar a data nativa na referência, usando o fuso correto e a evidência existente. Manter a decisão anterior de não adivinhar dia 31 a partir de uma ocorrência antiga no dia 28. Revisar ocorrências já geradas separadamente, sem reescrever pagamentos históricos.

Código: [dia de referência](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:249).

## 3. Mudar o cartão das próximas cobranças de um fixo fica bloqueado

**Exemplo reproduzido:** uma assinatura de R$ 20 tinha outubro pago no cartão original. Tentar cadastrar o segundo cartão para as condições futuras foi recusado com a orientação de conferir ou desfazer o pagamento anterior. Os dados originais permaneceram preservados.

**Controle:** a mesma troca foi permitida quando não havia pagamento na série.

**Interpretação:** a proteção contra transferir pagamentos para outro cartão é necessária. Porém, a edição de assinatura já distingue condições futuras de meses pagos, e o bloqueio considera todos os registros da série antes dessa distinção. Isso impede uma troca legítima das próximas cobranças.

**Melhoria proposta:** permitir definir a partir de qual mês a nova forma deve valer, preservando os meses anteriores e tratando separadamente qualquer cobrança futura parcialmente paga. Não orientar a pessoa a desfazer um pagamento histórico correto para trocar o cartão futuro.

Código: [proteção da forma](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:258), [edição de assinatura](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:2403).

## 4. Ponto de atenção: antecipar parcela parcialmente paga redistribui o pago entre meses

**Exemplo reproduzido:** compra de R$ 300 em três parcelas de R$ 100, com R$ 40 já registrados como pagamento da fatura de novembro. Antecipar as parcelas futuras para outubro, sem marcar novo pagamento, produziu:

| Pago ao banco | Antes | Depois |
|---|---:|---:|
| Outubro | R$ 0 | R$ 40 |
| Novembro | R$ 40 | R$ 0 |

O total pago permaneceu R$ 40. Não houve criação ou perda de dinheiro no ensaio. O ponto que precisa de definição é a atribuição do pagamento ao mês: a prévia informa que pagamentos serão preservados, mas não mostra o valor já pago por parcela nem explicita essa redistribuição temporal.

**Melhoria proposta:** mostrar, por parcela, valor, já pago, saldo, mês de origem e mês de destino. Para parcelas parcialmente pagas, definir explicitamente se a operação deve ser bloqueada, antecipar somente o saldo ou realocar o pagamento com confirmação específica. Não tratar as três opções como equivalentes.

Código: [prévia do backend](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:2261). A interface monta a confirmação em `executarAdiantamentoParcelas`, no trecho que usa `previaAntecipacaoWeb`.

## Melhorias de uso diário que estes casos indicam

1. **Distinguir as ações de um fixo:** excluir este registro, pular este mês e encerrar a recorrência precisam ter efeitos e explicações claros. Hoje, apagar um registro não preserva necessariamente a intenção de não gerá-lo novamente.
2. **Editar condições a partir de um mês:** para mudança de cartão ou de preço de assinatura, mostrar MM/AAAA de início e as cobranças afetadas, preservando as anteriores.
3. **Um caminho visível para receber integral ou parcialmente:** o recebimento parcial existe dentro do editor de empréstimos. Um botão Registrar recebimento com o saldo preenchido permitiria receber tudo ou informar apenas uma parte, sem precisar descobrir a opção em Editar.
4. **Data combinada de devolução, opcional:** atualmente o mês da fatura e uma observação como Paga dia 14 não substituem uma data estruturada combinada com a pessoa. Essa opção ajudaria a organizar cobranças, mantendo o vencimento bancário independente. Não interpretar automaticamente texto livre como promessa de pagamento.

Essas sugestões não exigem aumentar o número de abas principais. A prioridade é ajustar os fluxos existentes antes de ampliar ferramentas.

## Prioridades acumuladas

- **Primeiro:** impedir a duplicação entre recorrência e desfazer; corrigir a compatibilidade do backup já apontada.
- **Depois:** preservar o dia dos fixos antigos, permitir mudanças futuras de cartão e esclarecer antecipações parcialmente pagas.
- **Continuam registrados:** resultado incorreto de recarga concorrente, rascunho de rachadinha entre abas, valor mantido ao trocar a fatura, resumo de Recebidos, acessibilidade, filtros e ordenação das parcelas.
- As prioridades anteriores e suas evidências permanecem em [VISTORIA_USABILIDADE_E_RECUPERACAO_20261024.md](VISTORIA_USABILIDADE_E_RECUPERACAO_20261024.md), [VISTORIA_RECEBIMENTOS_FILTROS_20261024.md](VISTORIA_RECEBIMENTOS_FILTROS_20261024.md) e [AJUSTES_HORIZONTE_PESSOAS_20261024.md](AJUSTES_HORIZONTE_PESSOAS_20261024.md).

## Verificação e limites

Ensaio executado: `C:/Users/lucas/Documents/Codex/vistoria-rotina-financeira-20261024.cjs`. Resultado registrado em `C:/Users/lucas/Documents/Codex/vistoria-rotina-financeira-20261024.log`.

Sete cenários foram executados, com asserções sobre os efeitos observados e controles positivos. Este ensaio reproduz o estado atual; não é uma nova suíte de aceitação de correções. Não foi repetida a suíte completa nesta rodada.

Não houve alteração de código funcional, publicação, acesso ou gravação na planilha real. Esta rodada se concentrou nas regras do backend e nas ações correspondentes da interface; não repetiu a inspeção visual de celular e computador feita na vistoria anterior.
