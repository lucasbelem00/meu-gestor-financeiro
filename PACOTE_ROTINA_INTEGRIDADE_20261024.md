# Pacote de rotina e integridade — 24/10/2026

Implementação do conjunto acumulado em [VISTORIA_CONSOLIDADA_MOBILE_20261024.md](VISTORIA_CONSOLIDADA_MOBILE_20261024.md). Publicação e uso na planilha definitiva são etapas separadas da alteração local.

## Mudanças para o uso diário

- Novo e Empréstimos guardam rascunhos duráveis por página. Há uma lista de cópias recuperáveis, com data, recuperação e descarte explícitos. Recuperar outra cópia preserva o preenchimento atual antes de substituí-lo.
- A rachadinha também grava uma cópia por página, preservando a chave legada durante a migração e a identificação de qualquer envio preparado. Divisões vazias padrão não criam cópias recuperáveis sem conteúdo.
- Limpar campos preenchidos exige confirmação. Fechar uma edição alterada também pede confirmação; fechar uma janela sem mudanças continua imediato. Respostas de um envio antigo não fecham outro editor.
- A memória de descrições preenche campos vazios ou ainda automáticos, preservando escolhas manuais de forma, categoria e mês. Colar um texto com vários valores oferece uma escolha; substituir um valor manual exige confirmação.
- As prévias de parcelas mostram a distribuição real dos centavos. R$ 100 em três parcelas aparece como 1x de R$ 33,34 + 2x de R$ 33,33.
- Registrar recebimento abre uma tela compacta com o valor recebido e o saldo resultante. Serve para recebimento integral ou parcial. A edição do gasto e o recebimento são ações separadas: alterações ainda não salvas precisam ser resolvidas primeiro.
- O resumo em Recebidos mostra o valor recebido e Compartilhar resumo. Quando A Receber fica vazio, há explicação, Ver recebidos e Limpar filtros.
- A consulta de empréstimos pode esconder o cadastro para reduzir a rolagem. Os filtros têm rótulos visíveis e resumo dos valores selecionados. As parcelas aparecem por mês crescente.
- A data combinada de devolução é opcional e independente do banco. Em um novo empréstimo parcelado, ela é a primeira data, com as seguintes no mesmo dia dos próximos meses, limitado ao último dia do mês. Pode ser ajustada individualmente no editor. Nenhuma observação livre é interpretada como uma promessa de data.
- Os filtros de situação do Mensal mostram Não pagos, Parciais e Quitados, mantendo combinações e somatórias. Os atalhos dos indicadores mantêm suas consultas agregadas, explicadas no resumo do filtro.
- Os pagamentos e recebimentos estão antes da tabela do Horizonte. Explicações longas ficam recolhidas, com mês/escopo dos indicadores e intervalo dos meses exibidos. O indicador Compromisso passa a se chamar Total do mês, mantendo o cálculo dos registros pessoais do período, incluindo os já pagos.
- Cartões arquivados são identificados, podem ser consultados e reativados na gestão. A confirmação explica quando haverá arquivamento ou exclusão sem uso. Reativar preserva limites, fórmulas e histórico.
- A chave Pix automática é um bloco separado do texto editável. Desmarcar a opção a remove da composição copiada; editar a mensagem não interfere nesse controle.

## Regras de integridade

### Despesas fixas

Pular uma ocorrência mantém a linha identificada como Ocorrência Pulada. Ela deixa de contar como gasto, não é recriada ao atualizar e pode ser desfeita em Atividade. Isso preserva a intenção de pular aquele período e impede a duplicação antes reproduzida entre exclusão, geração automática e desfazer.

Pular uma ocorrência não encerra a recorrência e não permite cadastrar outra série idêntica como se a anterior tivesse acabado. Encerrar continua sendo a ação Desativar em Despesas Fixas. Cobranças e pagamentos existentes são preservados.

Para exclusões feitas em versões antigas, desfazer é bloqueado quando outra ocorrência já ocupa a mesma série e mês. O app não apaga automaticamente a versão substituta.

Uma ocorrência com pagamento registrado precisa de conferência ou desfazimento desse pagamento antes de ser pulada. Os fixos antigos com data nativa preservam o dia de referência conhecido.

### Mudanças futuras e antecipação

As condições de uma despesa fixa têm mês de início. Pagamentos históricos ficam no cartão original. Uma parcela futura com pagamento parcial não pode transferir esse pagamento para outro cartão por essa edição.

Antecipações exibem mês de origem/destino, valor, desconto, pago e saldo. Parcelas que já tenham pagamento ao banco são bloqueadas para antecipação. Essa escolha evita mudar silenciosamente o mês de um pagamento existente. A pessoa pode selecionar apenas parcelas sem pagamento ou conferir/desfazer o pagamento original antes de alterar o período.

### Outras proteções

