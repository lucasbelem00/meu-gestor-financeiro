# Identidade visual do webapp

v171 — Histórico mostra aviso “⏳ Atualizando lançamentos…” em caixa discreta azul, acima dos cards preservados. Campos de parcelas do simulador seguem Novo/Empréstimos: À vista representa numericamente 1 sem foco e dá lugar a números ao editar. Recebimento usa botão genérico “💰 Registrar recebimento”; confirmação explicita parcial/integral e saldo restante. Fechar/Cancelar continuam disponíveis durante envio, sem sugerir cancelamento bancário. Simulador inclui atalho textual para Metas e compras planejadas, preservando o caminho já existente de simular uma estimativa. Recorrência de terceiros esclarece o papel do original e dos próximos meses, sem nova cor ou entidade financeira.


v168 — Conferir fatura: após pedir pagamento, botão mostra “⏳ Conferindo…” e fica desabilitado enquanto a prévia é consultada. Mensagem discreta abaixo, role=status/aria-live=polite, orienta aguardar a distribuição; desaparece ao concluir/abrir outra consulta. Confirmação financeira só aparece depois de prévia válida. Novo Empréstimo usa “Observação (Opcional)” por extenso.


v167 — Histórico: mensagem discreta acima da lista com role=status/aria-live informa consulta em andamento, ocupação ou resultados anteriores. Mantém cards visíveis para evitar tela vazia, mas lista inert impede ações sobre busca ainda não confirmada. Soma anterior fica escondida ao trocar filtro. Aviso desaparece somente após sucesso válido; nenhuma cor de pagamento ou status financeiro foi alterada.


v165 — Interação comum: mouse realça discretamente botão/summary com brilho sem substituir a cor semântica; pressionar dá retorno breve, sem escala/deslocamento. Hover só em hover:hover/pointer:fine, evitando realce preso no toque. Foco de teclado: contorno azul claro 2px afastado 3px. Disabled/aria-disabled não recebem hover/press; preferência de movimento reduzido remove transição. Atividade: seleção azul persistente e aria-pressed nos três painéis desde Pendentes inicial, sincronizados nas renderizações. Realce passageiro não muda seleção nem regras de pagamento.


Complemento visual v160: mês da fatura centralizado entre as setas no modal Conferir fatura; seletor de cartão mantém alinhamento à esquerda e largura disponível. Sem alteração nas consultas, datas ou pagamentos.

Ajuste adicional v160: cabeçalhos Data/Mês da Fatura dos dois cadastros usam a mesma fonte de 11px e espaçamento normal entre letras. Novo tinha 12px com tracking extra, causando quebra diferente. Data de Novo centralizada também no computador; removido sm:justify-start apenas do cadastro, sem alterar o editor ou o comportamento móvel. Quebra natural continua permitida em telas estreitas para evitar sobreposição às setas.

Complemento v160: Forma de Pagamento em Novo Empréstimo segue Novo em altura, espaçamento interno, borda, foco azul e transição; opção inicial “Selecione...” também no preenchimento após consulta. Opções e regras financeiras preservadas.

Padrão v160 dos dois cadastros: Mês da Fatura, Descrição do Gasto e Forma de Pagamento. Apenas rótulos; IDs, regras de competência e contratos de envio preservados.

v160 — Cadastros Novo e Empréstimo: cabeçalhos Data/competência sem altura fixa, campos alinhados pela base e separados do rótulo por 6px. Competências centralizadas nos dois. Novo: retirar altura fixa de 28px de Valor/Parcelas/Início e padding superior redundante; manter colunas, altura dos inputs e atalhos. Prévia de recorrência separada de Tags por 8px. Hoje/Ontem usam 10px nos dois cadastros. Não impor altura vazia para compensar rótulos nem comprimir seções de todos os modais indiscriminadamente.


v159 — 🗒️ Parcelas detalhadas de terceiros. Reservar 📋 às ações de copiar; nenhuma mudança no conteúdo financeiro da seção. Padrões de datas/cards/ícones instalados das v157/v158 mantidos.


v158 — Data e Mês Fatura nos cadastros Novo e Novo empréstimo compartilham cabecalho-data-fatura-gestor: 28px de altura, margem inferior de 6px, label com line-height 1.15 e controles sem encolher. Campos 52px; tamanhos de Ontem/Hoje e setas preservados. Não aumentar botões para compensar diferença de cabeçalho.


