# Checklist do pacote de robustez

**Pacote consolidado concluído localmente em 24/10/2026:** os 38 itens estão assinalados em [VISTORIA_CONSOLIDADA_MOBILE_20261024.md](VISTORIA_CONSOLIDADA_MOBILE_20261024.md). Mudanças, regras adotadas e validação com 270 testes estão em [PACOTE_ROTINA_INTEGRIDADE_20261024.md](PACOTE_ROTINA_INTEGRIDADE_20261024.md). A publicação na cópia de teste permanece pendente. Os relatos de auditoria abaixo preservam o contexto anterior às correções.

Continuação da auditoria: [datas, edição e recebimentos](VISTORIA_PROFUNDA_EDICOES_DATAS_20261024.md). Foram acumulados os novos casos de data digitada divergente do envio, botões bloqueados após sucesso, fechamento por resposta antiga, prévia inexata de centavos e abandono de edições. O falso positivo anterior sobre ponto decimal na colagem foi retirado após conferir a função final ativa.

Nova rodada: [configurações, vencimentos e mensagens](VISTORIA_CONFIGURACOES_ALERTAS_PIX_20261024.md). Categoria em edição após remover outra, reserva de Outros, avisos com meses Date, clareza do arquivamento e inclusão de Pix após editar a mensagem foram corrigidos no pacote consolidado.

O pacote posterior de filtros, sincronização e rachadinha está documentado em [PACOTE_FILTROS_RACHADINHA_20261023.md](PACOTE_FILTROS_RACHADINHA_20261023.md), com checklist e roteiro de testes próprios.

Concluído localmente em 23/10/2026. Este arquivo acompanha o pacote autorizado após a revisão das duas análises. As marcações abaixo indicam implementação local; a publicação é uma etapa separada. O resumo final e as instruções estão em [PACOTE_ROBUSTEZ_20261023.md](PACOTE_ROBUSTEZ_20261023.md).

## Já implementado na retomada

- [x] Corrigir a atualização do Histórico para a aba `lancamentos`, preservando a consulta e as páginas carregadas.
- [x] Centralizar gravações locais e liberar somente caches reconstruíveis quando faltar espaço.
- [x] Preservar fila offline, notas, rascunhos, diagnóstico, identificadores e versão de restauração.
- [x] Distribuir pagamentos parciais por data da compra e parcela, com prévia antes da confirmação.
- [x] Manter pagamento ao banco separado do recebimento de terceiros.
- [x] Sinalizar controle inválido de uma despesa fixa e suspender somente a série afetada.
- [x] Cancelar envios pelo servidor, sob a mesma trava da gravação, impedindo sua chegada tardia.
- [x] Preservar operações que já começaram a gravar e confirmar as que já terminaram.
- [x] Deixar `onOpen` responsável apenas pelo menu; manutenção permanece explícita.
- [x] Remover versões antigas de envio e confirmação, unificar o escape de texto e colocar os ajustes de CSS diretamente na fonte.
- [x] Completar a compatibilidade dos cadastros antigos à vista e explicitar o tipo no cadastro de formas.
- [x] Substituir a execução dinâmica da calculadora por um interpretador de operações limitadas.
- [x] Acrescentar testes com dados fictícios para os novos fluxos.

## Conclusão e conferência

- [x] Concluir a proteção de integridade das bibliotecas externas com hashes verificados.
- [x] Conferir os detalhes de interface, persistência e recuperação após as mudanças.
- [x] Corrigir o cenário antigo de paginação ainda falhando e executar os testes finais: 140 aprovados, zero falhas.
- [x] Compilar o CSS, atualizar o service worker e sincronizar as três interfaces: 39.594 bytes de CSS e cache `gestor-gastos-v25`.
- [x] Revisar a pasta de publicação e a diferença final dos arquivos: hashes iguais nas interfaces e na cópia pública; nove verificações de publicação/relatórios aprovadas após o build; `git diff --check` sem erros.
- [x] Registrar a conferência de autenticação da Vercel e seus limites.
- [x] Documentar crescimento do diário mantendo a proteção contra duplicações.
- [x] Preparar o resumo de mudanças e as instruções de publicação em `PACOTE_ROBUSTEZ_20261023.md`.
- [x] Conferir no navegador o pagamento parcial, o cancelamento com rascunho preservado, o novo envio e a navegação por teclado, com dados fictícios.
- [x] Gerar e baixar o PDF mensal com as bibliotecas protegidas, sem erros no console.
- [x] Reavaliar o antigo alerta de `braces` e atualizar a documentação: aviso retirado pelo GitHub em 23/10/2026.

