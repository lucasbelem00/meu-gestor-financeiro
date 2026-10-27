# Implementação dos novos cenários — 26/10/2026

Escopo autorizado: aplicar as correções e melhorias de [VISTORIA_PROFUNDA_NOVOS_CENARIOS_20261026.md](VISTORIA_PROFUNDA_NOVOS_CENARIOS_20261026.md).

## Checklist concluído no código

- [x] Mesmo rascunho e conteúdo usam a mesma identificação de envio entre abas, online e offline.
- [x] O formulário avisa quando o preenchimento já foi enviado e permite conferir ou iniciar outro.
- [x] Empréstimos usam a mesma proteção de reserva dos lançamentos.
- [x] Novos planos de manutenção guardam os arquivos de destino; planos antigos continuam legíveis.
- [x] A retomada relê e confere os destinos antes de substituir a origem e antes de concluir.
- [x] Prévia e gravação do Pix verificam somente as parcelas que efetivamente mudarão.
- [x] Fórmulas não demonstravelmente constantes bloqueiam a reorganização já na prévia.
- [x] A navegação pode abrir a cópia offline após 3,5 segundos de espera; a rede em segundo plano tem prazo de 8 segundos.
- [x] A página inicial com parâmetros pode usar a cópia válida da raiz; a API continua fora do cache.
- [x] Falha de consulta tem mensagem própria, botão de atualização e orientação de backup para problemas de estrutura.
- [x] Editores recebem identificação de diálogo, rótulos, foco inicial, navegação por Tab e retorno do foco ao fechar.
- [x] Confirmações existentes de descarte de edição foram preservadas.
- [x] CSS compilado e cópias HTML sincronizadas; arquivos públicos preparados em dist/.

## Validação

Suíte completa executada nesta implementação: **459 testes passaram, zero falhas, zero ignorados**.

Os testes novos cobrem envios herdados e simultâneos, fila offline, repetição intencional, conteúdo alterado, indisponibilidade do armazenamento, destinos anuais removidos/alterados, bundle técnico ausente, retomada íntegra e planos antigos v1, fórmulas personalizadas, conversão das parcelas abertas para Pix, rede sem resposta, raiz com parâmetros, mensagens de leitura e foco dos editores.

As três interfaces são idênticas: index.html, Backend/Index.html e Backend/Index_para_colar.txt. A conferência de espaços do Git não encontrou erros. O CSS gerado tem 41.009 bytes.

**Limitação:** a ferramenta de navegador não conectou nas duas tentativas. Os comportamentos foram verificados em testes com DOM e serviços simulados; a conferência visual em navegador/celular real continua pendente.

Log da suíte: C:/Users/lucas/Documents/Codex/gestor-suite-final-20261026.log. Os testes usam dados fictícios e não alteram planilhas reais.

## Como colocar em uso

Este pacote utiliza **protocolo 13** e **cache v46**. Atualize o Apps Script e a interface juntos, seguindo o procedimento já usado no projeto. O app exige o protocolo novo para permitir alterações e manutenção. Os arquivos foram preparados localmente; não houve commit nem implantação nesta rodada.

## Cuidados preservados

O recibo local do rascunho facilita o aviso na tela. A identificação do envio pode ser recalculada a partir da origem e do conteúdo, e o servidor mantém a prova durável contra duplicação. Limitar recibos confirmados antigos não apaga essa prova.

Destino de manutenção ausente ou alterado mantém a operação pendente e preserva a origem ainda não substituída. É necessário recuperar/conferir o destino antes de retomar; não se resolve apagando linhas técnicas.
