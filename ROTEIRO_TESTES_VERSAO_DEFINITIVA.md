# Roteiro para liberar o Gestor de Gastos definitivo

Preparado em 30/10/2026. Pacote local: protocolo 17, cache v69.

Use as caixas para anotar o resultado real. Elas estão desmarcadas porque os testes locais automatizados não substituem os passos na sua conta. Faça primeiro na **Cópia de Gestor de Gastos**; restauração e ensaio de virada usam uma cópia separada, descartável. Não precisa testar tudo de uma vez: siga a ordem e registre onde parou.

## 1. Preparar o teste

- [ ] Baixar e guardar um backup JSON completo e confirmar que o arquivo abre e não está vazio. Guardar também uma cópia da planilha anterior à atualização.
- [ ] Confirmar que o projeto Apps Script de teste aponta, pela propriedade `GESTOR_PLANILHA_ID`, para a **Cópia de Gestor de Gastos**, e não para a definitiva.
- [ ] Atualizar `Backend/Code.gs` e os HTMLs distribuídos, publicar a nova versão do Apps Script e atualizar a interface no endereço de testes usado pelo app. Não copiar tokens, IDs nem gatilhos de teste para a definitiva.
- [ ] Atualizar o app instalado e conferir uma mudança visível: o botão **Copiar texto** no campo de Notas. Ele diferencia este pacote do anterior.
- [ ] Em Atividade e sincronização, conferir se há envios pendentes antes de iniciar. Resolver a confirmação pelo próprio app; não limpar o armazenamento do navegador para esconder uma pendência.

Anote um cartão e uma categoria usados apenas no teste. Se usar um cartão que já tem dados, anote o saldo anterior e compare os aumentos descritos abaixo.

## 2. Cadastro, parcelas e Pix

| Fazer | Resultado esperado |
| --- | --- |
| [ ] Cadastrar `TESTE — pessoal` de R$ 100 no cartão, uma parcela | Uma compra, R$ 100 na competência escolhida, ⚡ À vista e saldo bancário aumentado em R$ 100 |
| [ ] Cadastrar `TESTE — Pix` de R$ 10, uma parcela | Pagamento imediato no mês, sem virar saldo bancário de cartão |
| [ ] Cadastrar `TESTE — parcelas` de R$ 100 em 3x | Valores somam exatamente R$ 100, incluindo o ajuste dos centavos, nos três meses corretos |
| [ ] Editar apenas descrição/categoria/tags de um registro | Valor, competência e pagamento não mudam por esse motivo |
| [ ] Tentar data impossível e ano como 2926 | App recusa e preserva os campos para correção, sem criar registro |

Recarregue o app e confira esses registros também na planilha. Não deve existir um segundo registro só por atualizar a página.

## 3. Pagamento ao banco e recebimento de terceiros — teste principal

Use uma competência de teste sem outros gastos, ou compare sempre a diferença em relação aos valores anteriores. A compra parcelada do passo anterior deve ficar em outro cartão/período para não entrar nesta conta.

1. [ ] Na mesma fatura da compra pessoal de R$ 100, cadastrar empréstimo `TESTE — pessoa` de R$ 40, uma parcela, ainda **A receber**.
2. [ ] Abrir **Conferir fatura**. O aumento do total deve ser **R$ 140**: R$ 100 pessoais e R$ 40 de terceiros. Não deve zerar só porque o gasto é de outra pessoa.
3. [ ] Registrar **R$ 50** pagos ao banco. Na fatura de teste, deve restar **R$ 90**. Conferir a distribuição exibida antes de confirmar; uma baixa parcial não significa que todos os itens ficaram quitados.
4. [ ] Registrar os **R$ 90 restantes**. O saldo bancário deve zerar e aparecer quitado. O valor gasto continua no total do mês/Horizonte.
5. [ ] Abrir Empréstimos. A pessoa ainda deve **R$ 40**, pois pagar ao banco não significa receber dela.
6. [ ] Registrar **R$ 15 recebidos**. Devem continuar **R$ 25 a receber**; o banco continua quitado.
7. [ ] Registrar os **R$ 25 restantes**. A cobrança fica recebida, mas continua no histórico daquele mês.
8. [ ] Em outro empréstimo de teste, fazer a ordem inversa: receber da pessoa antes de pagar a fatura. O recebimento não deve quitar o banco.

Se uma gravação ficar sem confirmação, não cadastrar de novo com outra identificação. Consultar a confirmação em Atividade e conferir a planilha. Se continuar divergente, copiar o diagnóstico e anotar o horário, cartão/mês e o que foi feito.

## 4. Fixos, filtros, Painel e Agenda

