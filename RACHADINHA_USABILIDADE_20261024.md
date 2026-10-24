# Rachadinha e identidade das cores — 24/10/2026

## Checklist das alterações

- [x] Azul nas ações de gasto pessoal; âmbar nas ações de empréstimos, incluindo o conversor no editor do Histórico.
- [x] Botão Atualizar e focos do editor de empréstimos em âmbar; editor pessoal em azul. Verde permanece associado aos valores pagos.
- [x] Eu é o participante fixo: não é preciso selecionar quem você é, renomear ou remover essa pessoa.
- [x] Nomes das outras pessoas continuam editáveis. Rascunhos antigos preservam valores, ordem do cálculo e consumidores na adaptação; pedidos já preparados mantêm seu payload e identificador originais.
- [x] Cotas aceitam vírgula e possuem explicação e exemplos dentro da ferramenta.
- [x] Guia recolhido mostra as etapas e um exemplo completo de divisão por itens.
- [x] WhatsApp omite desconto, serviço e acréscimos quando seus valores são zero.
- [x] Preencher minha parte usa os itens consumidos, o estabelecimento quando informado e o sufixo (minha parte). Descrições muito grandes são resumidas.
- [x] Somente sua parte oferece o atalho de gasto pessoal. Partes das outras pessoas seguem o registro de adiantamentos em Empréstimos.
- [x] Preencher protege formulários pendentes e pede confirmação para substituir um rascunho. Revalida a conta e o formulário antes da substituição.
- [x] Minha parte já preparada no Novo Registro fica desmarcada por padrão na gravação conjunta. O aviso pede para conferir se ela foi salva, reduzindo o risco de duplicação entre os dois caminhos.
- [x] Seleções dos consumidores são preservadas ao adicionar, renomear ou remover pessoas e ao reabrir um item ainda não incluído.
- [x] Uma nova pessoa entra marcada no padrão Todos somente quando ainda não começou a elaboração de um item; seleções específicas permanecem preservadas.
- [x] A prévia de registro é recusada se a divisão ou os campos mudarem durante a consulta ou antes da confirmação.
- [x] Divisões com envio preparado não permitem mudar os dados ou preencher novamente a parte pessoal antes da conferência. Uma nova conta começa com Limpar após a confirmação.
- [x] Abrir o registro não presume que você pagou o restante da loja. Há uma ação explícita para preencher esse pagamento no cálculo, seguida da conferência antes de gravar.
- [x] O serviço marcado com percentual vazio deixa de aplicar 10% silenciosamente: é necessário preencher o percentual ou desativar a opção.
- [x] O registro oferece apenas formas de pagamento utilizáveis, sem resumo ou cartões arquivados.
- [x] Converter uma divisão rápida cancela a edição incompleta de um item anterior e orienta a conferir quem consumiu bebida.

## Cotas: peso, não porcentagem

As cotas só valem entre as pessoas que consumiram cada item.

Se Eu, Ana e Bruno consumiram todos os mesmos itens de uma conta de R$ 100:

| Cotas: Eu / Ana / Bruno | Resultado |
|---|---|
| 1 / 1 / 1 | Aproximadamente um terço para cada; os centavos fecham o total |
| 2 / 1 / 1 | Eu R$ 50; Ana R$ 25; Bruno R$ 25 |
| 0,5 / 1 / 1 | Eu R$ 20; Ana R$ 40; Bruno R$ 40 |

0,5 é metade de uma cota 1; 1,5 é uma cota e meia. Nenhum desses números significa sozinho 50% da conta. Para dividir igualmente, mantenha 1 em todas as pessoas.

## Exemplo do modo detalhado

1. Mantenha Eu e adicione Ana e Bruno.
2. Inclua Pizza por R$ 90 e marque os três consumidores.
3. Inclua Bebida por R$ 30 e marque somente Ana e Bruno.
4. Com cotas 1, o resultado é Eu R$ 30, Ana R$ 45 e Bruno R$ 45.
5. Se ainda não houve pagamento à loja, deixe os pagamentos vazios; pode copiar a divisão ou preparar sua parte.
6. Se você pagou os R$ 120, informe esse pagamento em Eu ou use Preencher que paguei o restante à loja.
7. Use Conferir adiantamentos e registrar. Confira forma, data, mês e categoria. A prévia separa sua despesa de R$ 30 dos R$ 45 a receber de cada pessoa.
8. Marque uma devolução apenas se a pessoa já devolveu o dinheiro. Receber da pessoa não quita o cartão, e pagar a fatura não confirma o recebimento.

No modo rápido convertido em detalhado, confira os consumidores dos itens. Se você bebeu, troque uma das pessoas marcadas no item Bebida por Eu, mantendo o grupo correto.

## Vistoria e validação

Foram identificados e tratados riscos de sobrescrever rascunhos, enviar uma prévia antiga, preencher a parte alheia como despesa pessoal, perder consumidores selecionados e presumir pagamentos inexistentes. O registro conjunto continua recalculado pelo backend e mantém o envio protegido existente.

- 27 testes novos e 225 testes na suíte completa: todos aprovados.
- Testes locais com dados fictícios, sem planilha ou contas reais.
- Estilos compilados e interfaces do Apps Script e dist/ sincronizadas.
- Cache do app v29; protocolo do backend permanece 7.
- Nenhuma publicação foi realizada nesta edição. A aparência final ainda deve ser conferida no app, especialmente no celular.

Para publicar, atualize a interface do Apps Script com Backend/Index_para_colar.txt e siga o fluxo habitual de publicação da Vercel. O backend deve continuar na versão 7 do pacote anterior.
