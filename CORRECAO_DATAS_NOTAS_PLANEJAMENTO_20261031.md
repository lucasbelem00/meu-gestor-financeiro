# Datas, Notas e Planejamento — 31/10/2026

Pacote local, cache v71. Nenhuma alteração foi feita nos registros ou no diário real da planilha.

## O que o diagnóstico mostrou

O envio `salvarNotasWeb:6c48e5e8-7869-47ba-bd73-9f06ecd2c601` está PRONTO no diário e depende de conferência. O diagnóstico aponta exclusivamente Anotações, linha 3, coluna D (Data). Não é uma fila offline: o bloqueio é de integridade no servidor.

Na conferência em leitura na Cópia de Gestor de Gastos, a nota já está marcada como excluída, versão 2. A data da célula foi convertida pelo Sheets, enquanto a alteração persistida no diário espera o texto `31/10/2026`. A exclusão chegou à planilha, mas a comparação de integridade não confirmou a mesma representação da data. Isso explica a pendência sem exigir repetir a exclusão.

Os tempos fornecidos também separam o problema de desempenho: requisições levaram segundos/dezenas de segundos, enquanto renderizações levaram de 7 a 71 ms nos eventos listados. Esses dados medem o caminho inteiro da consulta, não separam rede/proxy/Google. O gráfico não explica sozinho essa demora.

## Correção estrutural

O aplicador do diário agora protege como texto os campos textuais de Anotações e Planejamento, além dos registros financeiros já protegidos. Números, booleanos e valores Date nativos continuam com seus tipos originais. Isso evita reinterpretar uma data textual ao regravar o bloco de uma edição ou exclusão.

`shared/datas-recuperacao.js` trata gravações antigas que já ficaram pendentes. Reconhece somente os campos declarados de data, competência e parcela de Lançamentos/Empréstimos, Data das Notas e Prazo do Planejamento. A célula atual precisa ser Date à meia-noite no fuso do destino e sua representação precisa coincidir exatamente com o texto esperado. O hash da aba inteira, após essa normalização em memória, precisa coincidir com o resultado integral do plano.

Somente então ocorre uma releitura da origem, gravação das células comprovadas como texto explícito e conferência integral final. Texto, valor, situação, identificação, outra linha ou horário divergentes impedem a reparação automática. Anos fechados não são liberados para escrita; destinos externos passam pelo catálogo validado existente. O diário permanece preservado se a conferência não passar.

Isso corrige uma classe de conversões automáticas na gravação. Não é uma promessa de que qualquer erro de data futuro será ignorado ou “resolvido” sobrescrevendo dados.

## Interface

- Menu: título **🧭 Planejamento**, com Agenda e Metas e compras planejadas em duas colunas. Ícones e rótulos podem empilhar dentro do atalho no celular.
- Painel: o gráfico mantém tamanho controlado no celular. No computador, cresce com a área da comparação, com altura mínima maior, em vez de ficar preso aos 256 px anteriores.
- Planejamento: rascunho preserva os textos dos valores enquanto se digita, incluindo uma vírgula ainda incompleta. Não arredonda esse texto apenas por navegar para outra aba.
- Campos e ações de planejamento são bloqueados durante consulta/gravação, inclusive se o formulário for recriado ao navegar de volta. São liberados ao concluir, evitando substituição de campos digitados durante uma resposta atrasada.

## Como usar Metas e compras planejadas

1. Em Menu → 🧭 Planejamento, abrir Metas e compras planejadas.
2. Escolher **Meta de reserva/compra** ou **Compra planejada**.
3. Informar nome, objetivo/estimativa, prazo opcional e prioridade. Nos valores, usar por exemplo `3000,00`, sem separador de milhar.
4. Para uma meta, informar **Já reservado**. Objetivo R$ 3.000 e reservado R$ 800 mostram aproximadamente 27%. Editar esse valor quando reservar mais dinheiro; ele não é consultado no banco nem lançado como despesa.
5. Uma compra planejada pode abrir o simulador com sua estimativa, após confirmação. Simular não grava a compra.
6. **Marcar concluído/Reabrir** organiza a lista. Não cria nem quita lançamento, empréstimo ou fatura. Registrar o gasto pelo fluxo financeiro normal quando ele ocorrer.
7. **Consultar novamente** busca os dados da planilha e pede confirmação se houver rascunho. Uma edição feita com versão antiga é recusada pelo servidor em vez de sobrescrever outro aparelho.

O prazo é uma informação de planejamento; não cria fatura ou devolução combinada na Agenda. Itens salvos sincronizam pela base de controle e entram no backup. O rascunho ainda não salvo é local e fica associado à época da restauração.

## Instalação para resolver a pendência

1. Atualizar o Backend/Code.gs e publicar a nova versão da implantação de testes. Atualizar também a interface para v71.
2. Abrir o app e atualizar os dados. A recuperação existente tenta retomar o mesmo envio do diário. Não criar outra exclusão e não apagar a linha técnica.
3. Se a única diferença continuar sendo a conversão comprovada da data, a rotina confirma o envio e conclui o histórico de atividade. Se aparecer outra diferença, mantém o bloqueio para conferência.
4. Conferir a ausência da nota na lista ativa, sua marca de exclusão preservada e a pendência resolvida. A simples compilação local deste pacote não altera o estado da conta.

## Testes

Casos novos cobrem exclusão da nota com texto protegido, retomada de um plano antigo com data convertida, recusa diante de alteração manual de texto, valor ou horário, normalização comprovada de data/competência/parcela financeira, exclusão preservando os campos dos registros restantes e rascunho monetário sem arredondamento na navegação. A suíte anterior de backup, restauração, conflitos e planejamento continua necessária.

**700 testes passaram, zero falhas.** Build e arquivos de distribuição conferidos. Na prévia local, gráfico com aproximadamente 389 px de altura no computador; atalhos na mesma linha no computador e em 390 px, sem transbordamento horizontal. Compra fictícia de R$ 450 passou pelo modal de confirmação e abriu o simulador com o mesmo valor, sem criar despesa. O console não apresentou erros/avisos nesse fluxo. Capturas salvas em Documents/Codex; nenhuma operação dessa prévia acessou a conta Google.
