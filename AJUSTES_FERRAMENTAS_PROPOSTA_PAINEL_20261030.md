# Ferramentas diárias e proposta de organização — 30/10/2026

**Continuação concluída:** as propostas de Painel, Agenda e apresentação anual deste documento foram implementadas no [pacote seguinte](PACOTE_PAINEL_AGENDA_ANUAIS_20261030.md). As seções abaixo preservam o diagnóstico e a validação da primeira etapa; o cache atual é v68.

## Ajustes implementados localmente

1. **Cartões e Limites:** “Mostrar arquivados” aparece somente quando a lista carregada contém uma forma arquivada. Ao reativar a última, o controle some e a lista volta ao estado normal. A verificação acompanha as atualizações dos dados.
2. **Empréstimos:** os detalhes usam o mesmo formatador do Histórico/Mensal: “⚡ À vista” para 1/1, “➗ Parcela n/total” para parcelados e “📌 Fixo mensal” quando aplicável. Forma, mês e tipo podem quebrar em linhas separadas no celular.
3. **Dividir com a galera:** WhatsApp em blocos por pessoa, com parte na conta, pagamento ao estabelecimento e eventual adiantamento separados. O total da conta, o que ainda falta ao estabelecimento e os acertos entre pessoas ficam em seções próprias. Taxas/desconto/acréscimos zerados continuam omitidos.
4. **Preencher minha parte:** a descrição mantém local/itens consumidos e não acrescenta “(minha parte)”. Mantidos os limites de tamanho, os avisos antes de substituir um formulário preenchido e a proteção contra inclusão duplicada na gravação conjunta. Lançamentos já salvos não foram renomeados.
5. **Calculadora:** botão “Copiar resultado” copia somente o número, com vírgula decimal e sem separador de milhar, para facilitar colar em outro campo. Zero e valores negativos válidos são aceitos; expressão vazia, incompleta ou não finita não copia um resultado antigo. O “Copiar” do histórico de contas continua copiando a conta completa.
6. **Notas:** cada nota salva tem “Copiar”, que leva somente seu texto e preserva as quebras de linha. Isso não marca a nota como concluída nem inicia um envio para outra pessoa.

Cache da interface: `gestor-gastos-v67`. Alterações deste pacote na interface, sem nova função para executar na planilha e sem publicação automática.

## O que a linha da despesa fixa significa

O backend agrupa a série, identifica sua condição vigente no mês e lista condições futuras quando valor, descrição, forma ou categoria mudam, ou quando ainda não existe uma condição vigente.

Na imagem, “R$ 139,90 a partir de 11/2026 · Total Pass · Azul Skyline” é uma condição programada para a fatura de novembro. Não é um valor adicional a somar ao cartão nem uma confirmação de pagamento. O código mostra essa informação porque o período atual ainda não tem aquela condição vigente; o selo “Programada” reforça isso.

**Proposta de apresentação:** quando valor/nome/cartão já estão no cabeçalho, mostrar apenas “A partir da fatura 11/2026”. Em alterações futuras, destacar o que mudou, como “Novo valor a partir de 12/2026: R$ 149,90”, incluindo forma/categoria apenas se forem diferentes. Essa mudança de apresentação fica como proposta nesta etapa.

## Planilhas anuais: causa e proposta

O criador em `shared/anual.js`, `novaPlanilhaAnoGestor_`, usa uma planilha nova e acrescenta **Lançamentos**, **Empréstimos** e **Leia-me**. Ele não clona o modelo visual da base de controle. Por isso a aparência e o conjunto de abas são diferentes. Esta conclusão vem do código local, não de uma inspeção visual ao Drive nesta etapa.

**Recomendação:** padronizar a aparência das bases anuais com a identidade da planilha original: cabeçalhos, cores, formatos de moeda/data, filtros, larguras de coluna e um resumo do ano correspondente. O resumo deve consultar somente aquele ano e identificar claramente se está aberto ou fechado.

O modelo visual anual deve preservar a organização existente:

- Base de controle: cadastros, categorias, notas, configuração e acompanhamento das operações.
- Base anual: registros daquele ano e resumo para consulta.
- Anos fechados: retrato preservado; recebimentos/pagamentos posteriores continuam pelos ajustes já previstos no webapp.

Copiar todas as abas de controle, fórmulas, identificadores ou automações da base original para cada ano pode criar controles concorrentes e resumos que consultam o ano/base errados. A proposta é uma adaptação visual com referências anuais conferidas, em vez de uma duplicação indiscriminada do arquivo. É uma mudança maior, ainda não implementada neste pacote de ferramentas.

## Painel: proposta de ordem para o uso diário

Hoje o Painel intercala avisos de terceiros, vencimentos, devoluções combinadas, configuração do limite, indicadores, gráficos, pagamentos/recebimentos e Horizonte. Há vários acessos relacionados a terceiros, e o total de todo o histórico aparece com o mesmo destaque do mês atual.

Ordem recomendada:

1. **Seu mês:** total do mês, a pagar e pago. “Total registrado”, de todos os anos/meses, fica como informação secundária.
2. **O que precisa de atenção:** faturas próximas/vencidas e devoluções combinadas, com títulos e situações claros. Consolidar os avisos repetidos de terceiros; sem data combinada não deve virar atraso.
3. **Ações:** conferir fatura e registrar recebimento, junto dos resumos correspondentes.
4. **Próximos meses:** Horizonte, mantendo total registrado/previsto e saldo em aberto distintos.
5. **Análise:** distribuição por categoria e limite pessoal opcional, com configuração recolhida para não ocupar o topo diariamente.

Isso reaproveita as ferramentas existentes e melhora a sequência de leitura. Não requer novas consultas financeiras só para reorganizar a apresentação. A nova ordem fica como proposta antes de uma alteração maior do Painel.

## Espaço abaixo de Ajustes no Menu

Não é necessário ocupar o espaço com atalhos repetidos. Se a altura vazia estiver excessiva, um ajuste de distribuição/respiro já melhora a navegação.

Uma ferramenta nova com utilidade distinta seria uma **Agenda financeira**: visualizar no calendário os vencimentos bancários e as devoluções combinadas, com cores/rótulos diferentes e acesso à conferência correspondente. O Painel continuaria dando os alertas imediatos; a Agenda permitiria planejar o restante do mês. Datas de fatura, competência e devolução não podem ser misturadas, e registros sem data combinada não podem aparecer como atrasados. Proposta para discussão, não funcionalidade acrescentada neste pacote.

## Validação

**670 testes passaram, zero falhas.** CSS e arquivos públicos gerados; módulos incorporados e espelhos da interface conferidos. Nenhuma publicação ou alteração nas planilhas reais nesta etapa.

Regressões da divisão preservam os centavos, distinguem pagamento ao estabelecimento de acerto entre pessoas e mantêm a proteção de preenchimento/rascunhos. Cópia da calculadora verifica zero, negativos, expressão incompleta e formato decimal; cópia de notas preserva o texto atual e não copia uma nota removida.
