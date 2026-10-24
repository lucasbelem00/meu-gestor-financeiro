# Vistoria consolidada: integridade e uso no celular — 24/10/2026

**Estado atual: os 38 itens do checklist foram implementados e validados localmente.** O resumo das mudanças, decisões, testes e publicação está em [PACOTE_ROTINA_INTEGRIDADE_20261024.md](PACOTE_ROTINA_INTEGRIDADE_20261024.md). Publicar e conferir na cópia de teste continuam sendo etapas separadas.

O texto das vistorias abaixo registra os problemas e propostas encontrados antes da implementação. Menções a pendências e ao comportamento anterior são evidências históricas; o checklist assinalado e o relatório do pacote registram a conclusão atual.

Atualizado após a [vistoria profunda de datas, edição e recebimentos](VISTORIA_PROFUNDA_EDICOES_DATAS_20261024.md): cinco pontos adicionais foram acumulados. O apontamento anterior sobre ponto decimal foi retirado após testar a função final ativa; a seleção ambígua de valores na colagem continua pendente.

Nova rodada acumulada: [configurações, vencimentos e mensagens](VISTORIA_CONFIGURACOES_ALERTAS_PIX_20261024.md), com oito cenários e cinco pontos adicionais: alvo incorreto na edição de categorias, proteção de Outros, aviso de fatura com mês Date, arquivamento e inclusão da chave Pix na prévia.

## Novos pontos confirmados nesta rodada

### 1. A colagem pode escolher um valor diferente do pretendido

O ensaio corrigido da função final ativa reconhece estes formatos:

| Texto colado | Valor preenchido hoje |
|---|---:|
| R$ 150,00 | R$ 150,00 |
| R$ 1.234,56 | R$ 1.234,56 |
| R$ 150.00 | R$ 150,00 |

A afirmação inicial de aumento em cem vezes considerou uma função antiga, substituída mais adiante no arquivo. Ela foi retirada após repetir o teste com a implementação ativa. O formato com ponto decimal não é uma pendência atual.

Permanece reproduzido, também com a função ativa: com R$ 80 já digitados, colar o texto fictício `Saldo: R$ 900,00. Transferência: R$ 25,50.` substituiu o campo por R$ 900, sem perguntar. O extrator usa o primeiro R$ encontrado, sem saber a que o número se refere.

**Proposta:** oferecer o valor como sugestão quando houver múltiplos candidatos ou um valor manual preenchido. Não escolher automaticamente um número ambíguo. Preservar os formatos já aceitos e o preenchimento rápido quando houver um único valor inequívoco e o campo estiver vazio.

Código: [extrator final ativo](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:7023), [leitor geral](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:1627).

### 2. A memória de descrições pode substituir uma escolha manual

No ensaio, o formulário tinha Pix e Lazer escolhidos. A descrição fictícia Pizza tinha uma sugestão anterior de Cartao e Alimentação. Ao sair da descrição, a função atual substituiu os dois seletores pelos valores da memória. A troca de forma também acionou o recálculo do mês da fatura.

O ensaio executou as funções reais de saída da descrição, autopreenchimento e atualização da forma, com dicionário, seletores e cálculo de fechamento fictícios. Ele confirma a substituição e o acionamento do recálculo; não avalia um vencimento real de banco.

**Proposta:** sugestões podem preencher campos ainda vazios ou que continuam sob controle automático. Depois que a pessoa escolher cartão, categoria ou mês, preservar sua decisão. Se desejar reaplicar a memória, oferecer uma ação explícita e compacta, sem acrescentar explicações permanentes ao formulário.

Código: [saída da descrição](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:2958), [sugestões](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:2973), [mês pela forma](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:2883).

### 3. Rascunhos de Novo e Empréstimos dependem da sessão

Os campos são guardados em sessionStorage. Atualizar a página dentro da mesma sessão recuperou os dois formulários no ensaio. Abrir uma nova sessão, compartilhando o mesmo armazenamento persistente mas sem o armazenamento da sessão anterior, não recuperou descrição nem pessoa.

O comportamento de restauração automática de uma sessão encerrada varia entre navegadores. Portanto, não é correto afirmar que qualquer troca de aplicativo ou encerramento de processo perde o rascunho. A limitação confirmada é que não existe uma cópia durável desses dois formulários para uma nova sessão.

Isso se refere ao que ainda não foi enviado. Não foi constatada perda de lançamentos confirmados nem da fila protegida de envios pendentes neste caso.