v157 — síntese do card antigo com a lista unificada: nome/forma/categoria à esquerda; valor e badge de modo à direita; próxima cobrança abaixo; divisor antes de Editar (violeta), Pular mês (âmbar) e Desativar (rosa). Identificação de terceiros em âmbar, pessoal violeta; revisão de valor devido tem botão próprio para não comprimir as três ações. Data e competência de Novo empréstimo têm controles de 52px, cabeçalhos de 28px, alinhamento e fonte compatíveis.

Ícone instalado oficial: bolsa existente em gestor.svg/PNG gestor-v2-*. Preview: mesmo desenho vetorial com faixa PREVIEW e nome Gestor de Gastos — Preview/atalho Gestor Preview. Publicador seleciona por ambiente e ajusta título, metadados Apple, favicon, manifesto e cache apenas no dist. Sem trocar automaticamente o identificador/início do app. PNGs de 192/512 e Apple 180 versionados por nome; SVG de Preview preservado como fonte. Atualização em instalação já existente ainda deve ser testada no aparelho.


v156 — Recorrências: um só título 📌 Recorrências ativas; grade neutra de uma coluna no celular e duas a partir de md. Pessoal identificado em violeta, terceiros em âmbar com 🤝 e nome; valor destacado em branco. Modo Automática/Revisão e próxima cobrança ficam claros sem repetir explicações extensas por card. Séries antigas e modelos novos não recebem seções visuais separadas; ações existentes são preservadas. Desativadas em seção recolhida com Retomar, ajuda em Como funciona. Atualizar discreto no cabeçalho, texto Atualizando… e disabled enquanto consulta. Atalhos de criação lado a lado, editor permanece separado da listagem.


v155 — 📌 Recorrente nos dois cadastros usa botão violeta compacto h-6, alinhado aos atalhos de parcelas; em Empréstimos fica abaixo do campo Valor. Criar recorrência nos dois editores é expansível, com menu Variável/Fixo, prévia e botão de confirmação; permanece no editor de origem. Em editar empréstimo, Data combinada e Aplicar data combinada ficam depois de Aplicar valor, antes das ações Recebimento parcial, Mover para pessoal e Criar recorrência. Inicialização antes da captura de assinaturas evita confundir reorganização visual com alteração de dados.


v154 — cadastro de recorrência: manter 📌 Recorrente em violeta; ao ativar, revelar menu único Variável — revisar a cada mês / Fixo — repetir automaticamente e prévia curta em violeta, com dia e próxima data. Não repetir campos de início/dia existentes na data do gasto. Novo mantém tags; terceiros mantém Pessoa e observação, sem categoria pessoal. Atalhos ➕ Gasto pessoal e 🤝 De terceiros ficam próximos na aba Recorrências, com botões neutros; identificação dos terceiros na listagem continua âmbar. Envio atual é lançamento à vista; modelo controla repetições futuras.


Ajuste v153 — Novo usa 🟢 Fatura aberta na data do gasto e 🚀 Fatura fechada na data do gasto, seguidos pela fatura sugerida; emojis indicam o enquadramento daquela compra, não situação atual de período antigo. Comparador: ações 📋 Copiar resultado e ➕ Preencher Novo em grade de uma coluna no celular e duas em sm, dentro de cada card vencedor, com fundo/borda discretos em azul. Em empate, cada opção vencedora tem seus próprios botões. Não transformar Preencher em salvamento automático; informar que o preço transferido é o total do conjunto.


Recorrências v152 — 04/11/2026: seção Criar recorrência deve seguir o componente expansível dos conversores do editor, dentro do formulário antes de Cancelar/Salvar. Usar o violeta de Recorrência ativa: bg-violet-500/20, text-violet-300 e border-violet-400/40, com hover discreto. Conteúdo recolhido oferece explicação e Configurar recorrência. Manter chevron lateral e rótulo central, aria-expanded/aria-controls; não repetir botão após rodapé. Pessoal e terceiros usam esse mesmo padrão para a ação; a identificação de origem Terceiros na listagem continua âmbar.


