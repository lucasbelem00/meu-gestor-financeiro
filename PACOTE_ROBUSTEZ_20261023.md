# Pacote de robustez — 23/10/2026

Este documento descreve as alterações locais do pacote autorizado após a revisão externa. O acompanhamento está em `CHECKLIST_ROBUSTEZ.md`. Publicar no Apps Script/Vercel continua sendo uma etapa separada.

## O que muda no uso

- **Histórico atualizado:** ao recarregar os dados com o Histórico aberto, a consulta usa a aba correta, mantém filtros e recompõe as páginas já carregadas com preservação da posição da lista.
- **Armazenamento cheio:** o app tenta liberar somente `cacheDadosGestorV11` e `gestorHistoricoCacheV1`. Fila, notas, rascunhos, diagnóstico, operações, cancelamentos e versão de restauração são preservados. Se não conseguir guardar uma operação antes do envio, não inicia a gravação. Se não conseguir guardar um rascunho, avisa para manter a tela aberta; os campos continuam preenchidos.
- **Pagamento parcial com prévia:** a distribuição segue data da compra, número da parcela e identificação estável em caso de empate. A prévia mostra o valor destinado a cada item e seu saldo. A confirmação confere novamente a versão da fatura e a regra de distribuição. O pagamento ao banco não marca recebimento da pessoa.
- **Envio cancelável com proteção:** Atividade oferece “Cancelar envio com segurança”. A nuvem usa a mesma trava da gravação para registrar o cancelamento durável. Um envio que chegar atrasado com a mesma ação e identificação é recusado. Campos e rascunhos são preservados para revisão.
- **Gravação já iniciada:** planos `PRONTO` podem ter escrito parte dos dados e permanecem em conferência. Operações concluídas são confirmadas; não são apresentadas como canceladas. Uma resposta perdida de cancelamento pode ser consultada ou repetida com a mesma identificação.
- **Despesa fixa com controle inválido:** os valores já registrados continuam nos totais. A série aparece em Atividade, sua geração e projeção futuras são suspensas e alterações que dependem dela são bloqueadas. A suspensão vale também quando o controle inválido está em uma ocorrência antiga. Outros lançamentos continuam disponíveis. A coluna de controle original é preservada para uma correção orientada pelo diagnóstico.
- **Tipos de pagamento consistentes:** o cadastro explicita cartão ou Pix. O tipo de um cadastro existente é preservado ao editar o nome. Formas antigas à vista continuam compatíveis: um pagamento imediato gera uma ocorrência; um agendamento e as novas ocorrências de uma despesa fixa não viram pagamento por terem chegado à data. Nenhuma forma nova foi criada automaticamente.
- **Confirmação mais acessível:** foco entra no diálogo, Tab fica na confirmação e Escape fecha essa confirmação, devolvendo o foco ao controle anterior. Avisos genéricos de sucesso não se sobrepõem às mensagens específicas da ação.

## Código e carregamento

- Removidas implementações antigas de envio, API e confirmação que eram substituídas posteriormente.
- Unificado o escape de HTML em `escaparHTML`; removido o alias `pxEscHtml`.
- Ajustes de tamanho dos campos e permissão de zoom passaram para o HTML/CSS de origem. Não é mais necessário percorrer e modificar regras de estilo quando o app abre.
- A calculadora interpreta apenas operações numéricas limitadas; não usa `new Function`.
- Chart.js, Sortable, jsPDF e AutoTable usam versões fixas e hashes SHA-384 conferidos por download. O navegador rejeita conteúdo diferente do esperado.
- O antigo [alerta de `braces`](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) foi conferido novamente: o GitHub o retirou em 23/10/2026 por não se tratar de uma vulnerabilidade explorável na prática. O lockfile continua em 3.0.3; a retirada foi uma revisão do aviso, sem alteração dessa dependência neste pacote.
- O CSS continua compilado antes da publicação. As três interfaces são sincronizadas e o cache do service worker passa para `gestor-gastos-v25`.
- `onOpen` cria somente o menu da planilha. O app continua gerando as ocorrências válidas ao carregar os dados; a manutenção também pode ser acionada pelo menu da planilha. Não foi necessário instalar um gatilho adicional.

