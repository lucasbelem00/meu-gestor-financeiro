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

No celular, a Central mostra o título curto “Navegação”, com “↻ Atualizar” e Fechar na mesma linha. O título pode quebrar com fonte ampliada sem empurrar as ações para baixo. No computador, conserva “Central de Navegação”. A mensagem de atualização usa “↻ Atualizando…”. 📌 acompanha despesas fixas no cadastro, menu, filtro, aba e edição; 🔁 identifica repetir um lançamento.

Todos os 12 atalhos da Central usam o mesmo fundo neutro `bg-slate-800/80`, borda `border-slate-700/80` e passagem do mouse `hover:bg-slate-700`. A cor da ferramenta fica no círculo do ícone. Ao abrir a Central, somente o destino da página/ferramenta atual recebe `aria-current="page"`, fundo azul suave e borda azul. Trocar de ferramenta substitui esse destaque; ações que abrem modais não representam a página atual. O atalho Empréstimo em Novo segue o fundo neutro; seleções Consultar/Novo empréstimo usam âmbar, característico da área. Cores de ações, alertas e confirmações continuam indicando seu significado.

O ícone do aplicativo é um desenho vetorial próprio inspirado em 💰, sem fontes ou emojis do sistema. O arquivo mestre `icons/gestor.svg` gera a mesma identidade no cabeçalho (incorporada pelo build), no favicon e nos PNGs locais `icon-192.png`, `icon-512.png` e `apple-touch-icon.png` (180 px). O fundo é opaco e o símbolo permanece na área central segura para os recortes de ícones instalados. `icon-192.svg` conserva o caminho antigo com o novo desenho.

Ao modificar o desenho mestre, exportar novamente os três PNGs e o SVG de compatibilidade antes de publicar. A compilação incorpora o mestre no cabeçalho, mas não rasteriza as imagens. Nenhum ícone instalado depende de CDN externa. O cartão 💳 continua identificando cartões e formas de pagamento.

As cores expressam o significado no contexto: verde para quitação, recebimento e redução de gastos; rosa/vermelho para aumento de gastos ou saldo que exige atenção; azul para seleção e navegação; âmbar para pendências/terceiros; cinza para estado neutro ou indisponível. Empréstimos e gastos pessoais mantêm seus contextos visuais próprios. Não julgar a situação somente pela cor nativa do emoji, que varia por aparelho.

Na comparação mensal atual, variação menor ou igual a zero usa verde; aumento usa rosa; ausência de base usa cinza. O texto e a porcentagem acompanham o ícone.

Nas listas pessoais do Histórico, Mensal e Fixos, valores pendentes usam branco e quitados usam verde. Quando disponível, o saldo restante determina a quitação. Em um pagamento parcial, a parte paga usa verde e o restante usa rosa. Assinatura ativa usa selo violeta, distinto do estado de quitação. Os indicadores e gráficos mantêm suas cores próprias. A composição conserva ⚡ À vista/1x e 🔒 Parcelado/Fixo.

As etiquetas do Histórico e da Mensal usam ⚡ À vista em compras 1/1, ➗ Parcela n/total e 📌 Fixo mensal. O infinito não aparece nessa etiqueta; `∞/∞` permanece como identificação técnica da recorrência nos dados. Esses símbolos descrevem a compra; o status indica se o pagamento está pendente ou quitado. ➖ Registrar recebimento parcial indica o abatimento por uma devolução efetivamente recebida, preservando o saldo restante.

Contagens mensais e anuais usam 🔢 com o período escrito. A quantidade e a média no cartão A pagar continuam representando todos os lançamentos do mês, mesmo com saldo zerado ou filtros. O ranking anual identifica os maiores gastos com 🥇, 🥈 e 🥉; empates compartilham posição. Medalhas indicam volume de gasto, sem representar uma avaliação positiva.

Pix usa 💠 no filtro e nas informações compactas. O vetor de 24 px do pacote anterior foi retirado por ficar desproporcional aos emojis vizinhos. Moeda e cédula ficam para valores/dinheiro em geral, evitando confundi-los com o tipo Pix.

Nas subferramentas, a seleção usa azul com `aria-pressed`. Consultar/Novo empréstimo usa âmbar com `aria-pressed`, sem acumular fundos selecionado e neutro. Somente a aba principal Novo conserva verde. Ao trocar de ferramenta, o cabeçalho informa seu nome e a barra rola horizontalmente para mostrar a seleção, sem deslocar a página para trás do cabeçalho. O grupo Ferramentas da Central usa título neutro.

O manifesto versiona a URL dos PNGs para sinalizar a identidade própria aos navegadores. O service worker consulta o manifesto pela rede com revalidação, preservando a última cópia em falhas de conexão; não deve mantê-lo indefinidamente no caminho de cache prioritário dos recursos estáticos. O ícone Apple também tem URL versionada. A troca do ícone instalado e da tela de abertura depende do navegador e do sistema; pode exigir aceitar a atualização da identidade do app.

A entrada normal na aba Mensal seleciona o mês vigente do calendário, inclusive quando ainda não há registros. Não existe caixa de avanço nem mudança de período por quitação ou fechamento dos cartões. É possível consultar outro mês manualmente enquanto permanece na tela; uma atualização de dados preserva essa consulta. Ao tocar novamente na aba Mensal, retorna ao mês vigente. Atalhos explícitos para uma fatura respeitam o período escolhido no clique.