Ajustes v151 — 04/11/2026: atalho Usar tags anteriores imediatamente após o campo Tags e antes dos chips, como ação secundária compacta. Empréstimo segue Novo: Valor/Parcelas/Início numa linha com mais largura para Valor, Início estreito, botão À vista h-6 abaixo; observação ocupa outra linha. Parcela 1 mantém dado numérico e mostra À vista fora do foco. Conferir fatura usa btn-periodo-gestor com chevrons SVG centralizados; cartão e competência empilhados no celular. Criar recorrência sai dos cards e entra em Editar; fundo neutro, origem de terceiros em âmbar. Formulário usa apenas Recorrência no texto público, exibe Pessoa ou Categoria conforme origem e recolhe ajuste da fatura. Controles indisponíveis durante envio mantêm estado visual disabled; mensagens de confirmação continuam distinguindo envio de atualização de tela.


Recorrências — padrão v150 (04/11/2026): manter fundo neutro dos cards. Modelos pessoais recebem 📌 Pessoal; modelos de terceiros recebem 🤝 Terceiros e nome da pessoa em âmbar. Separar origem (pessoal/terceiros) de modo (variável/revisão ou fixo/automático). Valor do modelo usa texto neutro; nunca verde de recebido apenas por ser recorrente. Ações: ➕ Nova recorrência, 📌 Criar recorrência no Histórico/Gerenciar, ✅ Revisar e registrar mês, ✏️ Editar, ⏸️ Pular mês, ⏹️ Desativar, ▶️ Retomar. Formulário em uma coluna no celular e duas a partir de sm; botões com quebra e espaçamento, confirmação antes do envio. Séries antigas continuam identificadas por seus estados atuais.


Atualização 04/11/2026, v147: orientações secundárias de Status e Mês Fatura usam Ajuda recolhida junto ao rótulo. Perfil dos gastos mantém apenas os cards clicáveis, sem atalho inferior repetido. Pix agendados usam 💠, data informada e cores situacionais existentes no Painel/Agenda; o texto indica ausência de confirmação, sem presumir débito não pago. Clique abre revisão, nunca baixa financeira automática. Confirmação de Pix/à vista no editor exige opção explícita e revisão antes de salvar.


Estas convenções devem ser mantidas nas novas alterações, títulos, navegação e mensagens referentes aos mesmos recursos. Ícone acompanha texto; nunca é a única indicação da ação.

Nome único do produto: **Gestor de Gastos**, incluindo título da janela e manifesto de instalação. A ação de consultar os totais e registrar o pagamento ao banco chama-se **Conferir fatura** no Painel e Mensal. Atividade e sincronização concentra o histórico das operações, confirmações e recuperação.

Horários distinguem três eventos: “Dados atualizados neste aparelho” em Atividade; “Última conclusão do resumo da planilha” em Exportar/backup; e “Último backup confirmado” para a cópia de segurança. Conclusão anterior do resumo não elimina uma pendência nova: apresentar ambas quando necessário. Ausência de data válida não deve parecer conclusão bem-sucedida.

No Histórico, o resumo usa 🔢 para contar lançamentos, quantidade neutra e valor roxo com o rótulo “Total da seleção”. Esse total pode incluir registros abertos e pagos; sua cor não deve indicar quitação.

| Recurso | Ícone reservado |
| --- | --- |
| Marca do aplicativo | Bolsa dourada própria sobre fundo azul, fonte em `icons/gestor.svg` |
| Mensal / competência do mês | 📅 |
| Anual / balanço do ano | 📆 |
| Atualizar o app | ↻ |
| Atividade e sincronização | 📡 |
| Histórico | 🧾 |
| Notas | 📝 |
| Despesas fixas / assinaturas | 📌 |
| Repetir lançamento | 🔁 |
| Parcelados | ➗ |
| Pix | 💠, inclusive no filtro |
| Termômetro de metas | 🎯 |
| Quantidade de lançamentos | 🔢 |
| Compra única / à vista | ⚡ |
| Registrar recebimento parcial | ➖ |
| Redução de gastos na comparação | 📉 |
| Aumento de gastos na comparação | 📈 |

📈 e 📉 indicam direção de valores; não identificam a aba Anual. Um cabeçalho genérico de grupo não substitui a identidade de cada aba.

No celular, a Central mostra o título curto “Navegação”, com “↻ Atualizar” e Fechar na mesma linha. O título pode quebrar com fonte ampliada sem empurrar as ações para baixo. No computador, conserva “Central de Navegação”. A mensagem de atualização usa “↻ Atualizando…”. 📌 acompanha a identificação de despesas fixas no cadastro, menu, filtro e aba; 🔁 identifica repetir um lançamento.

