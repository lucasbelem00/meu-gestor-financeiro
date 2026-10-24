# Vistoria de uso diário e recuperação — 24/10/2026

## Avaliação geral

A navegação principal é reconhecível: Novo, Painel, Histórico, Mensal e Menu. As cores ajudam a distinguir gastos pessoais, terceiros e pagamentos. O Menu já agrupa as funções e o modal de fatura permite conferir cartão, mês, total, pagamento e saldo antes de confirmar.

As dificuldades estão na consulta diária: algumas ações importantes ficam depois de bastante conteúdo, certos rótulos continuam iguais quando o contexto muda e algumas mensagens obrigam a pessoa a interpretar a regra financeira. A prioridade é reduzir esses pontos, preservando as cinco abas principais e a estrutura conhecida.

## Achados novos, com evidência

### 1. Alta prioridade: o próprio backup pode ser recusado por conter datas

**O que acontece:** exportar um arquivo com a data da compra, mês da fatura ou parcela armazenada pelo Google Sheets como Date produz um arquivo que a validação da restauração não aceita.

**Reprodução:** três ensaios separados com o backend atual, dados fictícios e o arquivo exportado sem editar seu conteúdo. Os erros foram, respectivamente, “Data no backup inválida”, “Mês da fatura inválido” e “Parcelamento inconsistente no backup”. A planilha em memória permaneceu intacta: a validação bloqueia a recuperação antes de substituir os dados.

**Causa:** a exportação preserva células Date como objetos tipados, mas partes da validação exigem texto de data, mês e parcela. Há uma inconsistência entre o formato que o app produz e o formato que ele aceita.

**Melhoria proposta:** compatibilizar a leitura dessas três colunas conforme seu significado e testar exportação → prévia com arquivos reais do próprio exportador, preservando fórmulas permitidas, IDs e os dados originais. Trata-se de reparar a recuperação existente; a expansão da restauração completa continua adiada.

Código: [exportação](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:1992), [validação](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:4285).

### 2. Valor digitado para uma fatura permanece ao trocar o mês

**O que acontece:** digitei R$ 50 para outubro e troquei para novembro. O resumo passou a mostrar a fatura de novembro, de R$ 80, mas o campo de pagamento manteve R$ 50 sem avisar que era o valor preenchido no contexto anterior.

**Risco prático:** a pessoa pode confirmar um valor que estava preparando para outro cartão ou mês. A prévia de confirmação continua existindo e valores acima do saldo são recusados; não foi demonstrada uma gravação sem confirmação.

**Melhoria proposta:** limpar o valor ao mudar cartão ou mês, ou pedir sua reconfirmação. Ao apenas recarregar o mesmo cartão/mês, preservar o preenchimento.

Evidência: navegador, ambiente isolado. Código: [conferência](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:7448).

### 3. Resumo de Empréstimos não acompanha o filtro Recebidos

**O que acontece:** após receber uma parcela fictícia de R$ 70 e selecionar Recebidos, a parcela aparece corretamente como recebida, mas o resumo da pessoa destaca “A Receber: R$ 0,00” e oferece “Cobrar no WhatsApp”. O total recebido não é destacado no resumo.

**Limite do problema:** o cálculo está preservado. O gerador de mensagem reconhece o filtro Recebido e usa “Total Recebido”; não foi constatada cobrança de uma dívida inexistente. A inconsistência está no resumo e no nome do botão.

**Melhoria proposta:** em Recebidos, mostrar “Recebido: R$ 70,00” e “Compartilhar resumo”. Em A Receber, manter saldo e cobrança. Em Todos, distinguir os dois totais.

Também foi confirmado o estado vazio depois de receber: manter o filtro A Receber retira corretamente o item da lista, mas o texto “Nenhum registro para o filtro selecionado” não explica o que aconteceu. Uma mensagem como “Nenhum valor a receber neste filtro” e o atalho Ver recebidos ajudariam sem limpar os filtros do usuário.

Código: [resumo](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:3732), [mensagem gerada](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:3965).

![Filtro Recebidos com resumo A Receber zerado, usando dados fictícios](C:/Users/lucas/Documents/Codex/vistoria-recebidos-usabilidade-20261024.png)

### 4. Seletores do Mensal sem nome acessível

**O que acontece:** os seletores de mês e ano não possuem label associado, aria-label ou aria-labelledby. A árvore de acessibilidade mostra o valor selecionado, mas não identifica adequadamente a finalidade do campo.

