# Nova revisão: casos não cobertos antes — 29/10/2026

**Atualização:** os seis achados e a limpeza de declarações foram implementados localmente depois desta análise. Consulte `CORRECOES_NOVOS_CASOS_20261029.md` e os testes de regressão para o estado corrigido. As reproduções descritas abaixo registram o comportamento anterior.

Esta etapa foi de diagnóstico, com leitura de código e reproduções em planilhas fictícias. Não modifica os fluxos do app, as planilhas reais, implantações, permissões ou gatilhos. As correções do pacote anterior permanecem no workspace.

## Resultado

Foram reproduzidos **seis problemas novos**. A suíte existente continua com **628 testes passando**; estes cenários novos não estavam cobertos por ela. As reproduções abaixo fazem asserções sobre a falha atual e devem virar testes de regressão ao corrigir o pacote.

### 1. Prioridade alta: a tela falha ao apresentar uma despesa fixa com controle inválido

- Origem: `index.html:6354`, ramo `a.controleInvalido` na renderização geral; registro das ações em `index.html:1813–1826`.
- O backend preserva a série problemática e retorna `controleInvalido: true`, como planejado. A interface monta o botão “Conferir em Atividade” com `acaoHTML('abrirAtividadeGestor', [])`, mas essa ação não está em `ACOES_RENDERIZADAS`, nem é acrescentada depois.
- Resultado reproduzido: `Ação de tela inválida.` durante a montagem da tela. A atualização geral é interrompida nesse ponto, embora os dados financeiros estejam preservados.
- Corrigir: registrar a ação permitida e testar o caminho completo de apresentação de uma série inválida. Manter a validação das ações; não contorná-la para resolver o botão. O exame das chamadas literais a `acaoHTML` encontrou somente essa ausência.

### 2. Prioridade alta, restrita ao formulário da planilha: repetir após falha pode duplicar gasto

- Origem: `Backend/Code.gs:1184–1202`, `gravarLancamentoDoFormulario`.
- Cada tentativa cria outro `requestId` em `:1196`. A limpeza do formulário acontece depois da gravação, no mesmo `try`. Se a gravação concluir e a limpeza falhar, a mensagem é “Erro”, mas os campos continuam preenchidos.
- Reprodução: uma compra de R$ 100 foi gravada; a limpeza foi interrompida de propósito. Ao repetir o comando da planilha, apareceram duas compras de R$ 100 com identificações diferentes.
- Este achado não demonstra duplicação no envio protegido do webapp; é o caminho do menu/formulário nativo do Google Planilhas.
- Corrigir: preservar a identificação da tentativa no controle do formulário e separar confirmação da gravação de falha de limpeza. Se o gasto já foi confirmado, informar isso e oferecer somente a limpeza. Em resultado incerto, consultar a identificação original antes de reenviar.

### 3. Prioridade média: rotina automática pode ocultar aviso de backup assistido

- Origem: `shared/protecao.js:450–466`, especialmente `Object.assign(atual,c,...)` em `:465`; metadados gravados em `:390–394`.
- A rotina guarda `c` antes do backup. O backup atualiza `avisoBackupAssistido` e `ultimaCopiaPreservada`. No final, a rotina reaplica `c`, sobrescrevendo esses metadados novos.
- Reprodução com configuração padrão: backup restaurável de outubro; inclusão de coluna particular; rotina em novembro e dezembro. A cópia de dezembro existe como `PRESERVADO_METADATA`, mas o aviso fica vazio e o estado aponta a cópia de novembro.
- Os arquivos e registros foram preservados. A falha é a informação de proteção/recuperação mostrada ao usuário, que pode parecer mais favorável do que a situação atual.
- Corrigir: atualizar somente os campos de manutenção que a rotina alterou, preservando os metadados recentes do backup. Testar ambas as transições entre cópia restaurável e cópia assistida.

### 4. Prioridade média: backup manual pode ficar preso à preparação antiga

- Origem: `interface/protecao.js:90–92`, variável `pedidoBackup`; rejeição da preparação desatualizada em `shared/protecao.js:409`.
- Uma interrupção deixa o pedido em `PREPARANDO`. Se os dados mudarem depois, o servidor corretamente exige uma nova cópia. A interface conserva a identificação anterior após toda falha e só a limpa no sucesso; cada clique repete o pedido que já não pode terminar.
- Reprodução: interrupção depois de gravar `PREPARANDO`, alteração de descrição e duas rejeições com o mesmo identificador. Com um identificador novo, a cópia terminou. O fluxo do handler confirma que a interface não faz essa troca; recarregar a página reinicializa a variável.
- Corrigir: resposta com código próprio para preparação desatualizada e ação clara “Iniciar nova cópia”. Continuar conservando o identificador quando a resposta for incerta, para não abandonar uma cópia em andamento.

### 5. Prioridade média: resumo para WhatsApp pode apresentar linhas que não fecham com o total