Todos os atalhos da Central usam o mesmo fundo neutro `bg-slate-800/80`, borda `border-slate-700/80` e passagem do mouse `hover:bg-slate-700`. A cor da ferramenta fica no círculo do ícone. Ao abrir a Central, somente o destino da página/ferramenta atual recebe `aria-current="page"`, fundo azul suave e borda azul. Trocar de ferramenta substitui esse destaque; ações que abrem modais não representam a página atual. O atalho Empréstimo em Novo segue o fundo neutro; seleções Consultar/Novo empréstimo usam âmbar, característico da área. Cores de ações, alertas e confirmações continuam indicando seu significado.

O ícone do aplicativo é um desenho vetorial próprio inspirado em 💰, sem fontes ou emojis do sistema. O arquivo mestre `icons/gestor.svg` gera a mesma identidade no cabeçalho (incorporada pelo build), no favicon e nos PNGs locais `icon-192.png`, `icon-512.png` e `apple-touch-icon.png` (180 px). O fundo é opaco e o símbolo permanece na área central segura para os recortes de ícones instalados. `icon-192.svg` conserva o caminho antigo com o novo desenho.

Ao modificar o desenho mestre, exportar novamente os três PNGs e o SVG de compatibilidade antes de publicar. A compilação incorpora o mestre no cabeçalho, mas não rasteriza as imagens. Nenhum ícone instalado depende de CDN externa. O cartão 💳 continua identificando cartões e formas de pagamento.

As cores expressam o significado no contexto: verde para quitação, recebimento e redução de gastos; rosa/vermelho para aumento de gastos ou saldo que exige atenção; azul para seleção e navegação; âmbar para pendências/terceiros; cinza para estado neutro ou indisponível. Empréstimos e gastos pessoais mantêm seus contextos visuais próprios. Não julgar a situação somente pela cor nativa do emoji, que varia por aparelho.

Na comparação mensal atual, variação menor ou igual a zero usa verde; aumento usa rosa; ausência de base usa cinza. O texto e a porcentagem acompanham o ícone.

Metas de categorias usam a mesma regra no formulário Novo e no termômetro mensal: verde abaixo de 80%, âmbar de 80% até 100% inclusive e rosa somente acima da meta. Exatos 100% significam “No limite da categoria”, sem margem, não excesso nem celebração de aumento de gastos. O percentual arredondado é apenas apresentação; as cores usam valores em centavos e percentual não arredondado. A barra do limite pessoal respeita os mesmos limiares, mantendo seu azul de contexto abaixo do alerta. Essa regra não se aplica às metas de reserva/compra do Planejamento, que têm outro significado.

Nas listas pessoais do Histórico, Mensal e Fixos, valores pendentes usam branco e quitados usam verde. Quando disponível, o saldo restante determina a quitação. Em um pagamento parcial, a parte paga usa verde e o restante segue a situação: âmbar dentro do prazo e laranja em atraso. Assinatura ativa usa selo violeta, distinto do estado de quitação. Os indicadores e gráficos mantêm suas cores próprias. A composição conserva ⚡ À vista/1x e 🔒 Parcelado/Fixo.

As etiquetas do Histórico, da Mensal e de Empréstimos usam ⚡ À vista em compras 1/1, ➗ Parcela n/total e 📌 Fixo mensal. O infinito não aparece nessa etiqueta; `∞/∞` permanece como identificação técnica da recorrência nos dados. Esses símbolos descrevem a compra; o status indica se o pagamento está pendente ou quitado. ➖ Registrar recebimento parcial indica o abatimento por uma devolução efetivamente recebida, preservando o saldo restante.

Contagens mensais e anuais usam 🔢 com o período escrito. A quantidade e a média no cartão A pagar continuam representando todos os lançamentos do mês, mesmo com saldo zerado ou filtros. O ranking anual identifica os maiores gastos com 🥇, 🥈 e 🥉; empates compartilham posição. Medalhas indicam volume de gasto, sem representar uma avaliação positiva.

Pix usa 💠 no filtro e nas informações compactas. O vetor de 24 px do pacote anterior foi retirado por ficar desproporcional aos emojis vizinhos. Moeda e cédula ficam para valores/dinheiro em geral, evitando confundi-los com o tipo Pix.

