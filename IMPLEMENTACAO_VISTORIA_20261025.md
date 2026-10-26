# Implementação da vistoria de 25/10/2026

Escopo autorizado: nove correções e quatro melhorias da vistoria. Testes somente com dados fictícios; publicação e dados reais fora desta etapa.

- [x] 1. Normalizar mês nativo nos recebimentos e movimentações. Recebimento parcial, recebimento em lote e transferências entre pessoal e empréstimos conservam a competência. Os testes conferem também o valor pago e o saldo bancário.
- [x] 2. Conservar períodos intermediários de despesas fixas com mudança futura. Uma alteração para janeiro mantém as condições anteriores em novembro/dezembro. A projeção continua limitada aos meses já existentes no Horizonte.
- [x] 3. Preservar arquivos anuais das abas ausentes em restauração parcial. A prévia mostra o resultado combinado. Identificações repetidas entre registros ativos e preservados bloqueiam a substituição.
- [x] 4. Recuperação explícita quando o arquivo anual original está indisponível. Exige JSON v2 completo com os anos afetados, nova conferência do estado dos arquivos e confirmação específica. Guarda os dados legíveis, o catálogo, o diagnóstico e imagens de arquivos que ainda abrem mas divergem da conferência. As imagens divergentes ficam separadas dos dados restaurados. Os originais do Drive não são apagados.
- [x] 5. Remover somente o rascunho correspondente ao envio concluído. Inclui confirmação online, guarda na fila offline e confirmação posterior pela central. Campos alterados durante a espera permanecem. Uma cópia herdada recebe comprovante do conteúdo exato enviado; uma alteração em outra página continua recuperável, sem excluir sua chave.
- [x] 6. Limpar o gráfico do Painel quando não houver gastos. Remove a instância e a configuração adiada e mostra “Nenhum gasto neste mês”. Novos dados voltam a montar o gráfico.
- [x] 7. Proteger a data combinada ao transferir uma simulação. A data participa tanto da detecção de preenchimento quanto do snapshot de envio do empréstimo.
- [x] 8. Preservar fórmulas originais e textos literais na manutenção. O plano verifica conteúdo e natureza da célula, inclusive após interrupção. Fórmulas personalizadas com referências a células bloqueiam a compactação, pois mover linhas exigiria ajustar também referências em outras abas; nenhuma referência é adivinhada.
- [x] 9. Incluir links, seletores e ajuda na navegação do modal por teclado. Tab e Shift+Tab consideram todos os controles visíveis e habilitados, mantendo o foco dentro da exportação.
- [x] 10. Prévia para alterar a data desta parcela ou das próximas a receber. A escolha padrão é individual. O lote exclui parcelas recebidas e anteriores, repete o dia nos meses seguintes e ajusta meses curtos. Uma prévia antiga é rejeitada se qualquer parcela afetada mudar. Pagamento ao banco e mês da fatura não são alterados pelo ajuste de datas.
- [x] 11. Mostrar separadamente pagamento ao banco e recebimento da pessoa. Os cards mostram “Banco quitado” ou seu saldo e “Recebido da pessoa” ou quanto ela ainda deve. Para Pix à vista, o texto informa “Pagamento realizado”. Valores ficam juntos na mesma linha no celular.
- [x] 12. Escolher rateio dos acréscimos por consumo ou igualmente por pessoa. O padrão continua proporcional ao consumo. “Igual por pessoa da mesa” divide entre todos os participantes, sem considerar cotas. Serviço e desconto mantêm suas regras. A mensagem de WhatsApp informa a regra dos acréscimos e omite taxas/descontos zerados. A escolha é guardada no rascunho e faz parte da conta conferida pelo servidor.
- [x] 13. Mostrar data e hora do último backup confirmado, além do mês de referência.

## Validação

Validação concluída em **26/10/2026**:

- **405 testes aprovados, zero falhas**, incluindo 26 regressões adicionais sobre a base de 379 testes da vistoria.
- Build concluído, com CSS compilado de 40.688 bytes. Interface principal, duas cópias do Apps Script e pacote estático conferidos como idênticos.
- `git diff --check` aprovado.
- Planilhas, Drive e armazenamento usados nos testes eram fictícios. Nenhum teste acessou dados financeiros reais.
- Log completo: `C:/Users/lucas/Documents/Codex/gestor-vistoria-20261025-final.log`.

O servidor local e a aba de teste foram encerrados após a conferência.

Conferência no navegador local, em desktop e viewport de celular de 390 × 844:

- Editar as três datas para 31/01, 28/02 e 31/03 mostrou a prévia antes de salvar; a resposta atualizou a lista sem mudar a fatura ou os recebimentos.
- O cartão quitado ao banco continuou mostrando o valor devido pela pessoa; as parcelas seguintes mantiveram seu saldo bancário.
- Comida de R$ 100, bebida de R$ 50 e acréscimos de R$ 30, divididos entre duas pessoas: R$ 65 e R$ 115. A prévia de WhatsApp informou a divisão igual dos acréscimos e não mostrou serviço/desconto zerados.
- Tab chegou ao link da pasta e à ajuda final dos backups.
- Lançamento Pix fictício de R$ 25,50 foi confirmado e apareceu uma vez no Histórico.
- Outro rascunho foi preenchido, reaberto e enviado; apareceu uma vez, por R$ 12,00, e sua origem deixou de ser oferecida como rascunho recuperável após nova abertura.

## Publicação

O protocolo do backend passou para **11** e o cache do app para **v41**. A interface, suas duas cópias do Apps Script e o CSS compilado são sincronizados pelo build. O pacote está preparado localmente; **a implantação real ainda precisa receber backend e frontend juntos**. A interface impede novas gravações em backend antigo, preservando campos e pendências.

Nenhum deploy, commit, push ou alteração em contas e planilhas reais foi feito nesta etapa. A pasta de backups já configurada continua sendo a mesma.
