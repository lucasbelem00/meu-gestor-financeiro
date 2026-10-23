# Filtros, sincronização e divisão de contas

Pacote implementado localmente em 23/10/2026. A publicação no Apps Script e na Vercel é separada; os testes deste pacote usam somente dados fictícios.

## Checklist das alterações

- [x] Mensal: combinar forma, categoria, tag, situação e tipo de gasto.
- [x] Selecionar várias opções do mesmo grupo (OU) e combinar grupos diferentes (E).
- [x] Mostrar quantidade, soma, valor pago e saldo da seleção, sem duplicar lançamentos.
- [x] Manter os indicadores gerais identificados como valores do mês completo.
- [x] Incluir Limpar filtros, categorias em ordem alfabética e Outros 📦 no final.
- [x] Tornar À vista / 1x e Parcelado / Fixo filtros clicáveis.
- [x] Mostrar pagamentos parciais nos filtros Com pagamento e Com saldo e em um filtro próprio.
- [x] Mostrar valor pago e saldo no cartão do lançamento parcialmente pago.
- [x] Preservar filtros válidos e posição na recarga do mesmo mês; preservar foco de teclado nos controles reconstruídos.
- [x] Unificar a implementação dos filtros; a versão ativa já tinha comparação exata de tags e essa regra foi preservada.
- [x] Painel: atalhos abaixo do Horizonte para conferir faturas e registrar recebimentos de terceiros.
- [x] Explicar permanentemente que pagar o cartão e receber da pessoa são registros separados.
- [x] Conferência da fatura: discriminar gastos pessoais e gastos de terceiros.
- [x] Mensal: manter Conferir pagamento junto ao nome, à esquerda, com os valores alinhados à direita; destacar Pago em verde e Saldo restante em rosa nos pagamentos parciais.
- [x] Corrigir o texto do aviso de vencimento: o saldo pode incluir terceiros, portanto não é rotulado como exclusivamente pessoal.
- [x] Atividade: instruções por situação e ajuda expansível, com detalhes e diagnóstico no próprio cartão da pendência.
- [x] Diagnóstico: separar resposta recebida de operação confirmada e identificar diferenças fora das linhas previstas.
- [x] Diário malformado: manter diagnóstico e consultas disponíveis quando a estrutura financeira permite; bloquear novas gravações.
- [x] Recuperação: oferecer prévia e confirmação apenas para inclusões cujas linhas já estejam integralmente gravadas.
- [x] Preservar partes originais do diário, diferenças externas e aprovação durável no cabeçalho; recusar prévia desatualizada e identidades duplicadas.
- [x] Rachadinha: serviço configurável, desconto, acréscimos, cotas diferentes e múltiplos pagadores.
- [x] Separar saldo devido ao estabelecimento dos acertos entre pessoas.
- [x] Editar itens e nomes; confirmar remoções; impedir remoção de pessoa que deixaria um item sem consumidores.
- [x] Guardar rascunho da divisão e preservar sua identificação de envio entre recargas.
- [x] Preparar divisão rápida no modo detalhado para identificar pessoas.
- [x] Registrar a parte pessoal e os empréstimos com prévia, uma única operação recuperável e reenvios protegidos.
- [x] Permitir excluir a parte pessoal da gravação quando ela já tiver sido lançada.
- [x] Permitir marcar na prévia quem já devolveu o dinheiro, mantendo o pagamento ao banco independente.
- [x] Permitir desfazer a gravação conjunta em Atividade, se os registros não tiverem sido alterados depois.
- [x] Usar a mesma fonte do cálculo no navegador e no servidor; recalcular e validar a prévia antes de gravar.
- [x] Protocolo do servidor 6 e cache do aplicativo `gestor-gastos-v26`.

## Publicação para testar

1. Atualize o projeto do Apps Script com **Backend/Code.gs** e **Backend/Index.html** (ou use o arquivo **Backend/Index_para_colar.txt** para copiar a interface).
2. Atualize a implantação do Apps Script para uma nova versão, mantendo o endereço e as configurações já usados pelo app.
3. Envie as alterações do projeto pelo GitHub Desktop para atualizar a implantação de teste da Vercel.
4. Abra a versão de teste e atualize o app. As funções novas avisam se a implantação do servidor ainda for antiga.