Nas subferramentas, a seleção usa azul com `aria-pressed`. Consultar/Novo empréstimo usa âmbar com `aria-pressed`, sem acumular fundos selecionado e neutro. Somente a aba principal Novo conserva verde. Ao trocar de ferramenta, o cabeçalho informa seu nome e a barra rola horizontalmente para mostrar a seleção, sem deslocar a página para trás do cabeçalho. O grupo Ferramentas da Central usa título neutro.

O manifesto versiona a URL dos PNGs para sinalizar a identidade própria aos navegadores. O service worker consulta o manifesto pela rede com revalidação, preservando a última cópia em falhas de conexão; não deve mantê-lo indefinidamente no caminho de cache prioritário dos recursos estáticos. O ícone Apple também tem URL versionada. A troca do ícone instalado e da tela de abertura depende do navegador e do sistema; pode exigir aceitar a atualização da identidade do app.

A entrada normal na aba Mensal seleciona o mês vigente do calendário, inclusive quando ainda não há registros. Não existe caixa de avanço nem mudança de período por quitação ou fechamento dos cartões. É possível consultar outro mês manualmente enquanto permanece na tela; uma atualização de dados preserva essa consulta. Ao tocar novamente na aba Mensal, retorna ao mês vigente. Atalhos explícitos para uma fatura respeitam o período escolhido no clique.

A Agenda financeira usa 🗓️ e fica em Planejamento. Seus eventos distinguem 💳 vencimento bancário e 🤝 devolução combinada, sempre com texto. Não gera despesas ou pagamentos. O Painel segue a ordem: Seu mês, O que precisa de atenção, Pagamentos e recebimentos, comparação do Horizonte com a distribuição e Análise e planejamento. A partir de 1024 px, o gráfico ocupa a coluna esquerda e o Horizonte as duas colunas à direita. No celular, Horizonte vem antes do gráfico, empilhados. O total de todo o histórico fica recolhido.

As bases anuais usam a identidade dos cabeçalhos da base de controle e um resumo de doze meses do respectivo ano. A apresentação não duplica cadastros ou automações. Um ano fechado continua sendo o retrato financeiro do fechamento, inclusive se houver ajustes posteriores no webapp.

O título do grupo Planejamento usa 📑. A bússola 🧭 fica reservada à Central de Navegação.

Comparar preços usa ⚖️ e fica em Ferramentas. Conferir extrato usa 🔎 em Dados e relatórios: a lupa mantém o significado de examinar/procurar. No computador (a partir de 1024 px), os quatro grupos do Menu ficam em duas colunas, com atalhos em pares e fundo neutro. No celular permanece a organização em pares.

Situações: verde para pago/recebido; âmbar para pendente; laranja para prazo vencido ou mês encerrado com recebimento pendente. O texto sempre distingue Banco e Pessoa. Rosa/vermelho continua identificando limite/meta ultrapassados. Na Agenda, todo o quadrado recebe a situação prioritária; seleção azul é apenas um contorno. No Horizonte, os nomes Total Carteira, Terceiros e Total Faturas usam azul-claro, âmbar e violeta, respectivamente; a situação dos valores é independente da cor do nome.

Títulos dos modais de edição usam ✏️: empréstimos, lançamentos, formas de pagamento e despesas fixas. Títulos alterados ao abrir o editor preservam o símbolo. O modo Registrar recebimento mantém sua identificação própria, pois é uma ação de recebimento. No Bloco de Notas, a criação usa “➕ Adicionar nota”; o ícone 📝 identifica a ferramenta.

## Botões de ação

Cartões e Limites mantém Editar à esquerda e Excluir à direita. As prévias de parcelamento de Novo e Empréstimos ficam em uma linha própria abaixo dos campos, com distribuição exata de centavos e quebra natural de texto. Atalhos 3x/6x/12x ficam abaixo da quantidade; ÷2/×2 preserva a reversão do valor original. A Central usa fundo escurecido sem desfoque para reduzir o custo de pintura.

Os valores de objetivo e progresso do Planejamento seguem a máscara monetária do app e aceitam colagem em reais. O estado ativo de ÷2/×2 acompanha o rascunho após recarga quando os valores continuam coerentes; desfazer não remove a tag `#dividido` adicionada manualmente.