**Melhoria proposta:** fornecer nomes como Mês da fatura e Ano da fatura, mantendo o visual compacto. Isso ajuda leitores de tela e comandos por voz.

Evidência: atributos do DOM e árvore de acessibilidade no navegador. Código: [seletores](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:513).

## Melhorias de usabilidade propostas

1. **Aproximar consulta e ações frequentes.** Em Empréstimos, o formulário completo de cadastro vem antes da consulta e da cobrança. Oferecer Consultar e Novo empréstimo, ou recolher o cadastro quando a pessoa estiver consultando registros, reduz a rolagem. Preservar o acesso direto ao cadastro pelo atalho do Novo Registro.
2. **Dar prioridade ao pagamento e ao recebimento no Painel.** Os botões existentes ficam depois do Horizonte. Um acesso compacto antes da tabela, com nomes Registrar pagamento da fatura e Registrar recebimento, facilitaria encontrá-los. Preferir reposicionar as ações existentes em vez de repetir botões por toda a tela.
3. **Deixar claro o período e o escopo dos indicadores.** Em aberto, Pago, Compromisso e Registrado exigem interpretação. Um título do grupo, como Seus gastos de outubro, e uma distinção visível entre o mês atual e períodos futuros ajudam mais que explicações longas em cada cartão.
4. **Reduzir texto permanente no Horizonte.** Manter uma orientação curta e reunir as regras em Entenda os valores, expandível. Os detalhes por valor continuam disponíveis. A tabela deve permanecer próxima da ação que a pessoa quer executar.
5. **Sinalizar filtros ativos.** Exibir um resumo curto dos filtros e Limpar filtros onde houver resultados vazios. Os seletores móveis cortam textos como Todas as Pessoas; chips com as escolhas ou opções curtas ajudam a reconhecer o contexto.
6. **Revisar dicas antigas.** O atalho Empréstimo no Novo Registro ainda menciona compra no cartão, embora a ferramenta aceite Pix. Usar uma descrição compatível com as formas disponíveis.

As três situações Não pagos, Parciais e Quitados e a ordem crescente das parcelas continuam propostas anteriores; não são achados novos desta vistoria.

## O que funcionou na verificação

- Menu com agrupamentos reconhecíveis e navegação principal preservada no celular e no computador.
- Conferência da fatura mantém mês, total, pago e saldo separados, com prévia antes da gravação.
- Modal da fatura possui rolagem interna em tela de 390 × 600; não foi reproduzido corte que impedisse chegar aos controles.
- Recebimento fictício passou pela confirmação, atualizou a lista e os indicadores; o limite bancário continuou ocupado, como esperado antes de pagar o cartão.
- Filtrar Recebidos trouxe de volta a parcela recebida. O sumiço no filtro A Receber foi apenas efeito do filtro.
- Nenhum erro ou aviso no console na consulta do Mensal observada.

## Ordem sugerida

1. Corrigir a compatibilidade do backup e a recarga concorrente já apontada na vistoria anterior.
2. Corrigir a troca de contexto no pagamento, os resumos de Recebidos e os nomes acessíveis.
3. Aplicar a simplificação de filtros e a ordenação das parcelas já propostas.
4. Ajustar a posição das ações, os estados vazios e as explicações do Painel e de Empréstimos.

O isolamento do rascunho da rachadinha entre abas também continua registrado na vistoria anterior. Não houve ampliação de recursos de restauração nem reorganização maior de desempenho nesta revisão.

## Método e limites

- Código local atual, inspeção de DOM, árvore de acessibilidade e navegação em ambiente isolado, com larguras de 390 e 1280 pixels.
- O servidor usou o proxy e o backend reais com planilhas e credenciais fictícias em memória; chamadas externas ao Google foram bloqueadas no servidor de teste.
- Os três ensaios de backup foram executados por `C:/Users/lucas/Documents/Codex/vistoria-usabilidade-20261024.cjs`.
- Não foi executada novamente a suíte completa nesta vistoria. Os 239 testes da entrega anterior não demonstram que estes casos novos funcionam.
- Não houve alteração de código funcional nem de planilhas reais. Os recebimentos feitos pelo navegador existiram somente na memória do servidor local de teste. Este relatório apresenta as correções para revisão antes de implementá-las.