- [ ] Criar um fixo de teste no cartão e outro no Pix. Conferir competência, situação e valor pago conforme a forma. Recarregar duas vezes: não pode duplicar a ocorrência.
- [ ] Conferir a próxima competência que já tenha outro registro: a ocorrência fixa deve respeitar a regra existente; não deve criar meses indefinidamente só por abrir a tela.
- [ ] Programar alteração futura de valor e categoria. A legenda deve informar o período e somente o que mudou.
- [ ] Na Mensal, combinar uma categoria, uma tag, uma forma e uma situação. Comparar a quantidade e a soma com os registros exibidos. O X do resumo azul limpa a combinação inteira.
- [ ] Sair da Mensal, abrir outro lugar e voltar: deve selecionar o mês vigente, sem depender de todos os cartões estarem pagos.
- [ ] No computador, gráfico à esquerda e Horizonte à direita; no celular, Horizonte e gráfico empilhados, sem apertar a tabela para caberem juntos.
- [ ] Dar uma data combinada de devolução diferente da competência da fatura. A Agenda deve colocar a devolução na data combinada e a fatura no vencimento do cartão.
- [ ] Marcar o empréstimo como recebido e quitar a fatura. Após atualizar os dados, os compromissos correspondentes devem sair da Agenda. Os históricos permanecem.
- [ ] Remover a data combinada de outro empréstimo. Ele continua a receber, mas não pode virar um atraso sem data na Agenda.
- [ ] Trocar mês, tipo e dia na Agenda. Ano inválido deve limpar os resultados anteriores e pedir uma competência válida.

## 5. Ferramentas e celular

- [ ] Notas: escrever duas linhas e tocar **Copiar texto**, sem adicionar. Colar em outro campo: texto e quebras iguais, sem criar nota. Depois adicionar a nota e testar seu **Copiar** na lista.
- [ ] Editar uma nota salva e copiar antes de salvar: **Copiar texto** leva a edição; **Copiar** na lista leva o conteúdo já adicionado. Cancelar a edição deve preservar a nota salva.
- [ ] Calculadora: copiar zero, valor negativo e valor decimal. Expressão incompleta não deve copiar resultado antigo.
- [ ] Rachadinha: R$ 100 para duas pessoas iguais → R$ 50 para cada; depois conferir um caso por itens e outro em que você adiantou o total. Quem pagou ao estabelecimento e quem ainda deve a quem devem ficar claros na prévia.
- [ ] Preencher minha parte sem duplicar o registro. A descrição não deve receber “(minha parte)”. Conferir os centavos e o aviso antes de substituir campos preenchidos.
- [ ] Simulador: conferir total e parcelas, prévia editável e cópia para WhatsApp. Simular não pode criar compra sem a ação explícita de preencher/gravar.
- [ ] Abrir o Menu e voltar pelo botão/gesto do celular: fecha o Menu. Reabrir deve destacar a página ou ferramenta atual.
- [ ] Conferir botões com o teclado aberto, voltar ao topo, busca e filtros no celular. Nada deve ficar inacessível atrás da navegação.

## 6. Sincronização e recuperação

- [ ] Abrir a cópia de testes no computador e celular. Gravar um item simples no primeiro e atualizar o segundo: deve aparecer uma vez, com o mesmo valor.
- [ ] Abrir uma edição no computador, alterar o mesmo item no celular e tentar salvar a edição antiga: o conflito deve ser informado, sem substituir silenciosamente a alteração mais nova.
- [ ] Ficar sem conexão antes de enviar um cadastro de teste. Conferir a pendência; reconectar e seguir a ação protegida do app. O resultado final deve ter somente uma compra, inclusive se o envio for repetido pelo fluxo protegido.
- [ ] Em caso de resposta perdida depois de gravar, conferir a confirmação antes de tentar outra compra. O app deve distinguir “sem confirmação” de “não gravou”. Não é necessário provocar queda da conexão se não for possível controlar esse teste com segurança; registre como não testado.

## 7. Organização anual, backup, PDF e restauração