Não é necessário criar abas técnicas ou apagar o diário manualmente.

## Sua pendência atual

Depois de publicar as duas partes, abra **Menu → Atividade e sincronização → Pendentes**. Primeiro use **Consultar confirmação**. Se a pendência continuar, use **Conferir recuperação segura**.

O app só oferece a conclusão quando todas as linhas previstas já coincidem com a inclusão original, as identidades não estão duplicadas e o histórico técnico pode ser concluído. Ele mostra uma prévia antes de **Concluir sem repetir**. As demais linhas são preservadas. Se a conferência não passar, copie o diagnóstico; não force a confirmação nem cadastre outro lançamento igual.

Esta verificação ainda precisa ocorrer na sua implantação real. A simulação local passou pelo fluxo completo e terminou com zero pendências.

## Roteiro curto de testes no app

1. **Filtros:** combine cartão + categoria + À vista; acrescente outra categoria, confira a soma e use Limpar filtros.
2. **Pagamento parcial:** confira uma fatura fictícia, registre parte do saldo e confira Com pagamento, Com saldo e Parcialmente pagos. Confira que receber de terceiros continua independente.
3. **Rachadinha simples:** R$ 100,01 entre três pessoas deve resultar em R$ 33,34, R$ 33,34 e R$ 33,33.
4. **Opções:** experimente meia cota, desconto, serviço de 12% e acréscimo; a soma das partes deve coincidir com o total.
5. **Pagadores:** informe valores adiantados por duas pessoas e confira os acertos. A pendência com o estabelecimento aparece separada.
6. **Registro:** identifique quem é você, informe como pagou, confira sua parte e os empréstimos na prévia e marque uma devolução já recebida. Verifique Histórico, Empréstimos e Painel após gravar.
7. **Rascunho:** prepare uma divisão e recarregue a página; os itens e pessoas devem continuar disponíveis.
8. **Proteção:** tente remover quem é o único consumidor de um item; o app deve preservar o item e orientar a redistribuição.

Limpar a ferramenta remove apenas o rascunho. Não exclui registros já gravados. Uma divisão já enviada deve ser conferida em Atividade antes de preparar outro envio; use Limpar para começar uma nova conta após confirmar a anterior.

## Organização e limites

- `shared/rachadinha.js`: fonte do cálculo em centavos.
- `interface/rachadinha.js` e `interface/sincronizacao.js`: fontes das interfaces novas.
- `npm run build`: incorpora essas fontes no HTML e no Apps Script, compila o CSS e prepara `dist/`.
- `node --test`: executa os testes locais com planilhas em memória.
- Até 100 pessoas e 500 itens por divisão. A taxa incide sobre o consumo após o desconto; os acréscimos não recebem outra taxa.
- Os acertos entre múltiplos pagadores são uma distribuição possível dos saldos, apresentada para conferência; nenhum Pix é enviado pelo app.
- A restauração ampliada de backups e uma reorganização maior de desempenho permanecem adiadas.

## Evidências de verificação

Conferência final: **163 testes aprovados, zero falhas**. CSS compilado com 39.861 bytes, interfaces sincronizadas e pasta pública gerada. O navegador não registrou erros nos fluxos conferidos.

- Testes de cálculo, rejeição de entradas inválidas, 300 combinações de centavos, gravação Pix/cartão, recebimento já realizado e parcelamento do cartão.
- Interrupção simulada em Lançamentos, Empréstimos e atividade; retomada sem duplicação.
- Recuperação com diferença externa, prévia vencida, aprovação com resposta perdida e diário malformado.
- Navegador → proxy local → Apps Script simulado → planilha em memória → atualização de Histórico, Empréstimos e Mensal.
- Conferência pelo navegador dos filtros combinados, pagamento parcial e recuperação de uma pendência fictícia.
- A validação no celular físico e na implantação real permanece no roteiro acima.
