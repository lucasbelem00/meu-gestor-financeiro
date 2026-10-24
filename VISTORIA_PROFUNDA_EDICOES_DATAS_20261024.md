# Vistoria profunda: datas, edição e recebimentos — 24/10/2026

Continuação da [lista consolidada](VISTORIA_CONSOLIDADA_MOBILE_20261024.md). Esta rodada investigou funções ativas, seus ajustes posteriores no arquivo, retorno de operações demoradas e ações repetidas no mesmo editor. Não implementa correções.

## 1. Alta prioridade: data visível do empréstimo pode diferir da enviada

**Reprodução:** o formulário foi inicialmente preenchido com 16/10/2026. Seus campos visíveis foram alterados para 07/09/2026. O envio passou pela validação do calendário, mas o payload continuou com 16/10/2026. Executar esse payload no backend real, sobre a planilha fictícia, gravou 16/10/2026.

**Causa:** o mapeamento de campos do contexto `emp` em `sincronizarDataTripla` contém o checkbox `chkPixRecebimento` antes dos campos de dia, mês, ano e data completa. A função espera apenas os quatro campos de data. Ela lê as posições erradas e não sincroniza o valor completo que o envio usa. A validação de calendário consulta os campos visíveis corretos; por isso ela não percebe a divergência com o payload.

O cálculo da fatura também lê a data completa antiga. Assim, não basta corrigir apenas a exibição: a referência usada para calcular a fatura e para salvar precisa ser a mesma.

**Controles:** o preenchimento direto por `preencherDataTripla('emp', ...)` atualizou o valor completo corretamente. A sincronização do contexto Novo também funcionou. O defeito confirmado é a sincronização de alterações digitadas no cadastro de empréstimos, não todo registro de data do app.

**Correção proposta:** separar a opção de parcelamento do mapeamento de datas, unificar a obtenção da data válida e derivar o payload dessa mesma referência. Rejeitar uma data impossível preservando o texto digitado. Cobrir alteração manual, Hoje/Ontem, restauração de rascunho e transferência do simulador; verificar data e fatura na prévia e após a gravação.

Código: [sincronização](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:1995), [cálculo da fatura](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:3613), [envio final](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:6820).

## 2. Algumas ações do editor continuam bloqueadas após sucesso

Foram reproduzidos dois casos independentes:

- Receber parcialmente: após uma resposta de sucesso, fechar e reabrir o editor manteve o botão desativado com Processando....
- Mover para Pessoal: após sucesso, abrir outro empréstimo manteve o botão desativado com Transferindo....

As funções desativam os botões durante o envio, mas só restauram texto e disponibilidade no caminho de erro. A abertura do editor limpa os campos auxiliares e esconde os painéis, mas não restaura esses controles. Assim, a ação funciona na primeira vez e fica indisponível na próxima abertura dentro da mesma página.

**Controle:** uma rejeição simulada no recebimento parcial restaurou o botão corretamente. O defeito confirmado é o caminho de sucesso, não qualquer falha de rede.

**Correção proposta:** tratar o estado da ação separadamente do estado da janela e restaurar os controles quando ela termina de forma confirmada. Inicializar o editor com o estado correto de cada operação. Para resultado incerto, preservar a pendência e orientar a consultar confirmação; não liberar uma nova operação financeira como se a anterior tivesse sido cancelada.

Código: [abertura do editor](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:3849), [recebimento parcial](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:3922), [transferência](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:3946).

## 3. Resposta atrasada pode fechar a edição de outro empréstimo

**Reprodução:** iniciar a gravação de uma observação no empréstimo A, fechar seu editor enquanto o envio aguarda resposta, abrir o empréstimo B e começar uma observação. A resposta de sucesso de A fechou a janela que agora mostrava B.

No ensaio, foi enviada apenas a alteração de A. Não ocorreu gravação no registro errado. O defeito está no efeito da resposta sobre uma janela já reutilizada: o sucesso antigo chama o fechamento sem verificar se aquele editor ainda pertence ao mesmo registro e à mesma sessão de edição.

**Correção proposta:** identificar cada abertura do editor. Respostas podem atualizar o resultado da operação original, mas só devem fechar ou modificar campos se a janela continuar pertencendo àquela abertura. O envio protegido deve continuar guardado mesmo se a janela for fechada.

Código: [salvamento da edição](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:3884), [fechamento](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:3882).

## 4. Prévia das parcelas não mostra a distribuição exata dos centavos

**Reprodução:** Novo e Empréstimos mostram 3x de R$ 33,33 para um total de R$ 100. O backend de lançamento distribuiu corretamente R$ 33,34 + R$ 33,33 + R$ 33,33, preservando os R$ 100.

O problema confirmado está na informação apresentada antes de salvar. Não foi constatada perda de centavos na gravação desse ensaio. Quem compara com a fatura pode interpretar a parcela de R$ 33,34 como uma diferença inesperada.

