# Correções autorizadas em 26/10/2026

- [x] Integrar um × vermelho discreto ao resumo azul dos filtros.
- [x] Reprogramação de despesas fixas no mês solicitado.
- [x] Próximas devoluções pela ordem das parcelas, mesmo com antecipação bancária.
- [x] Confirmação explícita na correção de cartão para Pix.
- [x] Conclusão durável dos rascunhos de notas.
- [x] Persistência de datas/competência escolhidas manualmente.
- [x] Conferência dos resumos anuais usados no Painel.
- [x] Recuperação explícita do catálogo anual danificado.
- [x] Proteção das colunas extras antes do arquivamento.

## O que mudou

1. **Limpar filtros:** o × vermelho fica dentro do resumo azul, com área de toque própria. O símbolo usa SVG centralizado, para não variar de alinhamento com a fonte. O conjunto só aparece com filtros ativos. Limpa todos os grupos, funciona por teclado e devolve o foco ao título sem deixar o foco em um botão oculto.
2. **Fixos:** ao antecipar o início de uma nova condição, ela passa a existir no primeiro mês alterável solicitado, mesmo havendo outra ocorrência mais adiante. Registros já pagos ou cancelados são preservados. O aviso informa a vigência aplicada.
3. **Devoluções:** “Próximas parcelas” segue o número da parcela, não o mês da fatura bancária. Antecipar várias parcelas para a mesma fatura não faz uma parcela anterior receber a mesma data. A prévia separa parcela, fatura e data combinada, ajusta fevereiro e exclui recebidas.
4. **Cartão para Pix:** a prévia mostra o total e a quantidade de registros afetados. Só salva após confirmar o Pix efetivamente realizado. A pessoa pode continuar devendo. Pagamento bancário já registrado não é transferido silenciosamente para outra forma; alteração após a prévia exige nova conferência.
5. **Notas:** a conclusão acompanha a identidade e o conteúdo do rascunho entre páginas. Uma cópia herdada já adicionada não é oferecida novamente nem adicionada outra vez pela página original. Edições posteriores e rascunhos independentes são preservados. Falha ao guardar a operação mantém o texto.
6. **Datas e competência:** detecção e persistência usam a mesma regra. Digitação e setas do mês guardam escolhas manuais; Hoje/Ontem também salvam o estado. A competência manual de Empréstimos é recuperada e não é sobrescrita pelo recálculo da mesma forma. Valores automáticos e datas legadas sem indicação de edição não criam rascunhos vazios por mudança de dia.
7. **Resumo anual:** um resumo modificado diretamente no catálogo não altera os totais do Painel. O app deriva o resumo do conteúdo anual conferido e mantém um comprovante por ano para evitar reler os arquivos íntegros em cada abertura. A edição manual do catálogo não é sobrescrita silenciosamente.
8. **Catálogo danificado:** um JSON completo v2 pode reconstruir um catálogo cujo resumo ou cabeçalho ficou ilegível. A prévia exige os anos identificados e consentimento específico. Antes de substituir, guarda matriz original, diagnóstico e conteúdos legíveis; arquivos divergentes são preservados separadamente. Referências sem identificação suficiente ou conflitantes continuam bloqueadas para recuperação assistida.
9. **Colunas extras:** o arquivamento é bloqueado na prévia quando uma linha elegível contém dados fora das 18 colunas financeiras. Nenhuma linha é removida nesse caso. Conteúdos de linhas retidas, inclusive fórmulas já cobertas pelos testes anteriores, continuam preservados.

## Validação concluída

- `node --test`: **427 testes passaram, 0 falhas**; 22 testes novos nesta etapa.
- Build: CSS compilado com 40.956 bytes; `index.html`, `Backend/Index.html`, `Backend/Index_para_colar.txt` e pacote público sincronizados.
- `git diff --check`: sem erros de espaços ou conflitos.
- Navegador, computador e viewport móvel: resumo condicional, limpeza por teclado, foco e ausência de rolagem lateral.
- Fluxo completo de Pix com dados fictícios: cancelar não gravou; confirmar mostrou “Pagamento realizado” e “Carla Fictícia ainda deve R$ 150,00”.
- Fluxo completo de recuperação fictícia: catálogo com JSON inválido → prévia → consentimento específico → confirmação → “Restauração confirmada”; situação da proteção automática voltou a carregar.
- Escolher apenas o mês pelas setas e recarregar preservou 11/2026.
- Console dos fluxos verificados: nenhum erro JavaScript.

As verificações usaram somente planilhas, Drive e armazenamento fictícios. Contas e planilhas reais não foram alteradas. Nenhuma publicação ou commit foi feito.

## Publicação

Este pacote usa **protocolo 12** no backend e **cache v45** no app. É necessário publicar também o `Backend/Code.gs` atualizado no Apps Script, além dos arquivos do app. Uma versão antiga do backend não libera as novas gravações; os campos e envios locais são preservados.

As alterações locais das vistorias anteriores foram mantidas. Este checklist cobre o ajuste visual atual e os oito achados de `VISTORIA_FILTROS_E_ROTINA_20261026.md`.
