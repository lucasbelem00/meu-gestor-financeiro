# Identidade visual do webapp

Estas convenções devem ser mantidas nas novas alterações, títulos, navegação e mensagens referentes aos mesmos recursos. Ícone acompanha texto; nunca é a única indicação da ação.

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
| Pix | Símbolo vetorial no filtro; 💠 em informações compactas |
| Termômetro de metas | 🎯 |
| Quantidade de lançamentos | 🔢 |
| Redução de gastos na comparação | 📉 |
| Aumento de gastos na comparação | 📈 |

📈 e 📉 indicam direção de valores; não identificam a aba Anual. Um cabeçalho genérico de grupo não substitui a identidade de cada aba.

No celular, a Central mostra o título curto “Navegação”, com “↻ Atualizar” e Fechar na mesma linha. O título pode quebrar com fonte ampliada sem empurrar as ações para baixo. No computador, conserva “Central de Navegação”. A mensagem de atualização usa “↻ Atualizando…”. 📌 acompanha despesas fixas no cadastro, menu, filtro, aba e edição; 🔁 identifica repetir um lançamento.

Todos os 12 atalhos da Central usam o mesmo fundo neutro `bg-slate-800/80`, borda `border-slate-700/80` e passagem do mouse `hover:bg-slate-700`. A cor da ferramenta fica no círculo do ícone. O atalho Empréstimo em Novo segue o fundo neutro; seleções de modo em Empréstimos usam azul. Cores de ações, alertas e confirmações continuam indicando seu significado.

O ícone do aplicativo é um desenho vetorial próprio inspirado em 💰, sem fontes ou emojis do sistema. O arquivo mestre `icons/gestor.svg` gera a mesma identidade no cabeçalho (incorporada pelo build), no favicon e nos PNGs locais `icon-192.png`, `icon-512.png` e `apple-touch-icon.png` (180 px). O fundo é opaco e o símbolo permanece na área central segura para os recortes de ícones instalados. `icon-192.svg` conserva o caminho antigo com o novo desenho.

Ao modificar o desenho mestre, exportar novamente os três PNGs e o SVG de compatibilidade antes de publicar. A compilação incorpora o mestre no cabeçalho, mas não rasteriza as imagens. Nenhum ícone instalado depende de CDN externa. O cartão 💳 continua identificando cartões e formas de pagamento.

As cores expressam o significado no contexto: verde para quitação, recebimento e redução de gastos; rosa/vermelho para aumento de gastos ou saldo que exige atenção; azul para seleção e navegação; âmbar para pendências/terceiros; cinza para estado neutro ou indisponível. Empréstimos e gastos pessoais mantêm seus contextos visuais próprios. Não julgar a situação somente pela cor nativa do emoji, que varia por aparelho.

Na comparação mensal atual, variação menor ou igual a zero usa verde; aumento usa rosa; ausência de base usa cinza. O texto e a porcentagem acompanham o ícone.

Nas listas pessoais do Histórico, Mensal e Fixos, valores pendentes usam branco e quitados usam verde. Quando disponível, o saldo restante determina a quitação. Em um pagamento parcial, a parte paga usa verde e o restante usa rosa. Assinatura ativa usa selo violeta, distinto do estado de quitação. Os indicadores e gráficos mantêm suas cores próprias. A composição conserva ⚡ À vista/1x e 🔒 Parcelado/Fixo.

Contagens mensais e anuais usam 🔢 com o período escrito. A quantidade e a média no cartão A pagar continuam representando todos os lançamentos do mês, mesmo com saldo zerado ou filtros. O ranking anual identifica os maiores gastos com 🥇, 🥈 e 🥉; empates compartilham posição. Medalhas indicam volume de gasto, sem representar uma avaliação positiva.

O símbolo Pix em `icons/pix.svg` foi extraído do Manual de Uso da Marca Pix do Banco Central, versão 1.6, de 14/05/2025 (símbolo na página 13 e cor na página 10). Mantém o tom `#77B6A8` e tamanho de 24 px; para metadados menores usa-se 💠. Fonte: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/I_manual_uso_marca_pix.pdf. O build incorpora o SVG no filtro, sem depender de download na abertura do app.

O manifesto versiona a URL dos PNGs para sinalizar a identidade própria aos navegadores. A troca do ícone instalado depende do navegador e do sistema; pode exigir aceitar a atualização da identidade do app.

A entrada normal na aba Mensal seleciona o mês vigente do calendário, inclusive quando ainda não há registros. Não existe caixa de avanço nem mudança de período por quitação ou fechamento dos cartões. É possível consultar outro mês manualmente enquanto permanece na tela; uma atualização de dados preserva essa consulta. Ao tocar novamente na aba Mensal, retorna ao mês vigente. Atalhos explícitos para uma fatura respeitam o período escolhido no clique.