**Proposta:** cópias locais duráveis, separadas por página, com data e opção Recuperar ou Descartar. Migrar a cópia antiga antes de removê-la. Não usar uma única chave compartilhada que recrie o conflito já encontrado na rachadinha. Evitar restaurar automaticamente um formulário de outra operação já concluída.

Código: [gravação de rascunhos](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:2128), [Novo e Empréstimos](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:6146).

### 4. Limpar apaga um formulário preenchido sem recuperação

As implementações finais de Limpar em Novo e Empréstimos apagaram campos e rascunho de sessão diretamente, sem solicitar confirmação. Na mesma revisão, o controle positivo confirmou que os bloqueios para envios pendentes continuam funcionando.

O risco é o toque acidental durante o preenchimento, especialmente no celular. Não é uma exclusão de registros da planilha.

**Proposta:** confirmar somente quando houver conteúdo relevante, ou oferecer Desfazer limpeza mantendo um retrato recuperável. Campos vazios podem continuar sendo limpos imediatamente. A limpeza automática depois de um envio confirmado deve ser distinguida da ação manual do botão, para não criar uma confirmação desnecessária a cada salvamento.

Código: [implementações finais](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:6689).

## Checklist único implementado

As caixas assinaladas indicam implementação local com testes fictícios. Os critérios de publicação e teste de uso permanecem descritos no relatório do pacote.

### Integridade e confiabilidade

- [x] Impedir duplicação ao excluir uma ocorrência fixa, recarregar e desfazer. Reconfirmado nesta rodada: R$ 90 passaram a R$ 180. Preservar a intenção de pular o mês e conferir série + período antes de restaurar; não apagar automaticamente uma ocorrência substituta que possa ter sido editada ou paga.
- [x] Preservar a identidade da categoria em edição ao remover ou reordenar outras linhas. Foi reproduzida uma atualização de Lazer atingindo Transporte e renomeando os lançamentos do grupo errado.
- [x] Garantir Outros como categoria reservada na interface e no servidor, mantendo nome e existência fixos, posição final e meta editável. O cadeado atual não impede remover e salvar a configuração sem ela.
- [x] Compatibilizar a prévia de restauração com as datas produzidas pelo próprio exportador. Reconfirmados os três casos: data da compra, mês e parcela. A validação atual preservou os originais, mas recusou os backups.
- [x] Evitar a escolha automática de um valor ambíguo na colagem e a substituição de valor manual, conforme o achado 1. O formato com ponto decimal já funciona na implementação ativa.
- [x] Corrigir a sincronização da data digitada de empréstimos: o valor validado, o cálculo da fatura e o payload devem usar a mesma data. Novo caso reproduzido na vistoria profunda: visível 07/09/2026, mas envio e gravação fictícia com 16/10/2026.
- [x] Preservar as escolhas manuais diante do autopreenchimento, conforme o novo achado 2.
- [x] Distinguir recarga recebida de recarga realmente aplicada. Uma resposta antiga descartada não pode ser anunciada como tela atualizada se a consulta vigente falhar.
- [x] Limpar ou reconfirmar o valor preparado quando o usuário trocar cartão ou mês no modal de pagamento. Preservá-lo ao atualizar o mesmo contexto.
- [x] Recuperar corretamente o dia de referência de fixos antigos quando a compra está em uma célula Date e não há metadado explícito de dia. Não adivinhar um dia original que a informação existente não permite conhecer.
- [x] Permitir mudar cartão ou condições de uma recorrência a partir de um mês, sem exigir desfazer pagamentos históricos corretos. Tratar separadamente meses futuros já parcialmente pagos.
- [x] Tornar explícito o efeito da antecipação sobre parcelas parcialmente pagas: mostrar origem, destino, valor, já pago e saldo. Definir se deve bloquear o caso, antecipar somente o saldo ou realocar com confirmação específica. O total pago foi preservado no ensaio, mas sua atribuição ao mês mudou.
- [x] Normalizar meses Date na preparação dos avisos de vencimento de terceiros. Uma fatura de R$ 70 continuou com saldo na consulta bancária, mas perdeu o aviso com esse tipo de célula.

### Rascunhos e prevenção de enganos

