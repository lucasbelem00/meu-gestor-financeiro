# Vistoria de recebimentos, pagamentos e filtros — 24/10/2026

Atualização posterior: a nova imagem do modal de pagamento em outubro revelou uma falha na seleção de registros cujo mês está armazenado como Date. A correção e a publicação necessária estão em [CORRECAO_FATURA_DATAS_20261024.md](CORRECAO_FATURA_DATAS_20261024.md). O recebimento da pessoa continua confirmado; o problema estava na consulta separada da fatura bancária.

## Resultado da conferência do PicPay

A cópia de teste da planilha foi consultada pelo Google Drive, somente por leitura. O recebimento está gravado em Empréstimos, enquanto o estado separado do banco continua em aberto, sem pagamento registrado. O histórico consultado também diferencia o recebimento do pagamento da fatura. O usuário confirmou que marcou somente Recebido.

Portanto, não foi constatada falha de contabilização nesse caso. Receber da pessoa reduz o que ela deve, mas não quita o cartão. Nenhum pagamento real foi registrado ou alterado durante a vistoria. O rótulo curto Parcial pode ser mantido.

Um ensaio isolado com o backend real e dados fictícios confirmou a separação: uma fatura agregada de R$ 384,78, com R$ 176,78 pagos ao banco e R$ 208 recebidos da pessoa, ainda possui R$ 208 a pagar ao banco. Registrar posteriormente esse pagamento quita o saldo bancário e preserva o recebimento.

## Novas fragilidades reproduzidas

### 1. Recarga sobreposta pode retornar sucesso sem atualizar a tela

Local: `index.html`, função `carregarDados`.

A resposta de uma consulta anterior é corretamente impedida de sobrescrever uma consulta iniciada depois. Entretanto, o ramo que descarta a resposta retorna `true`. Um chamador pode interpretar esse retorno como tela atualizada, mesmo quando a consulta mais recente falha e nenhuma das duas respostas é exibida.

Reprodução: iniciar duas recargas; resolver a primeira com dados válidos; rejeitar a segunda. A primeira retorna sucesso, a segunda retorna falha, e nenhuma resposta é renderizada. Isso pode produzir uma mensagem de status atualizado com a tela ainda antiga. Não há demonstração de perda da gravação no servidor nesse ensaio.

Recomendação: distinguir resposta recebida de dados efetivamente aplicados. Chamadores devem acompanhar o resultado da recarga vigente ou informar que a atualização da tela continua pendente. Preservar a proteção que descarta respostas antigas, inclusive diante de gravações e restaurações concorrentes.

### 2. Mês e parcela podem virar datas extensas no resumo de Atividade

Local: `Backend/Code.gs`, função `resumirRegistroAtividade_`.

A data da compra recebe formatação explícita, mas mês da fatura e parcela passam pela conversão genérica em texto. Se o Google Sheets entregou essas células como Date, um mês como 10/2026 ou uma parcela como 7/12 aparece em formato extenso com dia, horário e fuso.

O caso foi observado no resumo de um recebimento já gravado e reproduzido localmente com objetos Date. O problema confirmado é a apresentação do resumo; não foi demonstrado erro no saldo do recebimento nem no mecanismo de desfazer.

Recomendação: normalizar mês e parcela conforme o significado de cada coluna ao criar o resumo. Para eventos antigos, formatar a apresentação a partir dos dados disponíveis sem regravar os originais do diário nem suas provas de integridade.

## Filtros da aba Mensal

Exemplo com gastos de R$ 100:

| Filtro atual | R$ 0 pagos | R$ 40 pagos | R$ 100 pagos |
|---|---|---|---|
| Com pagamento | Não | Sim | Sim |
| Com saldo | Sim | Sim | Não |
| Parcialmente pagos | Não | Sim | Não |
| Quitados | Não | Não | Sim |

Existe sobreposição intencional: os filtros representam conjuntos amplos e específicos. No mesmo grupo, selecionar opções soma os conjuntos; por isso Com pagamento + Com saldo pode mostrar todos os lançamentos de valor positivo. Entre grupos, como situação, cartão e categoria, as condições são combinadas.

Sugestão para simplificar: Não pagos, Parciais e Quitados. As três situações seriam distintas. Não pagos + Parciais permitiria consultar tudo que ainda possui saldo. Preservar a seleção combinada, a soma dos resultados e Limpar filtros.

Melhoria de clareza: na confirmação individual de recebimento de compras no cartão, lembrar que a ação registra a devolução da pessoa e mantém o pagamento ao banco separado. A confirmação em lote já informa essa diferença.

## Pontos anteriores preservados

- Ordenar as parcelas de Empréstimos pelo mês crescente, em vez de inverter toda a lista, continua uma recomendação ainda não aplicada.
- O risco de sobrescrever rascunhos da rachadinha em duas abas continua registrado em `AJUSTES_HORIZONTE_PESSOAS_20261024.md`; não é um achado novo desta vistoria.

## Limites e artefatos

Esta etapa realizou diagnóstico e ensaios, sem alterar código funcional, filtros, valores ou estados financeiros. Não houve publicação. As alterações locais anteriores continuam preservadas.

Ensaio: `C:/Users/lucas/Documents/Codex/vistoria-picpay-20261024.cjs`. Ele usa o backend e a função de recarga atuais, com dados fictícios em memória. As três verificações passaram: separação correta dos pagamentos e reprodução das duas fragilidades. Esse ensaio não equivale a uma nova execução da suíte completa nem à conferência visual da versão publicada.
