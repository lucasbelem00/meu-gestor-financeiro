# Ativação anual sem depender da conexão — 28/10/2026

Protocolo 16 e cache v52. A captura mostrou HTTP 504, que indica falta de resposta dentro do prazo. Não certifica falha da gravação nem interrupção do Apps Script. A consulta recente ao projeto Vercel não retornou logs; não foi identificada a etapa exata da tentativa real.

## Causa estrutural e correção

Antes, a requisição aguardava conferência de fórmulas, backup, criação de planilhas e organização. O proxy tem prazo de 55 segundos. Agora a API apenas registra e agenda a ativação; o trabalho demorado é executado pelo Apps Script, independente de a tela continuar aberta.

- A identificação da ativação, origem, etapa, tentativas e erros ficam nas propriedades do projeto.
- Repetir o pedido reutiliza a ativação e não agenda gatilhos duplicados.
- Um gatilho temporário chama `retomarAtivacaoAnualGestor`. Ele remove somente os gatilhos dessa mesma função. O agendamento diário de proteção permanece.
- A UI acompanha a situação enquanto o painel está aberto. Fechá-lo interrompe a consulta visual, não o trabalho no Google.
- Etapas em andamento ou com erro não aparecem como ativação concluída só porque uma configuração intermediária já foi gravada.
- Interrupção com plano financeiro pronto retoma o mesmo plano protegido. Preparação completa também pode ser conferida e retomada; conteúdo incompleto ou divergente continua bloqueado para conferência.
- Se a execução deixar de atualizar seu estado por dez minutos, aparece a possibilidade de retomada. Isso não é uma promessa de duração do serviço.
- A Vercel recebeu duração explícita de 60 segundos para comportar o prazo interno do proxy; a ativação em si não permanece esperando nessa requisição.

## Como atualizar e acompanhar

Atualizar e publicar `Backend/Code.gs`, atualizar a interface/proxy e recarregar o PWA (cache v52). O protocolo novo impede o botão de continuar usando a implementação antiga sem avisar.

Primeiro use **Atualizar situação**, pois a tentativa anterior pode ter terminado depois do 504. Na implementação nova, o botão agenda a ativação; a tela mostra aguardando execução, etapa em andamento, conclusão ou motivo do erro. Quando oferecido, **Retomar ativação anual e PDFs** reutiliza o acompanhamento existente.

Não criar outro gatilho manualmente nem apagar abas ou propriedades para tentar destravar. A ativação pelo editor continua disponível; `ativarOrganizacaoAnualWeb` executa diretamente no Apps Script, sem o prazo HTTP do proxy. O caminho recomendado pelo botão usa o agendamento.

Não houve ativação real, alteração de propriedades da conta, publicação remota ou movimentação de lançamentos por esta correção. Os testes usam dados e serviços fictícios. O funcionamento do gatilho na conta real precisa ser conferido após a publicação.

Referências técnicas: [duração das funções Vercel](https://vercel.com/docs/functions/configuring-functions/duration) e [gatilho após um intervalo no Apps Script](https://developers.google.com/apps-script/reference/script/clock-trigger-builder#after(Integer)). O Google documenta um intervalo mínimo; o início não tem horário exato garantido.

## Validação

Suíte integrada final: **564 testes aprovados, zero falhas, cancelamentos ou ignorados**. Nove regressões novas cobrem resposta sem trabalho financeiro, ponte nativa, repetição sem gatilho duplicado, conclusão após a requisição, retomada entre abas, preparação completa, execução expirada, autorização/trava e estados da tela. Log: `C:/Users/lucas/Documents/Codex/ativacao-504-validacao-final-20261028.log`.

Build concluído, quatro HTMLs idênticos, sintaxe do backend e scripts da interface válidas e diff sem erros de espaços. Não foi realizada a execução do gatilho na conta real.
