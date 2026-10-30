# Revisão antes da versão definitiva — 30/10/2026

**Atualização:** os três achados, a limpeza dos dois helpers e a redução de cálculos redundantes foram implementados localmente. Consulte `CORRECOES_PENDENCIAS_20261030.md`. As reproduções abaixo documentam o comportamento anterior às correções.

Esta é uma nova etapa de diagnóstico, depois das correções documentadas em `CORRECOES_NOVOS_CASOS_20261029.md`. Foram encontrados **três problemas novos reproduzidos**, **duas funções internas sem referências encontradas** e uma oportunidade de desempenho medida. Os seis problemas do relatório anterior não são contados novamente.

Nenhuma regra financeira foi alterada nesta etapa. Não houve acesso de escrita às planilhas reais, publicação, alteração de permissões ou de gatilhos. As reproduções usam os mesmos mocks locais da suíte, com dados fictícios.

## 1. Datas: cadastro aceita anos que a organização anual depois bloqueia

**Prioridade: corrigir antes da versão definitiva.** O impacto pode atingir as consultas gerais depois da tentativa de ativação.

Referências: `Backend/Code.gs:83`, `:97`; `shared/anual.js:143`, `:186–195`.

Os validadores de data e mês aceitam anos a partir de 1900, sem o limite superior usado pelo catálogo anual. Já a organização anual admite somente 2000 a 2200. Não é o problema anterior de reconhecer uma célula de competência como `Date`: o erro atual é a divergência entre os intervalos permitidos.

Reprodução, separadamente para 1999 e 2926:

1. Preparar uma base fictícia com proteção automática, ainda sem organização anual.
2. Enviar `salvarLancamentoWeb` com uma compra de R$ 10, uma parcela e competência `01/1999` ou `01/2926`.
3. A operação retorna `sucesso: true` e o registro aparece na base.
4. Ativar a organização anual. O procedimento grava `organizacaoAnual: true` antes de concluir a distribuição dos registros e falha com `Competência anual inválida em Lançamentos (registro 1)`.
5. `getDadosCompletos` passa a falhar com a mesma mensagem.

**Consequência:** um ano digitado incorretamente pode ser aceito no lançamento e só bloquear o uso depois. Os registros permanecem preservados; não foi reproduzida perda de dados.

**Correção recomendada:** definir um intervalo único de competências, compartilhado pelos cadastros, edição, importação/restauração, relatórios e catálogo. Validar também a última competência gerada pelo parcelamento, não apenas o primeiro mês. Antes de marcar a organização como ativa, verificar se todos os registros existentes podem ser organizados. Dados antigos fora do intervalo precisam aparecer em uma conferência identificável, sem descarte ou conversão silenciosa. Uma retomada já parcialmente executada deve respeitar o plano existente; simplesmente desligar a configuração não é uma recuperação segura para todos os casos.

**Melhoria de uso:** apresentar algo como “Confira o ano da fatura deste lançamento: 2926” com o registro correspondente, antes de iniciar a organização.

## 2. Formulário da planilha: pedido rejeitado pode impedir novas tentativas corrigidas

**Prioridade: média. Restrito ao formulário nativo do Google Planilhas.** Não foi reproduzido esse bloqueio no formulário normal do webapp.

Referências: `Backend/Code.gs:1166–1184`, especialmente `:1178–1181`; validação posterior em `:1237`.

A proteção acrescentada no pacote anterior conserva a identificação do envio para impedir duplicações. Porém, o pedido é guardado antes de uma validação que pode rejeitar definitivamente a compra: cada parcela precisa ter pelo menos um centavo. Depois disso, o comando continua repetindo o pedido antigo, antes de considerar os campos corrigidos.

Reprodução:

1. Preencher o formulário nativo com R$ 0,01 em três parcelas.
2. Gravar. O pedido fica em `GESTOR_FORMULARIO_ENVIO_V1`, mas nenhuma compra é incluída; a resposta é “Cada parcela deve ter pelo menos um centavo”.
3. Corrigir o valor para R$ 300 e gravar novamente.
4. O código repete R$ 0,01 em três parcelas. A mesma rejeição aparece e o novo valor não é enviado.

**Correção recomendada:** executar a validação completa de distribuição em centavos antes de reservar o pedido. Além disso, distinguir rejeição definitiva sem gravação de resultado incerto. Para pedidos antigos já presos, oferecer uma resolução coordenada com a confirmação/cancelamento no servidor antes de substituí-los. Não apagar a propriedade indiscriminadamente ao ocorrer um erro: isso reintroduziria o risco de duplicação corrigido no pacote anterior.

**Melhoria de uso:** informar claramente “Este pedido foi recusado; ajuste o valor ou a quantidade de parcelas”, mantendo uma orientação diferente quando a gravação ainda está em conferência.

## 3. Pagamento: resposta atrasada interfere na janela de outra fatura

**Prioridade: média.** A reprodução demonstra uma falha de contexto da interface; não demonstra pagamento atribuído ao mês errado.

Referências: `interface/faturas.js:37–48`, `:75–96`, principalmente o tratamento posterior a `registrarPagamentoFaturaWeb` em `:93–95`.

A confirmação verifica se os campos mudaram durante a prévia e antes de enviar. Depois do envio efetivo, porém, a resposta fecha a janela e reabilita os campos sem verificar se ela ainda corresponde à sessão que iniciou o pagamento.

Reprodução com resposta controlada:

1. Confirmar um pagamento da fatura de outubro e manter a resposta pendente.
2. Fechar a janela pelo X e abrir a conferência de novembro, ainda carregando.
3. Entregar a resposta do pagamento de outubro.
4. A janela de novembro é fechada e seu botão de gravação é reabilitado, embora a nova consulta não tenha terminado.

O pedido enviado continua contendo a forma e o mês de outubro. As validações de saldo e versão permanecem no servidor. O defeito está em uma operação antiga alterar uma tela nova.

**Correção recomendada:** capturar a identidade da sessão da janela no início do envio. Ao concluir, fechar, atualizar o resumo ou alterar o estado dos campos somente se aquela sessão ainda estiver aberta. A confirmação global e a atualização dos dados devem continuar acontecendo. Aplicar a mesma regra no caminho de erro, que hoje também pode consultar a janela reaberta.

**Melhoria de uso:** o aviso de conclusão pode citar cartão e mês, por exemplo “Pagamento registrado — PicPay, 10/2026”. Isso ajuda quando a pessoa já está conferindo outra fatura.

## 4. Código antigo: dois candidatos concretos à remoção

A triagem textual percorreu **890 declarações de função**, excluindo os blocos gerados duplicados. Os candidatos abaixo foram conferidos por busca exata adicional em código, catálogo de ações e testes. Isso identifica referências no repositório; não é uma prova sobre chamadas externas não documentadas.

| Função | Local | Resultado da conferência |
| --- | --- | --- |
| `recuperarDiarioGestor_` | `Backend/Code.gs:3959` | Somente a declaração. É um percurso antigo de recuperação; o fluxo ativo consulta operações e recupera planos pelos caminhos atuais. |
| `exportarBackupRealGestor_` | `Backend/Code.gs:4458` | Somente a declaração; parâmetro `ctx` também não é usado. O fluxo atual exporta pelo montador/entrada de backup vigentes. |

**Recomendação:** remover esses dois helpers internos em um pacote separado de limpeza, depois de conferir eventuais scripts externos particulares. Não religá-los como atalho para recuperação ou exportação. Eles não estão causando um erro ativo reproduzido hoje.

**Não remover por parecerem pouco usados:** `onOpen`, `doGet`, `doPost`, comandos manuais de unificação de categorias, `obterMetricasDesempenhoGestor`, `quitarFaturaWeb`, migrações, normalização de backups antigos e cópias geradas. Existem entradas da plataforma, diagnóstico, compatibilidade e recuperação que não se parecem com chamadas comuns. As duas funções locais chamadas `aplicar` em `interface/usabilidade.js` pertencem a escopos diferentes; não são uma redefinição global acidental.

## 5. Desempenho: repetição interna medida, sem retirar verificações de integridade

Foi executado `node scripts/medir-desempenho.cjs 1000`, com mil registros fictícios. Resultado desta execução:

| Operação | Tempo local | Chamadas a `hashRegistroGestor_` | Novas linhas do diário |
| --- | ---: | ---: | ---: |
| Primeira carga | 2.799 ms | 5.000 | 41 |
| Carga repetida | 1.727 ms | 5.000 | 0 |
| Relatório mensal | 1.707 ms | 5.000 | 0 |
| Pagamento da fatura completa | 7.306 ms | 12.000 | 86 |
| Desfazer esse pagamento | 4.917 ms | 13.000 | 87 |

Esses números são do ambiente local com mocks, não medem a rede, Google Planilhas nem o celular. A execução de mil itens num único pagamento também não representa o tamanho habitual de uma fatura.

Há repetição de passagem pelos registros entre migração, comparação e finalização do plano. **Cinco mil chamadas à função não significam cinco mil cálculos criptográficos:** o cache de hashes da execução já evita parte desse trabalho; a carga repetida fez 1.011 chamadas ao digest.

**Próxima otimização recomendada:** medir por fase e reaproveitar a normalização/fingerprint dentro do mesmo contexto imutável da operação, invalidando o resultado quando a planilha virtual for alterada. Conferir os fluxos de edição manual, despesas fixas e restauração antes de reduzir passagens. Não compartilhar esses resultados indefinidamente entre requisições, retirar locks ou apagar provas do diário para ganhar velocidade.

## Verificações concluídas e limites

- Suíte existente: **638 testes passaram, zero falhas**, nesta revisão. As três reproduções novas são cenários adicionais ainda sem correção; os testes atuais não os cobriam.
- Espelhos `index.html`, `Backend/Index.html`, `Backend/Index_para_colar.txt` e `dist/index.html`: conteúdo igual.
- Fontes de `interface/` e `shared/`: incorporadas nas versões correspondentes da interface/backend.
- `manifest.json` e `sw.js`: iguais às cópias em `dist`.
- Catálogo/proxy, coordenação de leituras e caminhos de recuperação foram inspecionados. Não foi demonstrada outra vulnerabilidade nesses trechos nesta etapa; isso não substitui validação do ambiente publicado.
- Não foi feita uma nova inspeção visual em aparelho físico, nem medição de latência real no Google/Vercel. Não é possível afirmar sincronização ou permissões atuais das contas a partir destes testes locais.

## Ordem sugerida para o próximo pacote

1. Unificar competências permitidas e a conferência anterior à ativação anual.
2. Resolver pedidos definitivamente recusados no formulário nativo sem perder a proteção de reenvio.
3. Preservar a sessão correta da janela durante a conclusão de pagamentos.
4. Remover os dois helpers sem uso e acrescentar os testes de regressão dos três problemas.
5. Otimizar as passagens repetidas com medição antes/depois e, depois, validar os fluxos na cópia de testes antes da definitiva.
