# Calendário bancário da Agenda

Implementado em 02/11/2026. Regras de apresentação no webapp; não altera registros, pagamentos ou competências na planilha.

- Sábados, domingos e calendário bancário nacional: Ano Novo, Carnaval (segunda e terça), Sexta-feira da Paixão, Tiradentes, Dia do Trabalho, Corpus Christi, Independência, Aparecida, Finados, República, Consciência Negra (desde 2024) e Natal.
- Datas móveis calculadas por ano, sem consulta à internet na abertura do app. Mudanças futuras nas regras ou datas extraordinárias exigem atualização do calendário.
- Quarta-feira de Cinzas, 24/12 e 31/12 não são prorrogados apenas por horário reduzido/ausência de atendimento presencial. A data indicada pelo emissor pode ser informada como exceção.
- A competência permanece a original mesmo quando o vencimento ajustado passa para o mês ou ano seguinte. Datas de devolução de empréstimos não são prorrogadas pelo calendário bancário.
- Agenda, situações bancárias do Mensal/Horizonte/Empréstimos e avisos do Painel usam a mesma função de prazo. Os alertas são reconstruídos com os saldos carregados quando o Horizonte está disponível.

## Exceção indicada pelo banco

Em Conferir fatura, abaixo da composição, aparece o vencimento para pagamento e a opção de informar outra data. A preferência é restrita ao cartão e à competência. Usar data automática remove a exceção. É salva somente neste aparelho/origem do webapp em gestorVencimentosFaturasV1; não sincroniza nem entra no backup da planilha. Não altera o dia padrão do cartão. Não aplica feriados locais automaticamente.

## Onde fica o código

- interface/situacoes.js: feriadosBancariosGestor, vencimentoFaturaBancarioGestor e situacaoBancoVisualGestor.
- interface/agenda.js: eventos e alertasBancariosGestor.
- interface/faturas.js: consulta, edição e restauração da data de uma fatura.
- tests/calendario-bancario-20261102.test.cjs: feriados móveis, sequência domingo/Finados, virada de mês/ano, prazo de atraso, validação e isolamento das exceções.

Fontes: https://feriadosbancarios.febraban.org.br/ e https://www.bcb.gov.br/meubc/faqs/p/boleto-com-vencimento-em-dia-nao-util-e-boleto-vencido . A regra é voltada às faturas de cartão, não a tributos.
