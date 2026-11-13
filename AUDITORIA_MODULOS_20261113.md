# Revisão por módulos — 13/11/2026

Base local: v208, protocolo 19. Revisão estática dos caminhos principais, fontes modulares, integração e diagnósticos reais recentes. Não é prova de ausência de bugs nem auditoria de acesso na publicação. Nenhuma regra financeira foi alterada nesta revisão.

## Parecer

O projeto possui boas proteções transacionais, mas a organização acumulou camadas e responsabilidades amplas. Não está correto chamá-lo de totalmente otimizado ou sem redundâncias. A lentidão observada se concentra no servidor e nos acessos ao Sheets; tamanho e complexidade da interface são problemas de manutenção e carregamento, mas não explicam sozinhos salvamentos de vinte segundos.

## 1. Segurança, API e operações protegidas

Fontes: api/gestor.js, shared/acoes.js, doPost/executarAcaoApi_/executarOperacaoGestor_ em Backend/Code.gs.

Há catálogo permitido, tamanho máximo de pedido, destino HTTPS restrito, token mantido no proxy/servidor e confirmação recuperável por requestId. O proxy não autentica o usuário por conta própria: depende da proteção do ambiente Vercel indicada na configuração/documentação. Esta revisão não verificou a implantação nem realizou ataque/teste anônimo. Não há evidência nova de acesso indevido; também não cabe declarar a publicação blindada.

Melhoria: manter uma matriz explícita de autorização e efeitos por ação, verificando coerência entre catálogo e roteador. Não remover validação backend por existir validação na tela. Impacto direto esperado na velocidade: baixo.

## 2. Sincronização, fila offline e PWA

Fontes: interface/desempenho.js, sincronizacao.js, envios.js, rotina.js, sw.js, API raiz em index.html.

Coordenador, invalidação, fila recuperável, distinção entre resultado incerto e falha e snapshot confirmado são proteções úteis. Há sete atribuições a window.apiCall e oito a window.setAba no HTML gerado: são envoltórios encadeados, não sete chamadas de rede obrigatórias. Mesmo assim, a ordem de instalação virou dependência implícita. Atualizar uma camada sem conhecer as outras pode repetir invalidações ou consultas e mudar bloqueios.

Prioridade alta de manutenção: substituir gradualmente o encadeamento por uma entrada única de API e eventos de navegação/mutação com ordem documentada. Primeiro mapear e testar equivalência; não reescrever tudo de uma vez. Ganho de velocidade depende de demonstrar trabalho repetido, não de contar envoltórios.

## 3. Lançamentos pessoais, recorrências e cálculos

Fontes: editarLancamentoLinhaWebInterno_, organizarEAtualizarPlanilha e processarAssinaturasAutomaticas; shared/recorrencias.js, pular-fixo.js e retomar-fixo.js.

Identidade, versão, pagamentos, centavos e plano recuperável protegem operações sensíveis. Algumas alterações pequenas continuam lendo, normalizando e ordenando o conjunto financeiro virtual. Isso gera trabalho proporcional ao histórico; parte ocorre em memória, parte depende da leitura anual anterior.

Também coexistem séries baseadas em parcelas ∞/∞ e modelos de recorrência. Não são duplicatas descartáveis: carregam comportamentos e dados existentes. Melhorar a camada comum de consulta/projeção antes de considerar migração explícita, reversível e testada.

Prioridade de desempenho: medir separadamente normalização, resolução dos grupos, ordenação e montagem do plano; só então reduzir escopo para os registros afetados. Não limitar o grupo de uma compra de modo a perder parcelas de outros anos.

## 4. Divisão de contas e empréstimos

Fontes: shared/rachadinha.js, interface/rachadinha.js, compartilhamento.js e editores no backend.

Cálculo conjunto de parcelas em centavos é compartilhado entre navegador e servidor; recebimento da pessoa continua separado do pagamento ao banco. Essa separação não é redundância. Fragmentos, escopos de propagação e prévias aumentam complexidade, porém têm função contábil concreta.