- A data digitada de empréstimos é a usada no cálculo e no envio. Datas impossíveis são recusadas sem correção silenciosa.
- Categorias em edição não dependem da posição da lista. Remover outra categoria não troca o alvo da renomeação. Durante o envio, os controles da configuração ficam bloqueados; uma edição ainda não adicionada precisa ser concluída antes de salvar o conjunto.
- Outros é reservado, fica por último e permite editar a meta. O servidor também impede removê-lo ou renomeá-lo para outra categoria. Uma configuração legada sem espaço não perde um item silenciosamente para incluir Outros.
- Trocar cartão ou mês na conferência da fatura limpa o valor preparado para o contexto anterior. Atualizar o mesmo contexto preserva o preenchimento.
- Uma recarga descartada não retorna sucesso de atualização da tela.
- Avisos de vencimento de terceiros reconhecem mês em texto ou Date. Receber da pessoa continua sem quitar a fatura do banco.
- Backups exportados com compra, mês ou parcela em células Date são normalizados antes da validação de conteúdo. Isso corrige a compatibilidade do recurso existente; não amplia a restauração completa adiada.
- Resumos antigos de Atividade são apresentados a partir dos registros originais, sem regravar os eventos do diário.

## Arquivos e versão

- Backend: `Backend/Code.gs`, protocolo 8.
- Interface principal: `index.html`, com fontes dos módulos em `interface/`.
- Novo módulo: `interface/rotina.js`.
- A compilação sincroniza `Backend/Index.html`, `Backend/Index_para_colar.txt` e os módulos gerados.
- A publicação prepara `dist/` somente com os arquivos públicos.
- Service worker: `gestor-gastos-v33`.

A interface bloqueia novas gravações se encontrar um backend anterior ao protocolo 8, preservando os campos. Por isso, atualizar somente o HTML não conclui a instalação deste pacote.

## Validação

Os testes usam dados e planilhas fictícios em memória. Nenhum teste deste pacote precisa de contas Google, credenciais reais ou acesso à planilha de uso.

- Novas regressões em `tests/pacote-rotina.test.cjs` e `tests/rotina-fluxos-ui.test.cjs`.
- Teste da rachadinha atualizado para usar os auxiliares reais de rascunhos por página.
- Verificação no navegador: formulário → proxy local → backend → planilha fictícia → atualização da lista. Um recebimento de R$ 30 e depois R$ 40 quitou a devolução fictícia de R$ 70, mantendo o saldo bancário separado. Registrar R$ 170 pagos ao banco zerou o saldo da fatura e manteve R$ 170 no Horizonte, em verde e identificado como Quitado.
- Conferência móvel em 390 × 844 e conferência dos erros do console.

- Suíte completa: **270 testes aprovados, zero falhas**. Depois dos dois últimos ajustes visuais, foram repetidas 20 verificações de interface, compilação e relatórios: todas aprovadas.
- CSS compilado: 40.401 bytes. As quatro cópias da interface (principal, duas do Apps Script e `dist/index.html`) têm o mesmo SHA-256.
- `git diff --check` sem erros. Scripts locais e interface passaram na validação de sintaxe da suíte de compilação.
- Conferência final do recebimento compacto: somente resumo, valor recebido agora, botão de conferência e cancelamento; os campos de edição ficam escondidos e voltam ao abrir Editar.
- Evidência visual: [recebimento no celular](C:/Users/lucas/Documents/Codex/pacote-rotina-recebimento-final-mobile-20261024.png).
- Log da suíte completa: [resultado dos 270 testes](C:/Users/lucas/Documents/Codex/pacote-rotina-testes-finais-20261024.log).

Os 38 itens do checklist consolidado foram implementados localmente. Não houve publicação, gravação em planilhas reais ou verificação em aparelho físico nesta conclusão. O ensaio móvel usa o navegador em largura de celular; a conferência na implantação de teste permanece necessária.

## Publicação e teste de uso

1. Conferir as alterações locais no GitHub Desktop. O pacote não foi publicado automaticamente.
2. Atualizar o backend e sua implantação na cópia de teste do Apps Script, usando `Backend/Code.gs`.
3. Publicar a interface correspondente e atualizar o app. Se a interface estiver no Apps Script, usar a cópia sincronizada de `Backend/Index.html` ou `Backend/Index_para_colar.txt`.
4. Na cópia de teste, conferir um lançamento pessoal, um Pix, um empréstimo, recebimento parcial/integral, pagamento de fatura, um fixo pulado e seu desfazer.
5. Só depois repetir a atualização na versão definitiva, preservando uma cópia dos dados.

As cinco abas principais, as cores de pessoal/terceiros/quitação e a independência entre banco e pessoa foram mantidas. A expansão da restauração completa e uma reorganização maior de desempenho continuam fora deste pacote. Não há arquivamento automático que remova provas de idempotência do diário.
