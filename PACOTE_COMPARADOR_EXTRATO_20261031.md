# Comparador de preços, conferência e Menu

- `interface/conferencia.js`: conversão de unidades e comparação por quantidade; leitura CSV UTF-8 local, escolha de colunas e comparação conservadora por data e valor, sem gravações financeiras.
- Menu: grupos em duas colunas a partir de 1024 px; no celular permanece a grade de atalhos. Comparador em Ferramentas; conferência em Dados e relatórios.
- O comparador é a sexta ferramenta integrada: abre com a mesma barra de alternância de Empréstimos, Dividir c/ Galera, Simular Compra, Calculadora e Notas. Alternar preserva os campos e resultados durante a sessão; a seleção aparece também ao reabrir o Menu. Conferir extrato permanece como tela de Dados e relatórios.
- Resultados em cartões: título separado, produto, preço normalizado em destaque, composição do conjunto e diferença por kg/L/unidade e em percentual. Empates são indicados. A unidade da primeira opção define o padrão das demais e de novas opções; escolhas manuais nas outras opções são preservadas para permitir g/kg e mL/L. Mudanças de campos invalidam o resultado anterior.
- Ícones: ⚖️ comparar preços; 🔎 conferir extrato. A balança comunica comparação; a lupa conserva o significado de examinar/procurar. Os atalhos do Menu não usam setas adicionais.
- Diagnóstico copiável: código, versão da ferramenta, etapa, horário, posição do registro inválido e contagens. Uma lista fechada impede copiar mensagens arbitrárias do servidor ou conteúdo do CSV. Não grava o arquivo no armazenamento local nem o envia à API.
- Limites: CSV com cabeçalho, até 2 MB, 5.000 registros e 100 colunas. Separadores vírgula, ponto e vírgula ou tabulação. Datas dd/mm/aaaa ou aaaa-mm-dd. Moeda com até duas casas. Despesas de sinal oposto/zero são desconsideradas com contagem explícita; estornos exigem conferência separada.
- Escopo: selecione uma única fatura no arquivo e sua forma/mês no app. O CSV não é filtrado pela data de compra, pois compras e competência podem cair em meses diferentes. Gastos de terceiros entram mesmo recebidos; recebimento não quita o banco.
- Resultados: candidatos (não prova de identidade/quitação), ambiguidades preservadas, só CSV e só app. Datas de postagem distintas e agrupamentos podem gerar diferenças legítimas.

## Testes manuais para publicar

1. Compare 3 pacotes de 500 g a R$ 12 com 1 kg a R$ 9: deve indicar R$ 8/kg e R$ 9/kg. Não compare massa com volume.
2. Exporte uma única fatura como CSV UTF-8, escolha separador e confira as três colunas.
3. Compare com mês/forma corretos; confira candidatos pelas descrições, inclusive compras para terceiros já recebidas.
4. Duplique uma linha no CSV: o grupo deve ficar ambíguo, sem consumir automaticamente outro registro.
5. Use uma data impossível: deve indicar DATA_INVALIDA e a posição do registro. A posição considera registros não vazios, incluindo o cabeçalho, e não linhas físicas dentro de descrições com quebra.
6. Copie o diagnóstico e confira que nomes, valores e descrições não aparecem. Sem permissão de clipboard, selecione o texto exibido e copie manualmente.
7. Troque arquivo, coluna, sinal, mês ou forma durante a consulta: resposta anterior não deve preencher a nova comparação.
8. Confira Menu em computador e celular, seleção da ferramenta aberta, Voltar e ausência de rolagem horizontal.

Nenhuma nova função precisa ser executada na planilha. A ferramenta usa a consulta mensal já existente. Publicar a interface atualizada e seu service worker; nenhuma implantação é feita pelo gerador local.