Melhoria: representação nomeada dos campos nas fronteiras, mantendo a matriz atual como formato de armazenamento. Hoje índices numéricos exigem atenção em cada integração. Não foi demonstrado novo desvio de centavos nesta revisão. Ganho principal: reduzir risco de manutenção; velocidade deve ser buscada nos acessos e mapas usados por operação.

## 5. Painel, limites, Horizonte e Agenda

Fontes: getDadosCompletos; interface/painel.js, perfil.js, usabilidade.js, agenda.js e situacoes.js.

Carga completa reúne muitas responsabilidades: cadastros, notas, empréstimos, projeções, sugestões e agregados. Atualizações confirmadas evitam consulta adicional, mas ainda remontam esse conjunto após gravações elegíveis. Esse custo aparece no diagnóstico.

Prioridade alta: separar internamente obtenção dos dados, cálculos e apresentação; estabelecer quais resultados dependem de cada alteração. Uma atualização menor só poderá substituir o retrato completo se preservar geração, validade, totais e restauração. A Agenda filtra eventos por dia ao montar o mês; é uma oportunidade menor de indexação local, não o principal gargalo observado.

## 6. Mensal, Anual e PDFs

Fontes: shared/relatorios.js, lerLancamentosParaRelatorio e relatórios em Backend/Code.gs.

Há revisão de PDFs e competência explícita. O filtro de anos aplicado aos arquivos do mecanismo antigo não significa leitura seletiva de todos os anos da organização atual: a aba financeira virtual pode ser construída pela união do catálogo anual antes do filtro do relatório. Esse ponto é uma limitação arquitetural concreta para crescimento, não falha comprovada nos totais.

Prioridade alta: desenhar uma via de consulta por competência/ano, mantendo detecção de duplicados, ajustes de anos fechados, comparação com período anterior e conferência de fórmulas/hash. Não basta adicionar um filtro depois de baixar tudo. PDFs e backup têm finalidades distintas e não devem ser fundidos.

## 7. Ferramentas práticas

Fontes: interface/usabilidade.js e conferencia.js, compartilhamento.js.

Comparador, simulador, calculadora e leitura do extrato operam majoritariamente no navegador. Não há evidência recente de que sejam a causa da demora para salvar. Conferir extrato não deve ser convertido em associação automática só para acelerar a tela.

Melhoria: dividir usabilidade.js por responsabilidade. Há utilidades financeiras, transferência entre formulários e apresentação num mesmo arquivo. Manter cálculo separado da manipulação de campos e revisão de WhatsApp. Observadores de botões/modais merecem medição sob listas grandes, mas não foram identificados como gargalo de segundos.

## 8. Notas e Planejamento

Fontes: salvarNotasWebInterno_, interface/planejamento.js e shared/planejamento.js.

Notas usam revisões por registro e exclusão lógica; Planejamento valida versão da lista completa antes de substituí-la. São decisões compatíveis com o volume limitado atual. Notas procuram cada ID com findIndex e Planejamento transporta o estado integral: oportunidades de escala, sem evidência de perda de dados nesta revisão.

Melhoria: mapa de ID local por lote nas notas, se a medição justificar; conservar tombstones e revisões. Evitar trocar o protocolo do Planejamento por operações individuais sem necessidade: hoje o limite é de 500 itens e o controle de conflito funciona pela versão global.

## 9. Configurações, identidades e perfis

Fontes: formas/categorias no backend, shared/perfil-gastos.js e interface/perfil.js.

Aliases, arquivamento, categorias antigas e padrão prospectivo têm motivos distintos. Leitores de moeda/data/competência existem em camadas diferentes e aceitam contratos diferentes. Não podem ser fundidos apenas por terem nomes parecidos; precisam de tabela de entradas e resultados antes da unificação.

Melhoria: diminuir índices mágicos nas interfaces entre módulos e compartilhar contratos de validação onde as regras forem realmente iguais. Renomeação precisa manter história e aliases; uma substituição textual global seria insegura.

