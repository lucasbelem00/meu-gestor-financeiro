# Filtros mensais e nova vistoria — 26/10/2026

## Alteração solicitada e concluída

- Um único **× vermelho**, dentro do resumo azul, para limpar todos os filtros sem um botão destacado separado.
- O resumo e o botão só aparecem quando existe algum filtro ativo.
- No celular, o texto do resumo pode quebrar linha; o × conserva sua área de toque dentro do conjunto, sem rolagem horizontal.
- Limpar remove todos os grupos de filtros. O foco sai do botão que será ocultado e volta ao título da lista, sem mudar a rolagem.
- Um mês sem lançamentos e sem filtros não recomenda mais usar um botão que está oculto; uma combinação sem resultados continua oferecendo a limpeza.
- Cache do app atualizado para **v45** e protocolo do backend **12**, incluindo as correções autorizadas nesta vistoria e o alinhamento do ícone de limpeza.

Fontes: `index.html`, cabeçalho de Lançamentos da Fatura e `renderizarListaItensFaturaMensal`; cópias do Apps Script e pacote estático sincronizados pelo build.

## Escopo da nova auditoria

Leitura do código e provas com planilhas, Drive e armazenamento fictícios. Nenhuma conta real, planilha real ou implantação publicada foi alterada. Os achados abaixo registram as reproduções originais; **os oito foram corrigidos após a autorização do usuário**. O resultado e a validação estão em [CORRECOES_VISTORIA_20261026.md](CORRECOES_VISTORIA_20261026.md).

### 1. Alta — reprogramação de uma mudança de despesa fixa pode começar tarde

**Cenário:** fixo de R$ 20 quitado em outubro; programar R$ 25 a partir de janeiro; depois reprogramar para R$ 30 a partir de novembro.

**Esperado:** novembro passa a R$ 30. **Reproduzido:** a edição retorna sucesso, mas modifica somente janeiro; ao chegar novembro, o gerador usa R$ 20.

O editor considera suficiente ter alterado uma ocorrência futura e não cria uma referência no primeiro mês solicitado. É um caso diferente do intervalo entre condições futuras corrigido na vistoria anterior: envolve duas programações sucessivas.

**Correção sugerida:** garantir uma condição vigente no início exato da alteração, respeitando pagamentos já registrados e exibindo quais períodos serão atualizados.

Fontes: `Backend/Code.gs:2522`, `2531`, `2538`.

### 2. Média — próximas datas de empréstimo usam a competência bancária em vez da ordem das parcelas

**Cenário:** compra de três parcelas; antecipar as parcelas para a mesma fatura; mover para Empréstimos; editar **2/3**, informar 31/01/2027 e aplicar às próximas a receber.

**Esperado:** 1/3 fica intacta; 2/3 recebe 31/01 e 3/3 recebe 28/02. **Reproduzido:** a prévia e a gravação incluem também 1/3; todas recebem 31/01.

O filtro e o deslocamento usam apenas o mês bancário. A versão e a assinatura da prévia protegem contra alterações concorrentes, mas não corrigem essa seleção conceitualmente errada.

**Correção sugerida:** selecionar e deslocar pela numeração da parcela, considerando partes de recebimentos parciais como pertencentes à mesma parcela. Manter banco e pessoa independentes.

Fontes: `Backend/Code.gs:292`, `294`.

### 3. Média — corrigir cartão para Pix pode deixar saldo sem fluxo de quitação

**Cenário:** empréstimo de R$ 120 no cartão, sem pagamento ao banco; editar a forma para Pix.

**Reproduzido:** a forma vira Pix, mas continua com R$ 0 pago e R$ 120 de saldo bancário. Um empréstimo Pix novo nasce com o pagamento realizado. O diálogo de fatura aceita somente cartão, portanto não fornece a ação de baixa para esse Pix corrigido.

**Correção sugerida:** tratar explicitamente a transição, confirmando se o pagamento via Pix foi realizado. Não inferir que a pessoa devolveu o dinheiro e não transportar silenciosamente pagamentos já vinculados ao cartão.

Fontes: `Backend/Code.gs:886`, `4422`.

### 4. Média — rascunho de nota já adicionada pode voltar a ser oferecido

**Cenário:** recuperar um rascunho de nota herdado de outra página, adicionar a nota e reabrir o app.

**Reproduzido:** o campo e a cópia atual são limpos, mas a origem antiga reaparece como recuperável. Recuperar e adicionar novamente cria outro ID com o mesmo texto. **Não é duplicação automática:** exige recuperar e adicionar a cópia antiga.

**Correção sugerida:** conclusão durável do conteúdo exato do rascunho, preservando qualquer edição posterior feita por outra página. A proteção equivalente dos lançamentos financeiros não cobre os rascunhos de Notas.

Fontes: `interface/usabilidade.js:236`, `242`, `298`.

### 5. Baixa — somente data ou competência alterada não persiste como rascunho

**Cenário:** alterar apenas a data de compra ou mês da fatura, sem preencher descrição, valor, forma ou categoria, e reabrir o app.

**Reproduzido:** o detector de substituição considera o formulário preenchido, mas a rotina durável o considera vazio e não guarda a escolha. Não afeta lançamento já salvo. A data combinada de devolução já participa da persistência; este achado se refere à compra/competência.

