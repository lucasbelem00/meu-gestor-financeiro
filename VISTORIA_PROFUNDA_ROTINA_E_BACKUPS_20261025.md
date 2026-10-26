# Vistoria profunda de rotina, integridade e backups — 25/10/2026

> Registro da análise original. A implementação posteriormente autorizada está discriminada em [IMPLEMENTACAO_VISTORIA_20261025.md](IMPLEMENTACAO_VISTORIA_20261025.md).

Revisão do código local, com planilhas, armazenamento e elementos de interface fictícios. **Nenhuma correção funcional foi aplicada nesta etapa e nenhum registro real foi alterado.** Este documento distingue defeitos reproduzidos, limitações conhecidas e sugestões para discutir.

## Resultado geral

- **379 testes existentes aprovados**, zero falhas. Isso confirma os cenários já cobertos; não elimina os defeitos novos abaixo.
- **9 achados novos reproduzidos**, agrupando os caminhos afetados pela mesma causa.
- As oito provas isoladas foram executadas novamente, fora do repositório; todas concluíram os cenários descritos.
- Outros **500 cenários determinísticos da rachadinha** conservaram os totais em centavos, descontos, serviço e acertos entre participantes.
- A consulta atual ao conector da Vercel retornou autenticação habilitada, com escopo `all_except_custom_domains`. Os domínios retornados para o projeto terminam em `.vercel.app`. Não foram alteradas permissões nem testadas operações financeiras na implantação real.

## 1. Alta — mês nativo ainda afeta recebimento parcial e transferência entre abas

A correção recente do editor não cobre todos os caminhos. Em outros fluxos, uma célula do mês guardada pelo Google Planilhas como data nativa ainda é copiada pela apresentação, podendo virar `01/10/2026` onde o app espera `10/2026`.

**Recebimento parcial reproduzido:** empréstimo de R$ 120,00, com R$ 60,00 pagos ao banco. Receber R$ 30,00 da pessoa deveria conservar a fatura de R$ 120,00, o pagamento bancário de R$ 60,00 e o saldo bancário de R$ 60,00. Só o recebimento deveria mudar para R$ 30,00, deixando R$ 90,00 a receber.

Resultado: a fatura de outubro passou a mostrar **R$ 90,00 de total, R$ 45,00 pagos e R$ 45,00 de saldo**, enquanto o recebido ficou em zero. A linha dos R$ 30,00 recebidos e seus R$ 15,00 de pagamento bancário foi gravada com competência inválida. Ela continua fisicamente na planilha, mas fica fora do relatório correto.

Também reproduzido:

- Mover gasto pessoal de R$ 120,00 para Empréstimos: retorna sucesso, mas outubro não computa o empréstimo.
- Mover Empréstimos para pessoal: retorna sucesso, mas outubro não computa o gasto.
- Receber um conjunto filtrado por mês: rejeita identificação e versão válidas como parcela alterada. Nesse caminho houve bloqueio antes da gravação, sem alteração indevida.

O controle com mês armazenado como texto funcionou corretamente.

**Correção proposta:** normalizar semanticamente data, parcela e mês em todos esses caminhos, usando os mesmos utilitários já empregados no editor. Conferir totais bancários e recebimentos antes/depois, incluindo as linhas criadas pelo recebimento parcial.

Fontes: [Code.gs:672](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:672), [recebimento em lote:736](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:736), [mover para empréstimos:944](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:944), [mover para pessoal:1020](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:1020).

## 2. Alta — mudança futura de despesa fixa faz desaparecer períodos intermediários

Assinatura de R$ 20,00 quitada em outubro, mais uma compra de R$ 5,00 em novembro. O Horizonte inicialmente mostra R$ 25,00 para novembro, incluindo R$ 20,00 previstos da assinatura.

Ao programar a assinatura para custar R$ 25,00 **somente a partir de janeiro de 2027**, novembro cai para **R$ 5,00**. Ao simular a chegada de novembro, sua ocorrência de R$ 20,00 também não é gerada. A edição cria a condição futura como uma ocorrência real e o gerador escolhe a maior competência da série como referência, saltando os meses anteriores a ela.

**Correção proposta:** separar a condição agendada da última ocorrência vigente. Até dezembro, continuar usando as condições antigas; a partir de janeiro, usar as novas. Manter a regra combinada de projetar apenas nos meses que já existem por outras contas, sem criar um horizonte ilimitado.

Fontes: [escolha da referência:318](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:318), [geração:339](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:339), [projeção:1753](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:1753), [edição futura:2491](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:2491).

## 3. Alta — restauração parcial pode ocultar empréstimos anuais que prometeu preservar

Um backup anterior, sem a aba Empréstimos, passa na prévia com o aviso de que essa aba será preservada. Porém, quando já há empréstimos recebidos em arquivos anuais, restaurar esse backup esvazia o catálogo anual inteiro.