- [x] Separar os rascunhos da rachadinha por página e oferecer recuperação de versões, preservando a chave antiga durante a migração.
- [x] Guardar Novo e Empréstimos de forma durável e sem sobrescrita entre páginas, conforme o novo achado 3.
- [x] Proteger a limpeza manual de formulários preenchidos, conforme o novo achado 4.
- [x] Proteger alterações relevantes ainda não salvas nos editores ao cancelar/fechar, sem confirmar janelas sem mudanças. É uma melhoria de prevenção de enganos, não uma gravação incorreta demonstrada.
- [x] Vincular respostas de edição à abertura original do editor. O sucesso de um envio antigo não pode fechar uma janela que já esteja editando outro empréstimo.
- [x] Distinguir nas ações de fixos: excluir registro, pular um período e encerrar recorrência. Cada ação deve mostrar seu alcance antes de confirmar.
- [x] Explicitar, também na confirmação individual de recebimento no cartão, que receber da pessoa não registra pagamento ao banco. A confirmação em lote já contém essa distinção.

### Consulta diária, sobretudo no celular

- [x] Restaurar os controles de recebimento parcial e Mover para Pessoal após sucesso confirmado. Hoje eles permanecem desativados ao reabrir o editor; resultados incertos precisam continuar protegidos.
- [x] Mostrar a distribuição exata dos centavos nas prévias de parcelas de Novo e Empréstimos, em vez de anunciar parcelas iguais quando uma delas difere por um centavo. A gravação de R$ 100 em três parcelas preservou o total no ensaio.
- [x] Distinguir exclusão e arquivamento de cartões na confirmação, no resultado e na listagem. Oferecer consulta de arquivados e reativação dentro da gestão existente, preservando faturas e histórico.
- [x] Manter a opção Incluir Pix coerente com a mensagem final mesmo após editar o bloco gerado; separar sua composição do corpo manual ou orientar a revisão quando não for possível removê-lo com segurança.

- [x] Em Recebidos, destacar o valor recebido e usar Compartilhar resumo; em A Receber, destacar saldo e cobrança; em Todos, separar os dois valores. O gerador de mensagem já distingue o recebimento; a inconsistência encontrada está no resumo e no rótulo do botão.
- [x] Quando A Receber ficar vazio após um recebimento, explicar que não há pendências para aqueles filtros e oferecer Ver recebidos, preservando os outros filtros.
- [x] Simplificar os filtros de situação do Mensal para Não pagos, Parciais e Quitados. Preservar soma, combinação entre categorias/formas/tags e Limpar filtros.
- [x] Ordenar as parcelas de Empréstimos pelo mês crescente, com critérios estáveis para empates; não inverter toda a lista.
- [x] Dar nomes acessíveis aos seletores de mês e ano do Mensal, sem aumentar o espaço visual.
- [x] Em Empréstimos, facilitar a alternância entre Consultar e Novo empréstimo, evitando atravessar o formulário completo para consultar dívidas. Preservar os atalhos existentes para cadastro.
- [x] Tornar Registrar pagamento da fatura e Registrar recebimento fáceis de encontrar no Painel. Reposicionar as ações existentes antes de criar cópias em vários lugares.
- [x] Oferecer Registrar recebimento com opção integral ou parcial, em vez de depender de descobrir o pagamento parcial dentro de Editar. Mostrar pessoa, parcela, valor recebido agora e saldo após o recebimento numa prévia curta.
- [x] Identificar o mês e o escopo dos indicadores do Painel; distinguir registrado, previsto, saldo bancário e valor a receber sem deixar a pessoa deduzir as regras pelas cores.
- [x] Recolher a explicação longa do Horizonte em Entenda os valores e mostrar um intervalo curto dos meses exibidos. Manter os detalhes acessíveis por toque.
- [x] Mostrar filtros ativos e uma ação clara de limpeza nos resultados vazios. Rever seletores estreitos que cortam pessoa, forma ou situação no celular.
- [x] Corrigir o texto de ajuda de transferência de Novo para Empréstimos, que ainda menciona apenas cartão e também deve explicar o Pix.
- [x] Normalizar a exibição de datas extensas em eventos antigos de Atividade, sem reescrever o diário original nem alterar sua prova de integridade. Os novos resumos já receberam a correção de datas.

### Melhoria adicional proposta, sem ampliar as abas

- [x] Avaliar uma data combinada de devolução, opcional e separada do vencimento do banco. Ela permitiria organizar cobranças; não interpretar observações livres como uma data prometida. Esta é uma funcionalidade nova proposta, não um defeito de cálculo demonstrado.

## Critérios para considerar o pacote pronto