## 10. Backup, restauração e organização anual

Fontes: shared/anual.js, protecao.js e relatorios.js; interface/restauracao.js e protecao.js.

É o módulo mais sensível para simplificar: catálogo, anos abertos/fechados, ajustes, arquivos legados, importação em partes, diário e resumo adiado se cruzam. Conferências antes/depois da escrita e barreiras do diário não são lixo antigo. As leituras anuais estão entre os custos comprovados nos diagnósticos.

Há oportunidade de compartilhar contexto de leitura dentro da mesma fase e reduzir consultas de metadados/dimensões, sem aproveitar fotografias anteriores em uma fase que exige releitura. Retirada de mecanismos legados exige inventário de backups, dados e operações ainda recuperáveis. Não apagar formatos antigos por ausência de uso aparente na interface.

## Integração e organização geral

- O HTML local gerado tem cerca de 1,09 MB e 11.234 linhas; Code.gs cerca de 575 KB e 7.657 linhas. São tamanhos de fonte sem compressão HTTP, não tamanho necessariamente transferido na rede. Arquivos grandes não provam execução lenta de cada ação.
- Existem 41 arquivos JS de fontes em interface/shared. Cópias incorporadas e três HTMLs são artefatos de publicação. Não são módulos executados três vezes pelo navegador. Removê-las manualmente quebra o fluxo de publicação; reduzir duplicação deve ocorrer no gerador.
- Muitos trechos compactados em uma linha e dependências globais dificultam revisar e localizar erros. Extrair código das fontes grandes pode melhorar manutenção sem prometer ganho de tempo.
- As listas de métricas permitidas aparecem no servidor e no frontend. Isso é risco de divergência de diagnóstico. Compartilhar um esquema numérico gerado é uma melhoria de manutenção útil, mantendo filtro estrito e privacidade.
- A documentação acumula notas de versões no topo e no fim, incluindo descrições antigas de protocolo/estado. Consolidar uma visão atual e preservar histórico separado no próprio documento. Texto antigo em Markdown não deixa o app lento, mas pode induzir manutenção errada.
- Não foi confirmado código financeiro morto removível nesta revisão. Funções sem chamador textual podem ser entradas manuais, gatilhos, ações de API, handlers HTML ou recuperação antiga. Exigir inventário e testes antes de deletar.

## Ordem recomendada

1. Medir custos internos da ação e distinguir consultas reais de trabalho virtual; seguir as leituras anuais reveladas pela v208.
2. Reduzir leitura ampla em consultas Mensal/Anual e montagem posterior à gravação, com escopo e prova de equivalência.
3. Centralizar progressivamente API/navegação e esquema do diagnóstico, mantendo testes das camadas.
4. Extrair funções grandes e contratos de registros; consolidar documentação atual.
5. Só depois planejar retirada de compatibilidade com inventário, migração e recuperação.

Não recomendo uma limpeza geral nem trocar o banco agora como condição para essas melhorias. O diário e as travas impõem um custo deliberado de integridade; parte da demora também é latência variável do serviço. A revisão não afirma que toda lentidão será eliminada por organização do código.

Validação nesta revisão: suíte local executada novamente, 1.350 testes aprovados e zero falhas, log `auditoria-modulos-v208.log`. Sem publicação nem validação da implantação. Testes simulados não substituem uso em dois aparelhos, autorização real ou ensaio de crescimento da base.

Continuidade v209 local: aplicada redução restrita de cópia integral intermediária na montagem anual e leitura única dos ajustes; adicionadas medidas de ordenação. A via seletiva de relatórios por ano e a centralização dos envoltórios ainda não foram implementadas.

Continuidade v210 local: regras mínimas de protocolo extraídas para shared/acoes.js e removida camada repetida em rotina.js; esquema numérico do diagnóstico passa a fonte única no gerador. Anual materializa somente ano consultado/anterior após leitura/conferência integral. Não equivale a leitura física seletiva. A cadeia de navegação ainda não foi centralizada por completo.
