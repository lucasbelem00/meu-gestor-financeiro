# Correções dos seis achados — 29/10/2026

Implementação local dos pontos de `VISTORIA_NOVOS_CASOS_20261029.md`. Publicação e testes na conta Google são etapas separadas.

| Achado | Correção |
| --- | --- |
| Série fixa inválida interrompia a tela | `abrirAtividadeGestor` foi incluída no registro permitido. A validação das ações continua ativa. |
| Formulário nativo podia duplicar após falha | Pedido identificado persistido em Script Properties, associado à base, com trava de documento. Repetições usam o pedido original e o núcleo financeiro existente. Confirmação e limpeza são etapas distintas. Campos modificados durante o envio são preservados. Um envio novo usa a época atual de restauração; um pedido anterior não atravessa uma restauração posterior. |
| Aviso de cópia assistida era apagado | A rotina atualiza somente seus campos de manutenção, preservando os metadados recentes do backup. |
| Backup manual preso à preparação anterior | O servidor retorna `BACKUP_PREPARACAO_DESATUALIZADA`. O app oferece “Iniciar nova cópia”, conservando a anterior. Em timeout/falha incerta, mantém o pedido original. |
| WhatsApp listava pulados como se entrassem no total | Ocorrências puladas e assinaturas canceladas ficam em seção “Registros fora do total”, identificadas pela situação. O cálculo financeiro permanece igual. |
| Limpeza da calculadora só esvaziava a tela | A limpeza é persistida pelo gravador obrigatório antes de atualizar a memória/tela. Se falhar, as contas continuam visíveis e há aviso. |

As sete declarações sem leitura foram removidas: `descSafe`, `formaSafe`, `catSafe`, `ehPixEmprestimo`, `leiturasAtividadeGestor`, `sufixoParc` e `formaLower`. Rotinas de compatibilidade, inclusive `quitarFaturaWeb`, foram preservadas. O build continua incorporando os módulos e sincronizando os três HTMLs.

O formulário nativo agora informa separadamente quando o lançamento está confirmado, mas não foi possível limpar. Não apague a propriedade `GESTOR_FORMULARIO_ENVIO_V1` para tentar resolver um envio incerto: ela permite repetir a identificação com segurança. Uma pendência vinculada a outra base/restauração exige conferência, em vez de envio automático.

## Validação e atualização

`tests/novos-casos-29b.test.cjs` cobre as seis falhas, incluindo confirmação perdida, limpeza interrompida, campos alterados durante envio, época de restauração, metadados de backup assistido e a distinção entre timeout e preparação desatualizada. Os scripts antigos de reprodução descreviam as falhas anteriores; os testes novos exigem o comportamento corrigido.

Resultado final: **638 testes passaram**, nenhum falhou. Build concluído; HTMLs da raiz, Apps Script e distribuição idênticos; sintaxe dos scripts conferida. Nenhum teste acessou a planilha real.

Publicar **Backend/Code.gs** e a interface atualizada para aplicar os dois lados. Cache PWA **v63**, protocolo **17** preservado. Não há novo gatilho nem função de ativação para executar na planilha. Para o formulário nativo, continuar usando o menu da própria planilha.

Este pacote não altera permissões, a planilha real nem a configuração de produção. Antes da transferência definitiva, validar os fluxos na cópia de testes publicada e a recuperação numa cópia descartável. As imagens históricas já rastreadas no Git continuam sendo uma pendência separada de compartilhamento do repositório.