- Origem: `index.html:3498–3525`, `copiarResumoFiltroWhats`; soma do backend em `Backend/Code.gs:3456–3468`.
- Ocorrências puladas/canceladas continuam consultáveis, com seus valores históricos. O total corretamente as exclui. A cópia lista os valores dessas linhas sem apresentar sua situação ou avisar que não compõem o total.
- Reprodução: linha ativa de R$ 50 + ocorrência pulada de R$ 100. A mensagem mostra as duas linhas, de R$ 100 e R$ 50, e termina com total de R$ 50, sem explicar a diferença.
- Corrigir: separar os registros desconsiderados e identificar claramente a situação/valor fora do total, ou copiar somente os itens considerados, deixando explícito o escopo escolhido. Não alterar o cálculo financeiro para fazer a mensagem fechar.

### 6. Prioridade média, impacto menor: contas da calculadora podem reaparecer após “limpar”

- Origem: `interface/usabilidade.js:208`, `limparHistoricoCalcGestor`; recarga da chave em `:382`.
- A função esvazia a memória antes de tentar guardar `[]` e ignora o retorno `false` do gravador opcional. Quando a gravação local falha, a tela fica vazia, mas o histórico antigo permanece no armazenamento e volta ao reiniciar.
- Corrigir: confirmar a persistência da limpeza antes de anunciar/mostrar a remoção. Se o armazenamento negar acesso, preservar a informação na tela e explicar que a limpeza não foi concluída.

## Código sem uso e compatibilidade

Foram identificadas sete declarações sem leitura no aplicativo atual:

| Local | Declarações | Avaliação |
| --- | --- | --- |
| `index.html:6358–6360` | `descSafe`, `formaSafe`, `catSafe` | Restos do escape manual anterior; os botões atuais usam `acaoHTML` e o texto visível usa `escaparHTML`. |
| `index.html:7135` | `ehPixEmprestimo` | Calculada, mas não usada na preparação atual do envio de empréstimo. Conferir o inicializador e remover a declaração sem alterar a regra de Pix. |
| `index.html:7342` | `leiturasAtividadeGestor` | Conjunto substituído no transporte efetivo por `leiturasDesempenhoGestor`. Ainda aparece em fixtures antigos; atualizar também esses fixtures ao limpar. |
| `Backend/Code.gs:938` | `sufixoParc` | Calculada sem leitura no processamento das parcelas de empréstimo. |
| `Backend/Code.gs:1495` | `formaLower` | Forma convertida para minúsculas, mas o fluxo utiliza `chaveFormaGestor_`. |

Essas remoções são manutenção; não representam ganho perceptível de velocidade. A identificação foi feita por busca de referências e inspeção dos trechos, não apenas por encontrar nomes antigos.

`quitarFaturaWeb` é candidato a documentar como compatibilidade, não a apagar automaticamente. A UI atual usa a conferência e o pagamento novos, mas a ação antiga ainda está no catálogo, roteador, recuperação de operações e teste legado (`tests/backend.test.cjs:19`). Migrações, recuperação, wrappers e fontes incorporadas também não são cópias descartáveis.

## Melhorias práticas recomendadas

- Priorizar mensagens específicas nas duas falhas de backup: distinguir “resposta ainda incerta” de “preparação antiga, precisa de nova cópia”. A ação disponível deve acompanhar essa distinção.
- Na mensagem copiada, tornar visíveis situação e escopo dos registros desconsiderados. A sugestão anterior de informar todos os filtros continua válida, mas não foi contada como achado novo.
- No formulário nativo, distinguir “gravado; não consegui limpar” de “gravação não confirmada”, evitando induzir o usuário a repetir uma operação concluída.
- Não acrescentar novas abas neste pacote. Corrigir essas exceções, testar a implantação e medir a rede real tem maior utilidade agora.

## Validação e evidências

Os quatro scripts abaixo ficam fora do repositório e usam exclusivamente os mocks locais:

- `C:/Users/lucas/Documents/Codex/auditoria-acao-serie-invalida-29b.cjs`
- `C:/Users/lucas/Documents/Codex/auditoria-formulario-nativo-29b.cjs`
- `C:/Users/lucas/Documents/Codex/auditoria-recuperacao-29b.cjs`
- `C:/Users/lucas/Documents/Codex/auditoria-ui-29b-repros.cjs`

Execução: `node <caminho-do-script>`. Os scripts comprovam a falha atual; ao corrigir, asserções devem ser adaptadas para exigir o comportamento correto.

Também foi reexecutado `node --test --test-concurrency=4`: **628 passaram, nenhum falhou**. A frente financeira conferiu especificamente pagamento/resumo/prévia, recebimento parcial, edição de valores/datas, antecipação e recorrência; não reproduziu outro defeito novo nesses fluxos além do formulário nativo descrito acima.

Foram inspecionados contrato/encaminhamento do proxy, bloqueio de produção, separação de arquivos publicados, cache do PWA e referências de ações. Isso não verifica a configuração atual dos painéis Vercel/Google, permissões de Drive, execução real dos gatilhos ou latência no celular. As pendências de implantação e imagens já versionadas do relatório anterior continuam separadas destes seis achados.

Antes da versão definitiva, corrigir principalmente os itens 1 e 2 e os estados de backup dos itens 3 e 4; transformar os seis cenários em testes, repetir os fluxos na cópia de testes publicada e conferir a recuperação de backup numa cópia descartável.
