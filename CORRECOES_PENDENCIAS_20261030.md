# Conclusão do pacote pendente — 30/10/2026

Este pacote aplica os dois ajustes visuais aprovados e os pontos do relatório `VISTORIA_PRE_DEFINITIVA_20261030.md`. Mudanças locais; nenhuma implantação, troca de base, restauração real ou alteração de gatilhos foi realizada.

## Checklist implementado

- [x] Histórico e Mensal mostram **📌 Fixo mensal**, sem o infinito adicional. A marca `∞/∞` continua nos dados e nas regras de recorrência, onde é necessária.
- [x] Removido **Conferir fatura** de Atividade e sincronização. Os acessos do Painel e Mensal permanecem. O histórico de pagamentos, as confirmações e as opções de recuperação continuam em Atividade.
- [x] Cadastro, edição, relatórios, restauração e catálogos anuais usam o intervalo **1900–2200**. A organização anual passou a aceitar os anos históricos que o cadastro já aceitava; um ano digitado como 2926 é recusado.
- [x] Parcelamentos conferem também a última competência gerada, considerando a parcela inicial selecionada. A finalização de inclusões/alterações de competência faz uma conferência adicional antes do plano financeiro.
- [x] A ativação anual confere as competências existentes antes de marcar organização/PDF como ativos. O erro identifica a aba e o registro a conferir. Planos anteriores parcialmente preparados continuam sendo retomados pelo caminho protegido.
- [x] O formulário nativo valida o valor mínimo por parcela antes de reservar um pedido e não trunca parcelas fracionárias silenciosamente.
- [x] Para substituir um pedido antigo recusado, o formulário usa o cancelamento do servidor. Se o servidor identificar uma gravação já confirmada, preserva a confirmação e os novos campos. Se houver conflito/resultado incerto, conserva o pedido para conferência. Um envio antigo não atravessa uma restauração.
- [x] Sucesso ou erro atrasado de pagamento não fecha, consulta nem reabilita os campos de uma fatura aberta depois. Reabrir inicia os campos da nova janela; as respostas respeitam a sessão que originou o envio.
- [x] Avisos de pagamento identificam cartão e mês. Uma falha na atualização da tela depois do pagamento confirmado não é apresentada como falha da gravação.
- [x] Removidos os helpers internos sem uso `recuperarDiarioGestor_` e `exportarBackupRealGestor_`. Entradas públicas, migrações e ações de compatibilidade foram preservadas.
- [x] Removidos cálculos idênticos consecutivos na atualização de versões e na finalização do plano. O resultado é reaproveitado enquanto os campos financeiros não mudam, dentro desse trecho síncrono da operação.
- [x] O medidor local passou a contar a construção efetiva do hash por registro. Não foi acrescentado cache de registros entre operações.

## Desempenho: evidência e alcance

Com mil registros fictícios, a contagem determinística de chamadas a `hashRegistroGestor_` mudou assim:

| Operação | Antes | Depois |
| --- | ---: | ---: |
| Carga completa/repetida e Mensal | 5.000 | 4.000 |
| Pagamento de uma fatura com mil itens | 12.000 | 10.000 |
| Desfazer esse pagamento | 13.000 | 11.000 |

O número de digests e as linhas do diário foram preservados nos casos medidos. Isso reduz construções/serializações repetidas, sem suprimir conferências. Os tempos locais variaram entre execuções; esta medição não comprova redução da latência real no celular, no Google ou na Vercel.

Uma estratégia adicional de memoização por objeto foi comparada e não apresentou ganho consistente. A implementação final usa apenas o reaproveitamento local simples e o cache de digests por operação que o projeto já possuía. Edições diretas na planilha, alteração de valores, datas mutáveis e controle de devolução continuam sendo detectados.

## Arquivos principais

- `index.html`: ajustes visuais; cópias geradas pelo build.
- `interface/faturas.js`: sessão da janela e mensagens de conclusão.
- `shared/competencias.js`: limites comuns e alcance do parcelamento.
- `shared/anual.js`, `shared/protecao.js`, `shared/relatorios.js`: competências e prévia da ativação.
- `Backend/Code.gs`: validação, formulário protegido, limpeza e reaproveitamento de hashes.
- `scripts/medir-desempenho.cjs`: contagem dos cálculos efetivos.
- `tests/pendencias-30-integridade.test.cjs` e `tests/conferencia-resumida-painel.test.cjs`: regressões dos casos novos; teste visual anterior atualizado para o texto sem infinito.

## Atualização para testar

Validação final: **665 testes passaram, zero falhas**. CSS compilado, arquivos públicos preparados, módulos incorporados e três espelhos HTML conferidos. As verificações de whitespace também passaram.

Além da interface, este pacote modifica o **Apps Script**. Atualize `Backend/Code.gs` e a versão da implantação usada pela **Cópia de Gestor de Gastos**. Não há função manual nova a executar só para ativar estas correções. A configuração anual que já estiver válida permanece reconhecida; uma ativação interrompida continua usando o acompanhamento existente.

O cache da interface é `gestor-gastos-v66`. A publicação é uma etapa separada.

## Conferências externas que continuam necessárias

Os testes locais usam dados fictícios. Permanecem necessárias as conferências de implantação/permissões e dos fluxos no PWA com a planilha de testes, inclusive backup/PDF e restauração numa cópia descartável, antes da transferência definitiva. Não houve limpeza de histórico Git nem exclusão de anexos pessoais neste pacote; a revisão desses arquivos antes de compartilhar o repositório é uma decisão separada da correção do app.
