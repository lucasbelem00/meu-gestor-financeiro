# Auditoria profunda do Gestor de Gastos — 01/11/2026

## Escopo e situação

Revisão local dos módulos de interface, API/proxy, datas e regras do servidor, contratos das ações, notas/planejamento, exportação/backup/organização anual e PWA. Nenhuma consulta ou gravação de dados reais, implantação ou transferência de ambiente foi realizada. Testes usam fixtures e relógios controlados; não representam tempos nem permissões da conta Google real.

A base de entrada passou em 758 testes. Novos testes reproduziram quatro falhas antes da correção, mostrando que a cobertura anterior não abrangia todos esses casos. Este relatório descreve as correções desta rodada; não é uma garantia de ausência de falhas em qualquer cenário.

## Achados corrigidos

| Prioridade | Problema confirmado | Resultado |
| --- | --- | --- |
| Alta | Confirmações antigas no Planejamento podiam descartar campos digitados depois de abrir a confirmação | A confirmação agora pertence à versão da lista, à época da restauração e aos campos apresentados; alterações posteriores são preservadas |
| Alta | Respostas de leitura/salvamento do Planejamento podiam preencher a tela após uma restauração | Respostas de outra época são descartadas e a interface orienta consultar novamente; o diário financeiro permanece responsável pela gravação |
| Média | Leitores de datas usavam parseInt e aceitavam texto extra; dias impossíveis eram normalizados para outro mês | Leitura exige uma data completa e existente, mantém datas nativas e o intervalo 1900–2200; não corrige nem regrava células silenciosamente |
| Média | Algumas rotinas confundiam timestamps anteriores a 1970 com competências inválidas | A validade é verificada pelo mês validado, sem depender do sinal do timestamp; resumo de parcelas e referência de recorrência preservam anos históricos |
| Média | Preferência local de limite nula, negativa, fracionada ou inválida podia causar erro/resultado incoerente | Configuração é normalizada; centavos precisam ser inteiros positivos e a inclusão de previsões exige true. Configuração inválida mostra limite não definido |
| Média | Mudança de descrição/data combinada separava o fragmento já recebido na mensagem de cobrança | Reconhecimento usa compra, pessoa, forma, parcela e competência. Texto e data não fazem parte da identidade. O total cobrado continua sendo apenas o saldo |
| Média | Reconexão no mesmo dia não retomava necessariamente uma consulta inicial falha | Evento online pode revalidar quando há aviso de consulta desatualizada, respeitando tela permitida, ausência de modal, consulta em andamento e intervalo entre tentativas |
| Baixa | Ao chegar a 12 produtos, o comparador deixava de adicionar sem indicar a razão | Botão passa a indicar o limite e fica desativado; remover produto o reabilita. Chamada direta também informa a razão |

Editar novamente o mesmo item do Planejamento apenas foca o campo, preservando o texto atual. A orientação do limite sem configuração foi atualizada para o novo local do editor. O texto de ajuda do Horizonte passou a indicar o toque no valor, inclusive no celular.

## Código removido ou consolidado

- Seis variáveis de escape dos gráficos/relatórios sem referências; as ações atuais usam acaoHTML e escaparHTML.
- Leitor diaDevolucaoPainelGestor sem uso na aplicação; Agenda e Painel já usam o módulo situacoes.
- Variáveis originais de edição de empréstimo sem referências, lista de índices não consumida e uma busca duplicada de compra. O grupo continua sendo validado antes de qualquer alteração.
- Expressão redundante que selecionava sempre a coluna 1.

Foram mantidos os caminhos de compatibilidade usados por backups antigos, arquivos anuais e rascunhos. A repetição dos módulos nos HTMLs de distribuição é gerada pelo build, não uma implementação independente para apagar.

## Evidência automatizada

- Datas: tests/competencia-anual-datas-20261028.test.cjs.
- Confirmações, leitura e salvamento através de restauração: tests/planejamento-ui-31.test.cjs.
- Preferência de limite: tests/conferencia-resumida-painel.test.cjs.
- Identidade de recebimento parcial: tests/compartilhamento-mobile.test.cjs.
- Reconexão e limite de opções: tests/correcoes-auditoria-20261101.test.cjs.

A primeira validação completa desta rodada passou em 768 testes. Após o acréscimo do tratamento de Voltar nos modais, a suíte completa foi executada novamente; o resultado final fica abaixo.

## Antes do uso definitivo

O proxy api/gestor.js recusa intencionalmente VERCEL_ENV=production com 404. Essa proteção foi preservada: a publicação definitiva precisa de uma decisão explícita sobre o endereço e a proteção de acesso antes de liberar a planilha real. Renomear ou trocar a planilha não resolve esse bloqueio.

Na cópia de testes, conferir: consulta sem internet e reconexão; cadastro/edição com pagamento parcial; cobrança após corrigir descrição/data; Planejamento com confirmação antiga; limite e comparação de fatura. Organização anual, restauração e PDFs precisam ser validados na conta Google e em cópia descartável antes da transferência; os mocks não validam permissões, quotas ou aparência real do Drive.

## Melhorias úteis para discutir

1. Filtro para ocultar itens concluídos no Planejamento, sem apagar o histórico das metas.
2. Ordenação do Planejamento por prazo e prioridade, para destacar o que merece atenção primeiro.

Nenhuma nova ferramenta foi acrescentada só para preencher espaço no menu.

## Acréscimo solicitado: Voltar nos modais

`interface/modais.js` coordena entradas temporárias do histórico para a Central, Conferir fatura, editores, filtros, exportação, prévia Pix, confirmações e cópia manual. Voltar fecha somente a camada superior; editores alterados usam a confirmação de descarte existente. Cancelar essa confirmação mantém os campos. Fechar pelo X e trocar Menu → modal consomem as entradas em sequência, sem fechar por engano o modal novo. Fechar fatura invalida a consulta em andamento e não confirma pagamento. Avançar não reabre editores ou confirmações já encerrados. As confirmações aparecem acima da prévia de cobrança.

O controle anterior exclusivo da Central foi substituído pelo controle compartilhado; os testes do menu foram preservados e estendidos. A execução usa os mesmos fechamentos e proteções existentes; não altera registros ou envios em andamento. tests/modais-voltar-20261101.test.cjs testa histórico, camadas, descarte, troca rápida e o fechamento real da fatura pela observação da interface. A validação automatizada não substitui o teste do botão físico no Android instalado.

## Resultado final

777 testes automatizados passaram, sem falhas, após a integração do Voltar nos modais. Os 12 scripts da página, o servidor e o Service Worker passaram na verificação de sintaxe; módulos incorporados, três HTMLs e distribuição local foram conferidos como idênticos. Não há IDs estáticos duplicados. git diff --check passou.

A medição local com 100 e 1.000 registros fictícios também terminou: com 1.000 registros, carga repetida levou 816 ms e relatório mensal 757 ms, sem acrescentar linhas ao diário nessas leituras repetidas. São tempos do mock nesta máquina, sem rede, Google Sheets ou geração real de PDFs; não demonstram o tempo no celular ou na implantação. A primeira leitura pode fazer a manutenção inicial prevista pelo contrato. Nenhuma validação financeira foi retirada para reduzir esse tempo.

Para publicar as correções de datas e relatórios, atualizar também Backend/Code.gs e a implantação do Apps Script, além da interface. Não há função nova de ativação obrigatória para este pacote. O pacote permanece local, sem commit, push ou implantação remota nesta rodada.