- [ ] Em Exportar dados e backup, conferir **Proteção automática: ativada**, **Organização anual: ativada** e **PDFs automáticos: ativados**. O nome da base de controle deve ser o de testes.
- [ ] Executar a rotina existente `rotinaProtecaoProgramadaGestor` no projeto de testes para conferir a apresentação anual agora. Ela também faz a manutenção habitual: não é uma função apenas de formatação. Não é necessário criar outro gatilho.
- [ ] Abrir a pasta de backups e verificar os arquivos gerados, as datas e o período. A rotina deve completar sem aviso pendente; a geração pode ocorrer em etapas. Clicar em atualizar situação para acompanhar.
- [ ] Abrir a base anual e conferir doze meses do ano correto, cabeçalhos e totais. Nenhuma fórmula pode apresentar erro. Comparar uma competência com a Mensal e Empréstimos; ano fechado compara o retrato do fechamento, pois movimentos posteriores ficam no webapp.
- [ ] Criar compra de teste em duas parcelas começando em dezembro. Confirmar uma parcela no ano inicial e outra em janeiro do ano seguinte, sem duplicação e acessíveis pelo mesmo app. Não alterar o relógio nem o ID do controle para isso.
- [ ] Conferir PDF de um mês concluído e PDF anual de um ano concluído disponível. Abrir o arquivo e comparar período, total, situações e data da geração com o relatório correspondente. PDFs automáticos de períodos concluídos não significam um PDF completo de todo mês futuro.
- [ ] Baixar JSON completo e **restaurá-lo somente numa outra cópia descartável**, com projeto/configuração apontando para ela. Conferir a prévia, contagens, totais, anos, notas, cadastros e ajustes posteriores ao fechamento. Confirmar a restauração só nessa cópia.
- [ ] Depois de restaurar, consultar os anos pelo app e conferir que a cópia não depende dos arquivos anuais da base original para recuperar seus registros.

Não é possível provar a passagem real do tempo só clicando nas abas. A virada e o fechamento devem ser ensaiados com cenários fictícios no ambiente de testes; a primeira execução agendada real também precisa ser acompanhada. Até lá, anote essa parte como ainda não validada na conta.

## 8. Liberar a definitiva

Só avançar quando os testes essenciais acima estiverem aprovados, sem divergência de totais ou pendência desconhecida. Guardar uma lista do que ainda não foi testado.

1. [ ] Fazer backup completo da **Gestor de Gastos** definitiva e guardar a versão anterior do código/implantação para retorno.
2. [ ] Atualizar código e interface no ambiente definitivo, preservando seu próprio ID, token, endereço e configuração de acesso. Conferir o guia `SEGURANCA_VERCEL.md`; a proteção da branch de teste não comprova proteção do endereço definitivo.
3. [ ] Confirmar no app o nome da base definitiva e os estados de proteção/organização/PDF. Conferir permissões no projeto correto. Gatilhos pertencem ao projeto e à conta que os instalou; não presumir que a cópia transportou isso.
4. [ ] Fazer consultas de Histórico, Mensal e Agenda e comparar um mês conhecido com a planilha. Não levar os lançamentos fictícios para a definitiva.
5. [ ] Fazer o primeiro lançamento real da rotina, conferir sua gravação única e atualizar no outro aparelho.
6. [ ] Acompanhar a primeira rotina agendada, o primeiro backup mensal e o fechamento anual quando ocorrerem. Registrar erro/diagnóstico antes de qualquer tentativa de correção manual.

Se aparecer divergência financeira, duplicação, perda de notas, fórmula com erro ou recuperação que não conclui, a versão ainda não está liberada. Voltar ao ponto do teste que falhou e corrigir na cópia antes de continuar.

## Sugestões de Menu para discutir

**Prioridade sugerida: Metas de reserva ou compra.** Exemplo: “Reserva de emergência — R$ 500 de R$ 2.000”. Teria objetivo, prazo opcional e progresso informado por você, claramente separado do limite de gastos e sem fingir conhecer o saldo bancário. Complementa a Agenda: uma planeja datas, a outra acompanha um objetivo.

**Outra possibilidade: Lista de compras planejadas.** Descrição, estimativa e prioridade; abrir o simulador a partir de um item e dar baixa somente quando você registrar a compra. Só vale acrescentar se você costuma guardar essas intenções nas Notas. Não deve duplicar o simulador nem gerar lançamentos automaticamente.

Estas são propostas; nenhuma ferramenta adicional foi criada nesta revisão.

## O que já foi conferido no código deste ajuste

- **682 testes locais passaram, zero falhas.** As caixas acima continuam desmarcadas para a conferência da implantação real.
- Copiar no editor lê o texto atual, preserva as linhas, recusa campo vazio e não modifica a nota salva. Na prévia do navegador, a área de transferência recebeu as duas linhas fictícias e a lista continuou com zero notas; nenhuma chamada de salvamento foi feita.
- Período inválido na Agenda agora remove os compromissos antigos e desativa a navegação até a correção do período.
- Prévia local com dados fictícios: gráfico à esquerda do Horizonte no computador, mesma altura de início; no celular, Horizonte antes do gráfico. Sem rolagem horizontal nos tamanhos observados e sem erros/avisos de console no fluxo de cópia.
- Build, espelhos da interface e módulos incorporados conferidos. Não houve publicação, alteração do backend financeiro ou escrita nas planilhas reais neste ajuste. Os novos controles não exigem função manual de ativação.