**Correção proposta:** usar a mesma regra de centavos na prévia e na gravação. Exemplo compacto: 1x R$ 33,34 + 2x R$ 33,33. Quando todas forem iguais, manter o formato curto atual. O simulador já possui um resumo que agrupa parcelas de valores diferentes; a apresentação pode seguir essa ideia.

Código: [prévia pessoal](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:2782), [prévia de empréstimo](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:3564).

## 5. Melhoria de usabilidade: proteger alterações ainda não salvas no editor

**Comportamento observado:** modificar a observação de um empréstimo, usar Cancelar e reabrir trouxe a observação salva originalmente. Não houve pergunta nem cópia recuperável da alteração em elaboração.

Cancelar normalmente significa abandonar uma edição, portanto esse comportamento, isoladamente, não comprova corrupção de dados. Ainda assim, no celular é fácil tocar no botão por engano depois de preencher vários campos. A proteção proposta para Limpar no cadastro não cobre os editores existentes.

**Melhoria proposta:** detectar se houve mudanças. Ao fechar um editor alterado, oferecer Continuar editando ou Descartar alterações, ou manter uma cópia recuperável. Fechar sem mudanças deve continuar imediato. Não adicionar confirmação a toda alteração de campo.

Para o recebimento parcial, refinar também a proposta já acumulada de Registrar recebimento: exibir Pessoa, parcela, recebido agora e saldo após receber numa prévia curta. Isso explica a operação sem exigir conhecer a divisão interna do registro em duas linhas.

## Correção de um apontamento da rodada anterior

A afirmação anterior de que colar R$ 150.00 preencheria R$ 15.000,00 foi retirada. O primeiro ensaio extraiu uma função antiga sem aplicar sua substituição posterior em `window.extrairValorPixAoColar`.

O ensaio foi corrigido para usar a função efetivamente ativa e repetido: R$ 150,00 e R$ 150.00 retornam 150; R$ 1.234,56 retorna 1234,56. Esse não é um defeito pendente da versão atual.

**Permanece confirmado com a função ativa:** texto com vários valores seleciona o primeiro e substitui o campo já preenchido. O exemplo fictício com saldo de R$ 900 e transferência de R$ 25,50 continuou preenchendo R$ 900 no lugar dos R$ 80 manuais. A lista consolidada foi corrigida para refletir somente essa pendência.

Código ativo: [colagem final](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:7023).

## O que foi testado e funcionou

Além dos controles de data e de recuperação do botão no caminho de erro:

- Uma dívida fictícia de R$ 100 no cartão recebeu dois pagamentos da pessoa de R$ 33,33, restando R$ 33,34.
- O total dos três registros permaneceu R$ 100.
- Os R$ 20,01 registrados anteriormente como pagamento ao banco permaneceram R$ 20,01.
- Repetir cada recebimento com o mesmo requestId não duplicou os valores.
- Tentar outra operação com a versão antiga do registro foi recusado.

Esses controles ajudam a separar a falha do botão na interface de uma falha financeira no recebimento parcial. Não demonstram que todas as combinações possíveis estejam corretas.

## Prioridade e continuidade

1. Acrescentar a divergência de data aos problemas de integridade do próximo pacote, junto da duplicação de fixos, backup e recarga concorrente já registrados.
2. Corrigir o ciclo dos botões e a associação entre resposta e sessão de edição.
3. Alinhar as prévias de centavos e proteger o abandono de alterações relevantes.
4. Aplicar as melhorias móveis acumuladas, preservando os controles financeiros independentes e as cinco abas principais.

As novas tarefas também estão no [checklist único](VISTORIA_CONSOLIDADA_MOBILE_20261024.md). As demais pendências anteriores continuam abertas; a retirada do falso positivo de ponto decimal não as elimina.

## Método e limites

- Nove cenários direcionados nesta rodada, usando funções atuais de `index.html`, inclusive o ajuste final das opções antigas do editor, e o backend do repositório em planilhas fictícias.
- Promessas controladas simularam respostas demoradas; o teste de data percorreu o preparo do envio e a gravação no backend em memória.
- O ensaio anterior de preenchimento foi atualizado para aplicar a substituição final da colagem e repetido em seus seis cenários.
- Não foi feita nova inspeção visual em celular físico nem executada novamente a suíte completa. As propostas de disposição e texto precisam de conferência visual após implementação.
- Não houve alteração de código funcional, publicação, consulta ou gravação em planilhas reais.

Artefatos: [ensaio desta rodada](C:/Users/lucas/Documents/Codex/vistoria-profunda-fluxos-20261024.cjs), [resultado](C:/Users/lucas/Documents/Codex/vistoria-profunda-fluxos-20261024.log), [ensaio anterior corrigido](C:/Users/lucas/Documents/Codex/vistoria-preenchimento-mobile-20261024.cjs).