Prova: antes havia 1 arquivo anual e 1 empréstimo recebido arquivado; a prévia informou Empréstimos como preservada; depois, catálogo e consulta dos recebidos arquivados ficaram vazios. O arquivo continuou no Drive fictício, mas perdeu a referência no app.

**Correção proposta:** preservar também os registros anuais das abas ausentes no backup. Uma proteção inicial possível é recusar essa combinação, com explicação clara e exigência de uma cópia completa, até que a preservação por aba esteja implementada. A prévia precisa refletir exatamente o que será substituído.

Fontes: [promessa de preservação:4754](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:4754), [substituição do catálogo:354](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/shared/protecao.js:354).

## 4. Alta para recuperação — JSON completo não restaura se o arquivo anual original já estiver indisponível

O JSON v2 realmente contém o conteúdo anual e passa na prévia. Contudo, se a planilha anual original foi perdida, a confirmação falha tentando lê-la para montar a cópia de segurança do estado atual, antes de reconstruir os arquivos pelo JSON.

Prova: removida somente a planilha anual do armazenamento fictício; a prévia ainda reconheceu 1 ano completo no backup; a restauração falhou por arquivo desconhecido. O teste existente de independência apagava a origem apenas **depois** da restauração e não cobria esse momento da falha.

**Correção proposta:** recuperação explícita para catálogo danificado. Preservar tudo que ainda estiver legível, o catálogo e o diagnóstico original; mostrar na prévia o que está ausente e pedir uma confirmação específica para reconstruir pelo JSON completo. A restauração comum deve continuar exigindo a cópia anterior íntegra.

Fontes: [cópia obrigatória antes da restauração:4854](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:4854), [leitura dos originais:252](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/shared/protecao.js:252).

## 5. Média — rascunho já enviado pode ser recuperado e lançado novamente

Depois de um envio confirmado, os campos são limpos enquanto a trava de envio continua ativa. O tratamento adicional da limpeza pula a remoção da cópia durável do rascunho.

Reproduzido com envio online e com lançamento enfileirado offline: formulário vazio, mas rascunho antigo recuperável. Recuperar essa cópia em outra página e enviar novamente criou **2 registros com 2 identificadores diferentes** no backend fictício.

**Não é duplicação automática:** exige recuperar e reenviar a cópia antiga. O reenvio com o mesmo identificador continua protegido; o problema é a cópia recuperada ser tratada como um lançamento novo.

**Correção proposta:** conclusão explícita do envio confirmado/enfileirado que remova somente o rascunho correspondente. Preservar eventuais campos alterados depois do snapshot enviado e manter intactos os envios incertos.

Fontes: [limpeza durante a trava:6885](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:6885), [limpeza após confirmação:6894](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:6894), [tratamento do rascunho:74](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/interface/rotina.js:74).

## 6. Média — gráfico do Painel conserva o último gasto quando o mês fica vazio

Único gasto do mês: R$ 100,00. Após excluir esse gasto e recarregar, o backend retorna total R$ 0,00 e categorias vazias; o gráfico continua mostrando R$ 100,00 porque o renderizador só atualiza quando existe ao menos uma categoria.

**Correção proposta:** limpar o gráfico e sua configuração pendente quando o mês ficar vazio, exibindo “Nenhum gasto neste mês”. Verificar também o gráfico cuja montagem foi adiada porque o Painel estava oculto.

Fonte: [index.html:6021](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:6021).

## 7. Média — simulador pode apagar uma data de devolução sem confirmar

O detector usado antes de substituir o formulário de Empréstimos não considera o campo de data combinada. Se o usuário preencheu apenas essa data e transfere uma simulação, o formulário é considerado vazio, a limpeza acontece sem confirmação e a data é perdida.

**Correção proposta:** unificar o detector de conteúdo com os campos reais do formulário, incluindo a data combinada. Continuar protegendo a versão do preenchimento durante a confirmação.

Fontes: [transferência do simulador:4537](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:4537), [detector incompleto:4552](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:4552).

## 8. Média, condicional — manutenção transforma fórmulas de colunas extras em texto

Confirmado somente para personalizações manuais em colunas extras. Uma linha atual tinha, na coluna S, a fórmula `=1000+1000`, com resultado 2000. Arquivar outra compra antiga regravou a linha mantida e transformou a expressão em texto literal; a manutenção retornou sucesso.

Na tentativa equivalente em campo financeiro padrão, a conferência de identidade bloqueou antes da regravação. **Não foi reproduzida corrupção silenciosa nesse campo.**

**Correção proposta:** distinguir fórmulas originais de texto literal no plano e na verificação, preservando a natureza da célula. Como proteção inicial, bloquear a manutenção quando houver fórmulas nas linhas que seriam regravadas. Não simplesmente liberar toda string iniciada por `=`, pois isso perderia a proteção de textos.

Fontes: [escritor de manutenção:36](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/shared/protecao.js:36), [plano de arquivamento:199](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/shared/protecao.js:199).