**Correção sugerida:** distinguir escolhas manuais dos valores automáticos e compartilhar essa regra entre detecção e persistência, sem voltar a criar rascunhos vazios apenas por abrir uma aba.

Fontes: `interface/rotina.js:41`, `interface/usabilidade.js:179`.

## Condicionais: alterações manuais na planilha

Os três casos seguintes exigem modificar diretamente a estrutura ou dados da planilha. Não foram reproduzidos durante operações comuns pela interface.

### 6. Média — resumo anual técnico alterado pode mudar o total do Painel sem aviso

Com R$ 100 arquivados e R$ 30 ativos, alterar apenas `pessoalCentavos` no resumo do catálogo para 100 fez o Painel mostrar R$ 31. O Anual continuou mostrando R$ 100 para aquele ano; o estado de integridade não acusou bloqueio.

**Correção sugerida:** conferir ou reconstruir o resumo antes de incorporá-lo aos indicadores; vincular a conferência ao arquivo anual e ao conteúdo resumido.

Fontes: `Backend/Code.gs:1929`, `shared/protecao.js:115`.

### 7. Média para recuperação — catálogo malformado impede prévia de JSON completo

Um JSON v2 íntegro, com o conteúdo anual completo, não passa na prévia se o resumo JSON do catálogo atual foi manualmente corrompido. Retorna “Resumo do arquivo anual inválido”. A recuperação recente cobre arquivos ausentes/divergentes, mas o parser do catálogo bloqueia antes desse isolamento.

**Correção sugerida:** recuperação explícita do próprio catálogo, preservando primeiro a matriz original e o diagnóstico e exigindo conferência do JSON completo. A restauração normal deve continuar bloqueando estruturas inválidas.

Fontes: `shared/protecao.js:115`, `372`.

### 8. Média, personalização manual — colunas extras ficam fora do arquivo anual

Uma observação adicionada na coluna S de uma compra antiga é retirada da principal junto com a compra, mas não entra no arquivo anual, limitado às 18 colunas do app. O backup anterior contém a observação; porém a restauração automática desse backup é recusada por conter 19 colunas. A informação permanece na cópia, exigindo recuperação manual.

**Correção sugerida imediata:** bloquear o arquivamento de registros com conteúdo adicional até existir preservação compatível na exportação e restauração. Informar a restrição na prévia da manutenção.

Fontes: `shared/protecao.js:191`, `Backend/Code.gs:4753`.

## Usabilidade para discutir junto às correções

- Na prévia de próximas devoluções, separar **parcela**, **mês da fatura** e **data de devolução**. Isso evita interpretar antecipação bancária como mudança do acordo com a pessoa.
- Ao corrigir cartão para Pix, explicar o que será alterado no pagamento e o que continuará a receber da pessoa.
- Na manutenção, indicar personalizações detectadas antes de oferecer o arquivamento, com orientação específica em vez de erro somente na confirmação.

Não foram acrescentadas novas abas ou funções de uso diário apenas para ampliar o menu.

## Validação e provas

- **405 testes existentes aprovados, zero falhas**, após a primeira alteração do botão. Os cenários novos desta auditoria não eram cobertos por eles; passar a suíte não invalida os achados.
- Build concluído e **21 testes específicos de filtros/navegação/relatórios aprovados**, após ajustar o estado vazio e o alinhamento final. CSS compilado de 40.796 bytes; cópias e pacote estático sincronizados.
- **32 controles adicionais de proteção/integridade** executados na auditoria de persistência, aprovados.
- Prova financeira confirmou que pagamento bancário de R$ 0,67 e recebimento de R$ 0,33 em empréstimo de R$ 1,01 conservam o saldo bancário de R$ 0,34; repetir o recebimento com o mesmo identificador não duplicou a operação.
- Navegador local: sem filtro não há botão; com filtro há apenas um; limpeza por teclado retira as seleções e retorna o foco ao título; celular sem rolagem horizontal; combinação sem resultados mantém a limpeza; mês vazio sem filtros não oferece limpeza inútil. No computador, resumo e botão ficaram na mesma linha, separados por 8 px. Nenhum erro de execução foi registrado na aba de teste. Aba e servidor fictício encerrados depois da conferência.

Provas locais em `C:/Users/lucas/Documents/Codex/`:

| Arquivo | Cenários |
|---|---|
| `auditoria-financeira-novos-20261026.cjs` e `.json` | Achados 1–3 e controle de centavos/reenvio |
| `auditoria-ui-notas-herdadas-20261026.cjs` | Achado 4 |
| `auditoria-ui-rascunho-data-20261026.cjs` | Achado 5 |
| `auditoria-persistencia-20261026.cjs` e `auditoria-persistencia-20261026-provas.json` | Achados 6–8 |
| `auditoria-persistencia-20261026-controles.log` | 32 controles de proteção/integridade |
| `gestor-filtros-e-vistoria-20261026-tests.log` | Suíte de 405 testes |
| `gestor-filtros-20261026-finais.log` | Conferência específica após o estado vazio |
| `filtros-mensal-20261026-mobile.jpg` | Aparência do botão junto ao resumo, no celular |

Prioridade sugerida: corrigir 1–3 antes da próxima publicação com mudanças financeiras; depois concluir rascunhos de Notas e a coerência das datas. Tratar 6–8 como reforços de recuperação e proteção contra personalizações manuais. Esta etapa não publicou alterações.
