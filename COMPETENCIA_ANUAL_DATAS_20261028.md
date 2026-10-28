# Competência anual e datas do Planilhas — 28/10/2026

A mensagem “Competência anual inválida” da Mensal foi reproduzida com uma célula Mês Fatura contendo uma data nativa. A aparência `10/2026` na planilha não garante que o conteúdo entregue ao Apps Script seja texto. O leitor antigo convertia a data em uma representação que não reconhecia como mês/ano.

O erro interrompia a organização depois de gravar uma configuração intermediária. A leitura da Mensal tentava concluir a distribuição dos registros e encontrava o mesmo problema. Isso explica a reprodução local; não foi inspecionada nem modificada a tentativa real na conta Google.

## Correções

- `parseMesFat` aceita texto e data nativa, respeitando o fuso do projeto, sem regravar o valor original. Mês zero, mês 13 e data inválida continuam recusados.
- A distribuição anual informa a aba e o registro quando a competência é realmente inválida.
- O JSON v3 aplica aos retratos anuais a mesma representação explícita de datas já usada nas abas principais do backup. A assinatura fica consistente depois de salvar e ler o JSON. As planilhas anuais originais e seus hashes de fechamento permanecem intactos.
- A retomada do trabalho interrompido reutiliza a identificação existente, sem duplicar lançamentos ou empréstimos.

## Atualização

Substituir o conteúdo de `Code.gs` pelo arquivo `Backend/Code.gs` completo deste pacote e publicar uma **nova versão da implantação existente** do Apps Script. Apenas salvar o editor não atualiza a versão atendida pelo endereço `/exec`.

Esta correção não exige novas funções manuais nem mudança de datas na planilha. Mantém protocolo 16 e cache v52 do pacote de ativação em segundo plano. Se esse pacote ainda não foi instalado, seguir também `ATIVACAO_ANUAL_504_20261028.md`.

Depois, recarregar o app e testar a Mensal. Em Exportar dados e backup, usar **Atualizar situação**. Se a ativação anterior ficou com erro e for oferecido **Retomar ativação anual e PDFs**, usar esse botão e acompanhar até concluir. Não apagar abas, catálogo ou diário para tentar destravar.

## Verificação

Regressões em `tests/competencia-anual-datas-20261028.test.cjs` usam dados fictícios: relatório mensal/anual, fatura com gastos pessoais e de terceiros, migração interrompida, retomada em segundo plano, fechamento, pagamento e recebimento tardios, restauração após transporte JSON e fronteiras de mês/ano no fuso de São Paulo. Também verificam que mês inválido não remove registros da base.

Oito regressões novas aprovadas; suíte integrada com **572 testes aprovados, zero falhas e zero ignorados**. Log: `C:/Users/lucas/Documents/Codex/competencia-anual-datas-validacao-20261028.log`.

Não houve publicação remota, ativação na conta real nem alteração de dados reais. A confirmação no app depende da atualização da implantação.

Referência: [o Google documenta que getValues pode devolver Date ou String conforme a célula](https://developers.google.com/apps-script/reference/spreadsheet/range#getvalues).
