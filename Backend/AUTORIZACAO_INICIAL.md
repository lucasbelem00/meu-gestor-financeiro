# Autorização inicial do Apps Script

Atualização v149 (04/11/2026): a mesma ativação do resumo em segundo plano passa a abranger cadastro, edição, recebimento integral/parcial, exclusão elegível e conversões de empréstimos. Quem já ativou não precisa repetir a função; publicar o backend atualizado mantém o controle/gatilho existente. Confirmação financeira continua obrigatória; fórmula particular ou falha na intenção mantém caminho imediato. Restauração/manutenção conservam tratamento próprio.


Executar pela conta responsável pela implantação e pelos gatilhos, separadamente no projeto de testes e no definitivo. O consentimento é concedido no Google; nunca colocar senha ou token neste arquivo.

## Projeto existente

### Resumo em segundo plano (v141)

Após atualizar Code.gs, publicar a nova versão na mesma implantação e atualizar o frontend, executar **ativarResumoEmSegundoPlanoGestor** uma vez no editor, pela conta proprietária da implantação. Conferir antes a base de teste/definitiva configurada no projeto. Essa ativação é separada das permissões iniciais: instala uma rotina de cinco minutos e registra uma primeira atualização; não ativa backup ou organização anual. Repetir na mesma conta não duplica a rotina. Se o Google solicitar consentimento, revisar e autorizar na própria conta; não há escopo adicional aos quatro já documentados.

Sem executar essa função, o resumo continua imediato. Depois de executar, em Exportar dados e backup → Atualizar situação, conferir “Resumo da planilha: atualização em segundo plano ativada” ou a atualização pendente. A rotina funciona com app fechado; o Google pode atrasar a execução. Novo/Edição só mostram sucesso depois da gravação financeira conferida. Resumo pendente não exige reenviar o lançamento. Se o gatilho for removido, executar a função novamente na mesma conta; tarefas pendentes continuam guardadas. [Referência do agendamento do Google](https://developers.google.com/apps-script/reference/script/clock-trigger-builder#everyMinutes(Integer)).

O estado mostrado no app é o da última consulta. Atualizar situação novamente para conferir conclusão. Se houver erro, revisar a execução rotinaResumoPlanilhaGestor no Apps Script; não limpar fila/rascunhos do aparelho nem reenviar registros financeiros para tentar reparar o resumo.

### Preparar permissões e publicar

1. Atualizar Código.gs com Backend/Code.gs e salvar.
2. Em Configurações do projeto, marcar Mostrar arquivo de manifesto appsscript.json no editor.
3. Abrir appsscript.json. Acrescentar ou substituir apenas a propriedade oauthScopes pela lista do modelo Backend/appsscript.json. Preservar o fuso atual, dependências, runtime, configurações de implantação e outras propriedades. Não colar o modelo inteiro sobre um manifesto existente sem conferir essas diferenças. Se houver escopos adicionais de personalizações, revisar sua utilização antes de removê-los.
4. Salvar; no seletor de funções, executar prepararAutorizacaoInicialGestor.
5. Revisar a solicitação do Google e conceder os quatro acessos necessários, se concordar. Se negar algum, a preparação não conclui. O Google pode exigir executar novamente após o consentimento.
6. Conferir no registro a mensagem Permissões necessárias concedidas. Isso confirma consentimento, não valida a planilha, não cria backup e não atesta conclusão de ativação anual.
7. Publicar uma nova versão na implantação existente para distribuir alterações de código/manifesto. Preservar URL, identidade de execução e regras de acesso. Voltar ao app e consultar situação. Nenhuma mudança de variável Vercel é necessária se URL/token continuam iguais.

## Por que estes acessos?

| Escopo | Uso atual |
| --- | --- |
| spreadsheets | Ler e gravar a base e as planilhas anuais; não basta acesso somente à planilha atual. |
| drive | Criar e conferir backups/PDFs, ler e copiar arquivos anuais e acessar a pasta existente. O serviço DriveApp utilizado exige este escopo amplo; o consentimento não é limitado à pasta do Gestor. |
| script.scriptapp | Criar e consultar os agendamentos de proteção e ativação anual. A preparação não cria nenhum. |
| userinfo.email | Conferir a conta executora/propriedade da pasta e proteger o acesso direto opcional do Apps Script. |

Não são pedidos Gmail, contatos, calendário ou acesso a sites externos. A conversão atual de PDF usa Blob.getAs, sem UrlFetchApp. Nova integração futura pode exigir revisão desta lista.

O modelo Backend/appsscript.json pode servir de base a um projeto novo; o manifesto PWA da raiz (manifest.json) é outro arquivo e não deve ser alterado por este procedimento.

O Google controla a tela e a persistência do consentimento. Esta preparação reúne os acessos em uma execução, mas não garante uma única tela nem autorização permanente: recusa parcial, revogação, outra conta, política administrativa ou novo escopo podem exigir nova autorização. Não revogar acessos existentes apenas para testar. Em projeto que já funciona, executar esta preparação é opcional; não interromper uma ativação anual em andamento para atualizar.

Referências: https://developers.google.com/apps-script/reference/script/script-app#requirescopesauthmode,-oauthscopes e https://developers.google.com/apps-script/guides/services/authorization.