## Etapas posteriores

- [ ] Publicar a nova versão do Apps Script e a interface na cópia de teste.
- [ ] Conferir o uso na implantação real antes de levar para a planilha definitiva.

Não há limpeza automática do diário técnico. Um arquivamento futuro precisa preservar permanentemente as identificações confirmadas e canceladas. A ampliação da restauração de backups e a reorganização maior de desempenho permanecem fora deste pacote, conforme combinado. As travas atuais continuam necessárias enquanto as consultas também fazem manutenção e recuperação.


## Auditoria de 24/10/2026

Pacote aprovado implementado: pagamentos preservados em edições, avanço mensal com consulta recente, notas e rascunhos protegidos, recebimentos em lote e detalhe dos previstos. Checklist, validação e publicação em [CORRECOES_AUDITORIA_20261024.md](CORRECOES_AUDITORIA_20261024.md).

## Rachadinha e cores — 24/10/2026

Eu fixo, explicação de cotas, guia por itens, mensagens sem ajustes zerados, descrição da própria parte e proteção dos rascunhos e prévias. Vistoria e exemplos em [RACHADINHA_USABILIDADE_20261024.md](RACHADINHA_USABILIDADE_20261024.md). Suíte ampliada para 225 testes aprovados.

## Horizonte e alinhamento — 24/10/2026

Setas desativadas com aparência apagada, limites corrigidos na troca de largura e campos da rachadinha padronizados. Cinco testes novos; suíte com 230 aprovados. Vistoria, risco de rascunhos em duas abas e limite da conferência visual em [AJUSTES_HORIZONTE_PESSOAS_20261024.md](AJUSTES_HORIZONTE_PESSOAS_20261024.md).

## Conferência de recebimentos e filtros — 24/10/2026

Recebimento do PicPay confirmado por leitura da cópia de teste; pagamento ao banco permanece separado. Duas novas fragilidades reproduzidas: retorno de sucesso em recarga descartada e datas extensas no resumo de Atividade. Diagnóstico, exemplos dos filtros e recomendações ainda não aplicadas em [VISTORIA_RECEBIMENTOS_FILTROS_20261024.md](VISTORIA_RECEBIMENTOS_FILTROS_20261024.md).

## Fatura com mês armazenado como data — 24/10/2026

Consulta de pagamento corrigida para reconhecer meses em células Date, evitando faturas falsamente zeradas. Formatação dos novos resumos e da ordem das parcelas na prévia corrigida. Oito regressões novas; detalhes e atualização essencial do Apps Script em [CORRECAO_FATURA_DATAS_20261024.md](CORRECAO_FATURA_DATAS_20261024.md).

Consumo por forma passou a filtrar pela área inteira, com Conferir pagamento independente. Um teste adicional cobre o isolamento das duas ações. Suíte completa: 239 testes aprovados; arquivos de publicação sincronizados.

## Vistoria de uso diário — 24/10/2026

Revisão sem mudanças funcionais: incompatibilidade de backups com células Date reproduzida; valor de pagamento preservado ao trocar mês; resumo de Recebidos com rótulo/ação inadequados; seletores do Mensal sem nome acessível. Evidências, propostas de simplificação e prioridades em [VISTORIA_USABILIDADE_E_RECUPERACAO_20261024.md](VISTORIA_USABILIDADE_E_RECUPERACAO_20261024.md).

## Nova vistoria de rotina financeira — 24/10/2026

Sete cenários em memória: exclusão de ocorrência fixa seguida de recarga e desfazer duplica o valor; fixo antigo com Date pode gerar dia 1; troca futura de cartão fica bloqueada por pagamentos anteriores; antecipação parcial redistribui o pago entre meses e precisa de regra explícita. Controles positivos, propostas e prioridades acumuladas em [VISTORIA_ROTINA_FIXOS_ANTECIPACAO_20261024.md](VISTORIA_ROTINA_FIXOS_ANTECIPACAO_20261024.md). Correções ainda não aplicadas.
