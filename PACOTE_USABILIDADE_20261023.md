# Pacote de usabilidade — 23/10/2026

## O que mudou

- [x] Horizonte com Total do mês como padrão e A pagar como alternativa. A escolha fica neste aparelho.
- [x] Valores quitados em verde, indicação de pagamento parcial e de estimativas de fixos.
- [x] Faturas pagas permanecem no total registrado; navegação preserva o mês consultado.
- [x] Cartões incluem a fatura bancária pessoal + terceiros, inclusive cartão usado somente por terceiros.
- [x] Total Carteira continua com sua parte nos cartões; Fatura Real inclui terceiros nos cartões; Terceiros mostra somente o saldo a receber.
- [x] Fixos só são projetados em meses já existentes por registros. Não há criação de uma sequência adicional de meses nem de novas linhas na planilha por essa projeção.
- [x] Simulador distribui os centavos como o registro, valida parcelas inteiras de 1 a 600 e permite abrir todas as parcelas.
- [x] Projeção do simulador usa saldo bancário pessoal + terceiros e destaca estimativas existentes de fixos.
- [x] Simulador tem data da compra, preço à vista opcional, data da base e ressalva sobre o limite atual.
- [x] Transferência da simulação protege rascunhos e envios pendentes; a parcela inicial começa em 1.
- [x] Calculadora inicia nova conta ao digitar após igual; mantém precisão intermediária.
- [x] Calculadora tem 20 contas recentes locais, copiar, reutilizar, reabrir e limpar com confirmação.
- [x] Percentual matemático explicado; atalhos separados de desconto e acréscimo.
- [x] Notas: editar com conferência de versão, buscar, filtrar, fixar neste aparelho e confirmar exclusão.
- [x] Texto da nota em elaboração fica como rascunho nesta aba, separado das notas já adicionadas.
- [x] Aviso de conflito de notas informa a conferência manual necessária.
- [x] Mensal sugere próximo mês existente quando todos os cartões ativos estão fechados para compras regulares e quitados no período.
- [x] Avanço ao reabrir é opcional, começa desligado e pausa ao escolher um mês manualmente. Pagamentos e recargas não trocam o mês.
- [x] CSS recompilado, interfaces do Apps Script e arquivos estáticos sincronizados; cache do app v27.

## Publicação

Atualizar Backend/Code.gs e Backend/Index_para_colar.txt no projeto de testes do Apps Script e criar uma nova versão da implantação. Publicar o frontend pelo fluxo habitual da Vercel. Não houve publicação nem acesso à planilha real nesta edição.

## Conferência manual sugerida

1. Cartão com R$ 100 pessoais + R$ 70 de terceiros: Total Carteira 100, Fatura Real 170, cartão 170. Pagar ao banco não recebe os 70 da pessoa.
2. Após quitar: Total do mês mantém os valores em verde; A pagar apresenta zero. Terceiros continua 70 até o recebimento.
3. Navegar no Horizonte e atualizar os dados: o mês inicial consultado permanece.
4. Criar somente um fixo: nenhum mês extra. Adicionar outro registro em um mês futuro: o fixo aparece ali como previsto, sem criar outro lançamento.
5. Simular R$ 100 em 3 vezes: 33,34 + 33,33 + 33,33. Quantidade fracionária é recusada; mais de seis parcelas podem ser expandidas.
6. Transferir simulação com rascunho preenchido: exige confirmação e não mantém pessoa, descrição ou parcela inicial antigas. Conferir data e cartão antes de salvar.
7. Calculadora: 2+2= e depois 5 inicia 5. 1/3= seguido de *3 resulta em 1 na exibição monetária. Desconto de 10% sobre 100 resulta em 90.
8. Notas: editar, pesquisar, concluir, fixar, confirmar exclusão e atualizar a página com um texto ainda não adicionado.
9. Mensal: testar sugestão e preferência opcional. Uma fatura antecipadamente paga, mas ainda aberta para compras, não habilita avanço. Escolha manual pausa o automático.

## Limites da entrega

Compilação e análise sintática realizadas. A suíte de testes e a validação visual em navegador/celular não foram executadas nesta rodada. A fixação de notas e o histórico da calculadora são locais. O rascunho da nota fica na sessão da aba; as notas adicionadas continuam usando a sincronização protegida existente.
