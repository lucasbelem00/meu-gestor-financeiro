# Correções e melhorias aplicadas — 27/10/2026

Escopo: os seis achados e os três ajustes de usabilidade de [VISTORIA_PROFUNDA_NOVOS_CENARIOS_20261027.md](VISTORIA_PROFUNDA_NOVOS_CENARIOS_20261027.md), autorizados pelo usuário.

## Checklist

- [x] Restauração guarda as referências dos arquivos anuais preparados no plano financeiro.
- [x] Retomada reconfere os destinos antes de escrever e antes de concluir, sem usar uma leitura antiga do arquivo.
- [x] Planos preparados anteriormente continuam protegidos: as referências são reconstruídas a partir do catálogo previsto e das linhas preservadas.
- [x] Arquivo removido/alterado deixa o diário pendente e os dados ainda não substituídos preservados; a consulta de confirmação retorna conferência.
- [x] Atividade explica quando é necessário recuperar o destino anual antes de retomar, em vez de sugerir apenas repetir o envio.
- [x] Atraso de terceiros usa a data combinada anterior ao dia atual; mês da fatura e ausência de data não criam atraso.
- [x] Notas reservam identidade por origem, conteúdo e época de restauração antes de guardar a operação, sob coordenação entre abas.
- [x] Nota e operação têm identificadores determinísticos; rascunhos independentes iguais e edições posteriores continuam distintos.
- [x] Texto alterado durante a preparação e falha de armazenamento preservam o campo e liberam o botão.
- [x] Pix cadastrado por engano pode ser corrigido para cartão mediante prévia e confirmação explícita de que o Pix não foi realizado.
- [x] Correção retira a marcação bancária do Pix nos registros afetados, preserva IDs e mantém a situação da pessoa separada.
- [x] Pagamentos de outras formas não podem contornar o bloqueio pela confirmação de correção do Pix; prévia desatualizada é recusada.
- [x] Arquivamento verifica referências às regiões financeiras também em outras abas, incluindo intervalos nomeados e fórmulas indiretas.
- [x] Referências locais e a cadastros que não serão reorganizados continuam permitidas; nenhuma fórmula é reescrita por tentativa.
- [x] Sem cópia offline, a abertura continua aguardando a mesma requisição após 3,5 segundos, até o prazo final da rede.
- [x] Com cópia válida, a abertura rápida e a atualização em segundo plano são preservadas.
- [x] Fixos mostram condição vigente e programação futura separadamente; um registro de outro mês não é rotulado como pagamento do mês atual.
- [x] Editor de empréstimos usa Mês da fatura/competência, com orientação para a data combinada de devolução.
- [x] Rascunhos mostram descrição, valor, forma e pessoa, conforme os dados disponíveis.
- [x] CSS compilado e três interfaces sincronizadas; arquivos públicos preparados em dist/.

## Validação

**484 testes passaram, zero falhas, zero ignorados.** São 25 cenários adicionais em relação à suíte anterior de 459 testes. Os cenários existentes de notas foram adaptados para aguardar a preparação assíncrona.

Novas verificações: restauração com destino íntegro/removido/alterado em planos novos e legados; referências entre abas, indiretas e nomeadas; devoluções futuras, vencidas, no dia atual e sem data; correção Pix com pessoa recebida ou a receber, reenvio e prévia alterada; condição vigente de fixos; notas concorrentes, origens independentes, texto alterado e falha de reserva; resposta válida lenta sem cópia local e sem requisição duplicada.

Log da suíte: C:/Users/lucas/Documents/Codex/gestor-suite-completa-correcoes-20261027.log.

Compilação: CSS com 41.009 bytes. index.html, Backend/Index.html e Backend/Index_para_colar.txt são idênticos. git diff --check não encontrou erros de espaços. O pacote público foi preparado em dist/.

## Limitação da conferência visual

O controle do computador foi iniciado e a conexão reinicializada após duas falhas. Ao selecionar o navegador, a ferramenta interrompeu a automação porque não conseguiu confirmar com segurança o endereço atual. Nenhum clique ou preenchimento foi feito depois disso. A conferência visual no navegador/celular permanece pendente; os resultados acima são dos testes automatizados e da compilação.

O servidor preparado para essa conferência usava apenas planilhas, credenciais e Drive fictícios em memória, bloqueando conexões externas pelo proxy de teste, e foi encerrado. Planilhas reais e configurações Google/Vercel não foram alteradas.

## Atualização para entrar em uso

Pacote local: **protocolo 14** e **cache v47**. Atualize primeiro Backend/Code.gs na implantação do Apps Script e depois publique os arquivos da interface pelo procedimento habitual. As versões novas bloqueiam gravações com backend anterior ao protocolo exigido.

Não houve commit, push ou publicação nesta rodada. Os relatórios anteriores registram o estado histórico das etapas; este checklist descreve a implementação atual.