1. Transformar cada reprodução de defeito em uma regressão que exija o comportamento corrigido. Os ensaios de auditoria atuais verificam o problema observado e não provam que ele foi resolvido.
2. Testar conjuntamente excluir/recarregar/desfazer, pagamentos parciais, troca de cartão futuro e antecipação; conferir total, IDs e histórico antes/depois.
3. Conferir exportar → prévia sem modificar o arquivo exportado, com células de texto e Date. Não executar restauração real sobre a planilha de uso para testar.
4. Verificar no navegador, com dados fictícios e larguras de celular: colagem, escolhas manuais, retomada de rascunhos, limpeza, filtros, estados vazios e caminhos de pagamento/recebimento. Incluir teclado e nomes acessíveis.
5. Rodar a suíte adequada após implementar, compilar e sincronizar as cópias da interface, conferir a publicação e testar na cópia de teste antes da versão definitiva.
6. Cobrir edição em sequência, resposta atrasada de outro registro, segundo recebimento parcial na mesma página e igualdade entre a data visível e a gravada. Aplicar os ajustes finais ativos do arquivo nos ensaios, evitando testar apenas uma definição antiga substituída depois.
7. Verificar edição de categoria após remoção de outra, invariantes de Outros, arquivamento e reativação, avisos de terceiros com mês texto/Date e o texto efetivamente copiado com Pix marcado/desmarcado antes e depois de editar a prévia.

## O que permanece preservado

- As cinco abas principais e as cores conhecidas: pessoal, terceiros e quitação.
- Pagamento ao banco e recebimento da pessoa independentes, mesmo quando acontecem em ordens diferentes.
- Não marcar uma fatura como paga apenas porque venceu.
- Pix imediato por padrão, com parcelamento explícito quando necessário; sem criar formas redundantes de boleto ou débito.
- Ampliação da restauração completa e reorganização maior de desempenho continuam separadas. Corrigir a compatibilidade do backup existente não significa antecipar a expansão adiada.
- Não arquivar o diário apagando identificadores de operações confirmadas ou canceladas.

## Evidências, continuidade e limites

Relatórios anteriores com as causas, reproduções e limites de cada conjunto:

- [Recebimentos, filtros e recarga concorrente](VISTORIA_RECEBIMENTOS_FILTROS_20261024.md).
- [Rascunho da rachadinha e intervalo do Horizonte](AJUSTES_HORIZONTE_PESSOAS_20261024.md).
- [Uso diário, pagamento, acessibilidade e backup](VISTORIA_USABILIDADE_E_RECUPERACAO_20261024.md).
- [Fixos, desfazer e antecipação](VISTORIA_ROTINA_FIXOS_ANTECIPACAO_20261024.md).
- [Datas digitadas, ciclo dos botões, respostas atrasadas e prévias de parcelas](VISTORIA_PROFUNDA_EDICOES_DATAS_20261024.md).
- [Configurações, vencimentos e inclusão de Pix nas mensagens](VISTORIA_CONFIGURACOES_ALERTAS_PIX_20261024.md).

Na rodada inicial foram executados seis cenários direcionados, incluindo controles: colagem numérica, texto com mais de um valor, autopreenchimento, sessão de rascunhos, limpeza e bloqueio da limpeza pendente. Também foram repetidos os sete cenários de fixos/antecipação e os três casos de backup. Na rodada profunda seguinte, nove cenários adicionais foram executados e os seis primeiros foram repetidos com a função ativa de colagem. O falso positivo do ponto decimal foi retirado. Os defeitos restantes foram reproduzidos; isso não significa que passaram a funcionar corretamente.

Na rodada de configurações e mensagens, oito cenários adicionais foram executados. Os casos de renomeação incorreta e remoção de Outros passaram pela gravação no backend em memória; o aviso foi comparado com o saldo da fatura. As demais pendências anteriores continuam abertas.

Ensaio novo: [script](C:/Users/lucas/Documents/Codex/vistoria-preenchimento-mobile-20261024.cjs) e [resultado](C:/Users/lucas/Documents/Codex/vistoria-preenchimento-mobile-20261024.log). Ele extrai as funções da interface atual e usa DOM, dados e armazenamento fictícios em memória, sem rede. Os ensaios de backend também usam somente planilhas fictícias.

Não houve nova conferência visual em um aparelho físico nestas rodadas. As propostas de disposição móvel se apoiam na inspeção e nas evidências de navegador registradas na vistoria anterior; precisam de validação visual depois de implementadas. Nas primeiras rodadas, a suíte completa não foi repetida. Na rodada de configurações, ela foi executada: 239 testes aprovados, zero falhas. Os novos cenários reproduzidos ainda precisam se tornar regressões que exijam o comportamento correto. Nenhum código funcional, dado real, configuração de implantação ou publicação foi alterado.