## 9. Baixa — navegação por teclado não alcança os links e a ajuda final dos backups

O controle de Tab da exportação considera somente botões e inputs. Ao chegar ao botão Conferir manutenção, volta para o primeiro botão, antes dos links da pasta, dos arquivos anuais e do resumo da ajuda. Esses controles existem depois dele no documento.

**Correção proposta:** calcular todos os controles focáveis e visíveis, incluindo links, selects e summaries, mantendo o foco dentro do modal e retornando ao botão de origem ao fechar.

Fonte: [index.html:5769](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:5769).

## Melhorias para discutir, sem implementação nesta revisão

1. **Empréstimos: editar datas de devolução em conjunto.** Escolher “Só esta parcela” ou “Próximas parcelas a receber desta compra”, com uma prévia das datas. Repetir o dia nos meses seguintes e ajustar ao último dia de meses curtos; não alterar fatura bancária nem recebimentos antigos. A caixa atual continua sendo apenas propagação de valor.
2. **Empréstimos: explicitar os dois estados na parcela.** Exemplo: “Banco quitado” e “Ana ainda deve R$ 208,00”, cada um com a cor já usada pelo app. Facilita entender por que uma parcela pode estar paga no cartão e ainda disponível para cobrança.
3. **Rachadinha: escolher como dividir acréscimos.** Hoje entrega/couvert é proporcional ao consumo, conforme o texto do app. Uma escolha adicional “Igual por pessoa” ajudaria nos casos combinados dessa forma. Exemplo: consumo de R$ 100 e R$ 50, com couvert de R$ 30: proporcional dá R$ 20/R$ 10; igual dá R$ 15/R$ 15. É uma regra de divisão diferente, não um erro do cálculo atual.
4. **Backups: mostrar dia e hora da última confirmação.** O painel hoje destaca o período do mês. Exibir também a data/hora já retornada pelo backend tornaria mais fácil conferir se uma cópia manual recente terminou. Manter o acesso direto ao arquivo/pasta.

Vencidos/Próximos 30 dias continuam em observação e o botão Usar sugestão da descrição continua dispensado, conforme as decisões anteriores. Não foram reintroduzidos como pendências.

## Ordem recomendada

1. Normalização de datas nos recebimentos e movimentações; incluir regressões dos totais bancários.
2. Condições futuras de fixos e preservação dos períodos anteriores.
3. Restauração com arquivos anuais e preservação por aba; proteção de fórmulas antes de qualquer manutenção que regrave as linhas.
4. Conclusão dos rascunhos enviados e gráfico vazio.
5. Confirmação do simulador e foco do modal.
6. Discutir as melhorias acima e selecionar as que trazem ganho na sua rotina.

## Provas e controles

As provas usam somente dados fictícios e estão em `C:/Users/lucas/Documents/Codex/`:

| Arquivo | O que reproduz |
|---|---|
| auditoria-financeira-20261025.cjs | Recebimento parcial, lote, movimentações, comparação com mês textual, condição futura de fixo e Horizonte |
| auditoria-backup-preservacao-20261025.cjs | Preservação prometida de Empréstimos versus perda do catálogo |
| auditoria-restaurar-anual-ausente-20261025.cjs | Recuperação com original anual indisponível |
| auditoria-backup-formula-extra-20261025.cjs | Natureza da fórmula antes/depois da manutenção |
| auditoria-sync-rascunho-enviado-20261025.cjs | Rascunho de envio confirmado/enfileirado e segundo envio após recuperar |
| auditoria-grafico-vazio-20261025.cjs | Backend zerado com gráfico antigo mantido |
| auditoria-usabilidade-20261025.cjs | Data combinada descartada pelo simulador e foco do modal |
| auditoria-rachadinha-controles-20261025.cjs | 500 divisões com cotas, descontos, serviço e pagamentos totais/parciais |

Saídas consolidadas: [auditoria-profunda-provas-20261025.json](C:/Users/lucas/Documents/Codex/auditoria-profunda-provas-20261025.json). Log da suíte existente: [gestor-auditoria-profunda-20261025-baseline.log](C:/Users/lucas/Documents/Codex/gestor-auditoria-profunda-20261025-baseline.log).

Controles positivos mantidos: reenvios com a identificação original são reconhecidos; divergências externas interrompem a retomada; fila remove apenas itens confirmados; comandos de notas posteriores ao envio são preservados; banco e pessoa são estados separados; arquivos anuais excluem pendências e parcelas futuras; centavos da rachadinha fecham nos cenários exercitados.

Limitações já conhecidas, não contadas como falhas novas: restauração de até 8 MB, 20 mil linhas por aba/partição e 500 mil células; provas e arquivos sem exclusão automática; séries fixas mantidas na principal; arquivos anuais somente para consulta.

Não houve validação do conteúdo do Apps Script publicado nem teste da rede do celular nesta revisão. Uma diferença entre versões publicadas e locais pode mudar quais cenários estão presentes no app instalado.
