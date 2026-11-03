# Orientações do projeto

Explique em português simples, considerando que Lucas programa como hobby. Mostre o motivo e o efeito das mudanças relevantes.

## Documentação de continuidade

Por solicitação de Lucas, mantenha `CONTEXTO_COMPLETO_PARA_AUDITORIA_20261103.md` atualizado junto das alterações e melhorias futuras. Apesar da data no nome, ele é o documento contínuo de contexto; atualize a data de revisão no conteúdo. Não crie versões concorrentes sem necessidade.

- Atualize as seções afetadas quando houver mudança de comportamento, arquitetura, regras financeiras, segurança, implantação ou decisões do produto.
- Registre o ponto em que o trabalho parou, pendências e próximas verificações quando mudarem.
- Atualize protocolo, cache, contagem de testes e referência de commit somente com evidência atual; diferencie a última execução documentada de uma nova execução.
- Diferencie código local, publicação remota e validação real. Não marque como publicado ou testado na conta apenas porque o build ou testes locais passaram.
- Preserve decisões e motivos das proteções; retire ou corrija afirmações que ficarem obsoletas.
- Não inclua tokens, credenciais, IDs privados ou dados financeiros reais.
- Atualize também `MAPA_DO_CODIGO.md` se responsabilidades/entradas mudarem e `IDENTIDADE_VISUAL.md` se padrões visuais mudarem. Para mudanças relevantes de liberação, mantenha o roteiro de testes coerente.
- Em alterações apenas documentais ou pequenas correções sem efeito no contexto, evite reescrever seções não afetadas.

## Revisão por módulos

Use os dez módulos documentados em MAPA_DO_CODIGO.md como orientação de manutenção; consulte a matriz por módulos em ROTEIRO_TESTES_VERSAO_DEFINITIVA.md. Identifique também integrações afetadas. Relatórios externos são hipóteses a conferir no código atual. Mantenha o mapa e os cenários coerentes quando responsabilidades mudarem; não trate um módulo revisado como permanentemente livre de falhas.
