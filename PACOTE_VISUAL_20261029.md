# Pacote visual de 29/10/2026

Registro do pacote v56. O ajuste posterior v57 usa 💠 também no filtro Pix, retira o vetor e corrige navegação e formulários; conferir `AJUSTES_EMPRESTIMOS_NAVEGACAO_20261029.md` para a situação atual.

## Checklist aplicado

- [x] Todos os 12 atalhos da Central com fundo, borda e passagem do mouse iguais; cor própria no círculo do ícone.
- [x] Atalho Empréstimo em Novo neutro e modos selecionados de Empréstimos em azul.
- [x] Histórico 🧾, Notas 📝, Fixos 📌, Repetir 🔁, Parcelados ➗, Metas 🎯, Mensal 📅 e Anual 📆.
- [x] Símbolo Pix local de 24 px no filtro e 💠 em informações compactas, escolhido pelo tipo de pagamento.
- [x] Valores pessoais pendentes em branco e quitados em verde; saldo parcial em rosa; assinatura ativa em violeta.
- [x] Composição da fatura preservada: ⚡ À vista/1x e 🔒 Parcelado/Fixo.
- [x] Quantidade de lançamentos com 🔢 e período explícito; quantidade e média do cartão A pagar sempre representam o mês completo. Percentual quitado e maior gasto permanecem nos respectivos cartões.
- [x] Categorias em Mais filtros, incluindo as com gastos sem meta. A seleção é compartilhada com o termômetro; Outros aparece com 📦.
- [x] Não pagos, Parciais e Quitados mantidos. A pagar seleciona Não pagos + Parciais; Pago seleciona Parciais + Quitados. Os botões mostram a mesma seleção e permitem refiná-la. Dentro de um grupo as opções se somam; entre grupos se combinam.
- [x] Ranking anual de maiores gastos com medalhas nas três primeiras posições; empates compartilham posição e categorias sem gasto não ocupam o ranking.
- [x] URLs dos ícones próprios versionadas no manifesto e cache PWA v56. Protocolo de dados mantido em 16.

## Validação

594 testes automatizados passaram, sem falhas ou testes ignorados. As regressões deste pacote cobrem filtros agregados, refinamento sem seleção oculta, somas sem duplicação, categorias sem meta, resumo com emoji, cores, Pix renomeado e ranking com empates.

Prévia local no navegador com dados fictícios: filtros e refinamento conferidos, ranking presente e todos os 12 atalhos com o mesmo fundo e borda computados. Menu verificado em 390 × 844 e 320 × 720, sem transbordamento lateral. Essa prévia não consulta a planilha nem testa gravações reais.

Os HTMLs de distribuição são gerados a partir da raiz. Não editar as cópias separadamente. A documentação das funções e convenções está em `MAPA_DO_CODIGO.md` e `IDENTIDADE_VISUAL.md`; esta última contém a origem do símbolo Pix.

## Para disponibilizar

O build prepara `dist/` e os HTMLs do Apps Script; não publica os serviços. Publicar o frontend e atualizar o HTML da implantação Apps Script utilizada, conforme o guia de continuidade. Este pacote visual não acrescenta função a executar na planilha nem requer nova ativação de backups.

A mudança do ícone já instalado depende do navegador e pode exigir aceitar a atualização da identidade do aplicativo. Não é necessário apagar dados locais para atualizar o ícone.