A confirmação de uma rachadinha parcelada mostra valores por fatura e por pessoa, agrupando apenas competências consecutivas com valor igual. Na edição de empréstimo fragmentado, a prévia distingue o valor do registro a receber, o já recebido preservado e o total recomposto da parcela; não apresentar o restante como se fosse o valor integral.

Textos auxiliares pequenos em fundos escuros usam cinza slate-400, evitando slate-500 nos rótulos de 10 px. Ver tudo usa purple-300 sem transparência e as quantidades das tags usam indigo-300. Nos elementos apontados pela auditoria da Mensal, o contraste medido no CSS real ficou entre 5,71:1 e 8,28:1; isso verifica esses elementos, não substitui uma auditoria completa das telas e estados.

O padrão é símbolo acompanhado de texto: ⚙️ Gerenciar (antes Organizar), ✏️ Editar, 🗑️ Excluir/Remover, ➕ Adicionar/Incluir/Lançar, 🧹 Limpar, 📋 Copiar, 🫴 Cobrar, 💰 Registrar recebimento, ➖ Registrar recebimento parcial, 🔁 Repetir, 💾 Salvar/Guardar e ↻ Atualizar. A engrenagem também identifica Gestão e ajustes: é o mesmo contexto de gestão, distinto da edição de um registro. ⚖️ identifica Comparar preços; 💵 identifica Composição da fatura.

Em Empréstimos, o recebimento usa a linha principal; Editar e Excluir ficam na linha seguinte em duas colunas iguais. Nesse grupo de Empréstimos, os botões têm altura mínima de 44 px, texto centralizado e espaçamento consistente. Atalhos internos da Mensal e filtros usam dimensões compactas próprias do contexto; a regra de rótulos não impõe tamanho global. As cores continuam indicando a ação/situação.

interface/botoes.js centraliza rótulos e preserva o padrão quando a tela altera um botão após clique, consulta ou envio. Não substitui eventos, valores, disabled ou identificadores. Conteúdo rico, navegação, filtros selecionáveis, setas de fechar/voltar e teclas da calculadora preservam sua composição própria. A observação de alterações trata somente botões criados ou com texto alterado; não percorre a página inteira a cada atualização.

## Prévia e cópia para WhatsApp

Dividir com a galera (rápido e detalhado), Simular compra e resumo do Histórico usam “📲 Prévia para WhatsApp”. Empréstimos pendentes usam “🫴 Cobrar no WhatsApp”; recebidos usam a prévia do resumo. Todos abrem a mensagem editável; dentro dela a ação é “📋 Copiar mensagem”, que copia o texto revisado e o complemento Pix selecionado. A simulação não inclui Pix. Notas e resultado da calculadora mantêm cópia direta. Se a janela de prévia não estiver disponível, o app orienta atualizar em vez de copiar sem revisão. Nenhuma dessas ações envia mensagem automaticamente.

Conferir fatura usa 📃, remetendo ao documento. 💳 identifica cartão/forma de pagamento. O atalho de Terceiros usa 🤝. O botão do recebimento parcial usa “➖ Registrar recebimento parcial”, com a confirmação existente antes da gravação. Transferir entre Pessoal e Empréstimos usa ↔️; 🔁 fica para repetir. Os filtros rápidos do Histórico compartilham alinhamento e altura compacta.

## Navegação por período

O cabeçalho Anual traz a comparação com o ano anterior ao lado do título, quebrando naturalmente no celular. A legenda informa o intervalo: no ano vigente, janeiro até o mês atual contra os mesmos meses anteriores; em anos encerrados, os doze meses. Redução usa verde/📉, aumento rosa/📈, igualdade e ausência de base usam cinza. Anos futuros não recebem variação. O detalhamento do critério acompanha o indicador e o PDF anual.

Os períodos usam chevrons SVG com traço arredondado, centralizados por inline-flex. Agenda e Horizonte mantêm botões de 44 × 44 px. Mensal e Anual usam 32 × 32 px, com seletores e PDF de mesma altura, agrupados e centralizados; em telas estreitas o grupo pode quebrar linha. Os controles auxiliares de mês dos formulários usam 26 × 22 px para harmonizar com o formulário. A classe btn-periodo-gestor concentra borda, fundo, foco de teclado, hover e estado desabilitado. Os ícones não dependem de fonte ou emoji e ficam ocultos para leitores de tela; cada botão possui nome acessível indicando a direção.

## Classificação e recorrências