## Diário técnico e desempenho

As travas foram preservadas: algumas consultas também geram ocorrências e recuperam gravações pendentes. Retirar a trava antes de separar essas responsabilidades permitiria concorrência entre escritas.

O diagnóstico continua registrando duração das chamadas e tamanho das abas técnicas. O servidor registra tempo total e espera pela trava. A comparação de latência na implantação real deverá orientar uma otimização maior; os testes locais não demonstram a velocidade do Google Sheets ou da rede do celular.

Não há exclusão automática do diário. Um futuro arquivamento deverá: preservar pendências e planos necessários; manter permanentemente as identificações confirmadas **e canceladas**; produzir uma cópia verificável; conferir contagens e hashes antes de qualquer remoção; permitir retomar uma migração interrompida. O índice permanente de identificações precisa ser implantado antes de remover operações antigas.

A ampliação da restauração de backup e a reorganização maior de desempenho permanecem adiadas, conforme combinado. O pacote preserva a restauração já existente e sua proteção por versão.

## Verificação

Os testes usam planilhas em memória e credenciais fictícias. Cenários antigos foram atualizados para respeitar os cadastros, versões e prévias exigidos pelas proteções já existentes; validações financeiras não foram relaxadas para os testes passarem.

No navegador, a interface chamou o proxy real do projeto, que encaminhou para uma implementação isolada do Apps Script com dados em memória. Foram conferidos: tipo Pix ocultando campos de cartão; prévia e confirmação do pagamento parcial; falha fictícia de comunicação; cancelamento confirmado na nuvem; rascunho preservado; novo envio aparecendo uma única vez no Histórico; foco, Tab e Escape na confirmação. O fluxo de pagamento foi conferido no computador e a recuperação no tamanho de celular de 390 × 844. O PDF mensal foi gerado e baixado com as bibliotecas protegidas, sem erros no console. Os hashes das bibliotecas e a autenticação da implantação foram verificados separadamente. Os dados reais da planilha não participaram desses testes.

Na última execução completa, **140 testes passaram, sem falhas nem testes ignorados**. O relatório dessa execução foi salvo em `C:/Users/lucas/Documents/Codex/gestor-testes-final-20261023.txt`. A compilação gerou 39.594 bytes de CSS; as três interfaces e o HTML preparado em `dist/` possuem o mesmo hash. A cópia pública do service worker também coincide com a fonte. Nove verificações de publicação/relatórios passaram após o build. `git diff --check` não encontrou erros. As pastas públicas contêm somente os arquivos esperados, sem backend, testes ou documentos internos.

A imagem da prévia conferida está em `C:/Users/lucas/Documents/Codex/gestor-previa-pagamento-20261023.jpg`; o PDF fictício de verificação está em `C:/Users/lucas/Documents/Codex/gestor-relatorio-mensal-ficticio-20261023.pdf`. Os servidores temporários de teste foram encerrados.

## Como publicar na cópia de teste

1. Confira no GitHub Desktop os arquivos alterados e este checklist.
2. No Apps Script vinculado à **cópia de teste**, substitua `Código.gs` pelo conteúdo completo de `Backend/Code.gs`. Salve e atualize a implantação existente como uma nova versão, preservando sua URL.
3. Faça commit e envie as alterações pela branch de Preview. A Vercel executará o build definido em `package.json` e publicará a interface e o proxy juntos.
4. Atualize o PWA pelo menu do app e confira o diagnóstico/pendências na cópia de teste. A interface exige protocolo **5** para gravar; uma implantação antiga orienta a atualizar o Apps Script.
5. Só depois da conferência de uso na cópia de teste, faça a transição combinada para a planilha definitiva.

Publicar apenas a interface ou apenas o backend deixa temporariamente funcionalidades de versões diferentes. O protocolo impede novas gravações da interface atual com um backend antigo; por isso, publique primeiro o Apps Script e depois a interface/proxy.
