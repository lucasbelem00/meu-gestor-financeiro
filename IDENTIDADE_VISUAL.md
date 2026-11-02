# Identidade visual do webapp

Estas convenções devem ser mantidas nas novas alterações, títulos, navegação e mensagens referentes aos mesmos recursos. Ícone acompanha texto; nunca é a única indicação da ação.

Nome único do produto: **Gestor de Gastos**, incluindo título da janela e manifesto de instalação. A ação de consultar os totais e registrar o pagamento ao banco chama-se **Conferir fatura** no Painel e Mensal. Atividade e sincronização concentra o histórico das operações, confirmações e recuperação.

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

O padrão é símbolo acompanhado de texto: ⚙️ Gerenciar (antes Organizar), ✏️ Editar, 🗑️ Excluir/Remover, ➕ Adicionar/Incluir/Lançar, 🧹 Limpar, 📋 Copiar, 🫴 Cobrar, 💰 Registrar recebimento, ➖ Registrar recebimento parcial, 🔁 Repetir, 💾 Salvar/Guardar e ↻ Atualizar. A engrenagem também identifica Gestão e ajustes: é o mesmo contexto de gestão, distinto da edição de um registro. ⚖️ identifica Comparar preços; 💵 identifica Composição da fatura.

Em Empréstimos, o recebimento usa a linha principal; Editar e Excluir ficam na linha seguinte em duas colunas iguais. Nesse grupo de Empréstimos, os botões têm altura mínima de 44 px, texto centralizado e espaçamento consistente. Atalhos internos da Mensal e filtros usam dimensões compactas próprias do contexto; a regra de rótulos não impõe tamanho global. As cores continuam indicando a ação/situação.

interface/botoes.js centraliza rótulos e preserva o padrão quando a tela altera um botão após clique, consulta ou envio. Não substitui eventos, valores, disabled ou identificadores. Conteúdo rico, navegação, filtros selecionáveis, setas de fechar/voltar e teclas da calculadora preservam sua composição própria. A observação de alterações trata somente botões criados ou com texto alterado; não percorre a página inteira a cada atualização.

## Prévia e cópia para WhatsApp

Dividir com a galera (rápido e detalhado), Simular compra e resumo do Histórico usam “📲 Prévia para WhatsApp”. Empréstimos pendentes usam “🫴 Cobrar no WhatsApp”; recebidos usam a prévia do resumo. Todos abrem a mensagem editável; dentro dela a ação é “📋 Copiar mensagem”, que copia o texto revisado e o complemento Pix selecionado. A simulação não inclui Pix. Notas e resultado da calculadora mantêm cópia direta. Se a janela de prévia não estiver disponível, o app orienta atualizar em vez de copiar sem revisão. Nenhuma dessas ações envia mensagem automaticamente.

Conferir fatura usa 📃, remetendo ao documento. 💳 identifica cartão/forma de pagamento. O atalho de Terceiros usa 🤝. O botão do recebimento parcial usa “➖ Registrar recebimento parcial”, com a confirmação existente antes da gravação. Transferir entre Pessoal e Empréstimos usa ↔️; 🔁 fica para repetir. Os filtros rápidos do Histórico compartilham alinhamento e altura compacta.

## Navegação por período

Os períodos usam chevrons SVG com traço arredondado, centralizados por inline-flex. Agenda e Horizonte mantêm botões de 44 × 44 px. Mensal e Anual usam 32 × 32 px, com seletores e PDF de mesma altura, agrupados e centralizados; em telas estreitas o grupo pode quebrar linha. Os controles auxiliares de mês dos formulários usam 26 × 22 px para harmonizar com o formulário. A classe btn-periodo-gestor concentra borda, fundo, foco de teclado, hover e estado desabilitado. Os ícones não dependem de fonte ou emoji e ficam ocultos para leitores de tela; cada botão possui nome acessível indicando a direção.

## Classificação e recorrências

Recorrências identifica as cobranças automáticas (antes Despesas Fixas). É independente de classificar um gasto como Fixo/Variável e Essencial/Ajustável. Nas categorias, o nome pode quebrar; a meta ocupa sua própria linha e os indicadores de classificação ficam abaixo. No editor, os seletores ficam empilhados no celular e em duas colunas no computador.

O Perfil dos gastos aparece em Análise e planejamento, depois do limite pessoal. Os dois grupos ficam empilhados no celular e lado a lado em telas maiores; os títulos reservam duas linhas. Cada classificação tem o valor abaixo do nome e abre o Histórico correspondente.

## Posição ao navegar entre abas

Trocar de aba ou subferramenta abre o documento no topo, sem herdar a posição anterior. O ajuste ocorre antes e depois da troca, com conferência nos quadros seguintes e proteção por geração da navegação. O app controla a restauração de rolagem do histórico para que o fechamento assíncrono do Menu não recupere a posição da aba anterior. Fechar um modal sem trocar de aba mantém a posição da tela. Atualizações na mesma visita podem preservar a rolagem; atalhos explícitos para cadastro ou resumo cancelam o ajuste pendente para alcançar o destino pretendido.