Recorrências identifica as cobranças automáticas (antes Despesas Fixas). É independente de classificar um gasto como Fixo/Variável e Essencial/Ajustável. Nas categorias, o nome pode quebrar; a meta ocupa sua própria linha e os indicadores de classificação ficam abaixo. No editor, os seletores ficam empilhados no celular e em duas colunas no computador.

Estados visíveis usam Recorrência ativa, Recorrência paga e Recorrência desativada, inclusive nas mensagens e no extrato PDF. Os códigos antigos Assinatura Ativa/Paga/Cancelada permanecem nos registros e nas chamadas, preservando compatibilidade. O Perfil dos gastos informa que as opções com valor filtram o Histórico; opções zeradas continuam visíveis, desabilitadas. Marcadores ao lado dos nomes reproduzem as cores da barra.

Antecipação usa ⏩ Adiantar parcelas e ciano, distinguindo-a de À vista (⚡). Fatura destino e Quantidade mantêm os campos alinhados; os atalhos 1/2/3/Todas ficam abaixo de Quantidade, dentro da coluna. O texto explica que as últimas parcelas em aberto são movidas para a fatura escolhida. O cálculo e a confirmação financeira permanecem os mesmos.

Os quatro botões expansíveis dos editores usam texto centralizado na área disponível e seta fixa à direita. Nas transferências, pergunta e ação são blocos separados: ficam lado a lado quando cabem e em linhas próprias quando falta largura. A quebra acompanha o conteúdo e a largura real, sem impor duas linhas no computador.

O Perfil dos gastos aparece em Análise e planejamento, depois do limite pessoal. Os dois grupos ficam empilhados no celular e lado a lado em telas maiores; os títulos reservam duas linhas. Cada classificação tem o valor abaixo do nome e abre o Histórico correspondente.

## Posição ao navegar entre abas

Trocar de aba ou subferramenta abre o documento no topo, sem herdar a posição anterior. O ajuste ocorre antes e depois da troca, com conferência nos quadros seguintes e proteção por geração da navegação. O app controla a restauração de rolagem do histórico para que o fechamento assíncrono do Menu não recupere a posição da aba anterior. Fechar um modal sem trocar de aba mantém a posição da tela. Atualizações na mesma visita podem preservar a rolagem; atalhos explícitos para cadastro ou resumo cancelam o ajuste pendente para alcançar o destino pretendido.

- Mensal: metas sem gastos são opcionais e informativas, sem lupa ou ação de filtro. Anual: distinguir total registrado de período comparado e informar parcelas futuras; manter explicação no PDF executivo.

- Calculadora: resultados visíveis e copiados usam até duas casas decimais; precisão interna preservada. Conferir extrato: seção “Possíveis correspondências — datas próximas” separada dos candidatos estritos e das ambiguidades, com aviso de revisão manual e preservação das diferenças.

- Planejamento: Excluir à direita de Editar, com ícone de lixeira e cor de exclusão; confirmação identifica o item e distingue rascunho do item excluído de campos preservados.

- Painel: aviso compacto âmbar de proteção somente para falhas registradas, sem popup; botão Conferir proteção abre detalhes. Estado normal não ocupa espaço.

- Novo: ⚡ À vista abaixo de Início usa o estilo compacto dos atalhos de parcelas. Prévia discreta em duas linhas; Início e prévia ficam ocultos ao retornar a uma parcela.

- Novo parcelado: Valor, Parcelas e Início sempre lado a lado, inclusive no celular; atalhos abaixo dos respectivos campos. Evitar expansão do Valor para linha inteira nesse estado.

- Novo parcelado: colunas proporcionais Valor 42%, Parcelas 33%, Início 25%, descontados os espaços; manter três campos lado a lado e À vista sob Início.

- Refinamento do Novo parcelado: proporção vigente 48/33/19 para Valor/Parcelas/Início, substituindo 42/33/25. Linha do atalho À vista usa flex e botão h-6 centralizado, alinhado aos atalhos vizinhos.

- Novo: Parcelas em 1 mostra À vista; foco limpa apenas a quantidade 1 e mantém teclado numérico. Sair vazio restaura 1/À vista. Quantidades maiores mostram o número.

- Edição de lançamento e empréstimo: situação somente para consulta, com ajuda indicando os fluxos próprios de pagamento/recebimento e Atividade para desfazer. Não aparentar que edição cadastral registra dinheiro.
