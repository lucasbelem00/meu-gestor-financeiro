# Backup, conferência e planejamento — 31/10/2026

Pacote local, protocolo 17 e cache v70. Não houve publicação, restauração real, renomeação ou movimentação de registros no Drive.

## Conferência em leitura no Drive

Na Cópia de Gestor de Gastos, o catálogo `_Gestor_Anos` aponta para bases de 2026 e 2027. As primeiras linhas de Lançamentos da base de controle contêm o cabeçalho e células sem valores. Foram encontrados lançamentos e empréstimos nas duas bases anuais indicadas pelo catálogo. Um gasto de teste em 2027 usa Outros sem emoji.

Isso é consistente com a transferência anual prevista. Não foi feita uma auditoria linha a linha de todos os valores nem comparação com uma cópia anterior; a amostra não prova ausência de qualquer exclusão histórica. Não foi encontrada evidência de que baixar o JSON tenha apagado os registros. A interface de backup passa a explicar a separação anual junto dos links existentes.

## Correções entregues

- Restauração aceita v3 e preserva `anos`, `hashOrganizacao` e os dados de recuperação, além dos campos v2 quando presentes.
- CSV aceita resposta v3. Mantida a visão financeira efetiva já reunida pelo backend, sem concatenar `anos` novamente e duplicar os retratos.
- Teste completo: backup gerado pelo servidor passa pelo preparador real da interface, prévia e restauração, com conferência do total posterior.
- Novos gastos/edições em Outros usam Outros 📦 mesmo com cadastro legado sem emoji. A normalização do cadastro pela ação existente de salvar categorias continua disponível. Registros antigos reais, especialmente anos fechados, não foram regravados.
- O criador legado de arquivos anuais reaproveita a aba inicial vazia como Dashboard & Resumo. Não há remoção automática de abas antigas ou particulares.
- Cancelar edição das Notas fica abaixo de Copiar texto, com borda e fundo vermelho discreto; preservada a confirmação e a proteção da edição.
- Corrigido o mapa de campos de data que apontava para o checkbox do Pix; retirado o tratamento visual obsoleto de Categorias Antigas.
- O gerador recusa blocos de competências/motor duplicados antes de incorporá-los.

## Metas e compras planejadas

Menu → Planejamento → Metas e compras planejadas. Uma tela reúne os dois tipos, evitando repetir formulários. Metas têm objetivo e valor já reservado, com porcentagem e barra. Compras têm estimativa, prioridade, prazo opcional e acesso ao simulador com confirmação antes de substituir o valor.

Concluir/reabrir altera somente o planejamento. A ferramenta não registra compra, pagamento, recebimento ou movimentação bancária. Para registrar o gasto, usa-se o fluxo financeiro existente. O progresso é informado manualmente; não representa um saldo consultado no banco.

Os registros ficam na aba Planejamento da base de controle e entram no backup completo. Um backup antigo sem essa aba preserva o planejamento atual e informa isso na prévia. O código valida os campos, datas reais, IDs, centavos inteiros e limite de 500 itens. Fórmulas não são aceitas nessa aba.

As operações usam o diário e a versão da lista para reconhecer reenvios e rejeitar sobreposição entre aparelhos. Rascunho local só é criado por edição, fica associado à época de restauração e é invalidado quando a base é restaurada. Um envio sem confirmação bloqueia outro envio nessa sessão e orienta a conferência em Atividade.

Fontes: `shared/planejamento.js` (validação e servidor), `interface/planejamento.js` (tela, rascunho, confirmação e simulador). Não misturar os dados com as Notas pessoais.

## Desempenho: o que foi feito e o que falta comprovar

Os logs `gestor_tempo` agora distinguem espera da trava, preparação/recuperação, execução da ação, preparação do plano e gravação/conclusão. Não incluem nomes de pessoas, descrições ou valores financeiros. O tempo de execução inclui as regras e leituras feitas pela ação; os campos não são um perfil separado de cada chamada ao Google.

O planejamento usa consulta própria, sem baixar todo o Histórico para abrir a ferramenta nem recarregar todas as finanças a cada alteração. Leituras financeiras continuam usando as otimizações anteriores. Não foram retiradas travas, conferências ou provas de operações. As camadas da API que protegem sincronização, recuperação e cache foram preservadas; trocar todas por um barramento durante a correção do backup acrescentaria outra mudança de risco sem medição que a justifique.

Mil registros fictícios, nesta execução local: primeira carga 1.692 ms, repetida 680 ms, relatório mensal 776 ms, pagamento 1.830 ms e desfazer 2.618 ms. Mantidas as contagens de hashes e zero linhas novas no diário nas leituras repetidas. Variação de tempo entre execuções não comprova ganho na rede real.

**A lentidão relatada no ambiente Google/Vercel ainda não foi declarada resolvida.** Depois de publicar na cópia de testes, os tempos dos envios reais indicarão se o gargalo está na trava, nas regras/leituras ou na gravação. A configuração do proxy já tinha duração de 60 s e espera de 55 s pelo servidor; não foi aumentada como substituto de uma investigação.

## Validação

**692 testes da suíte completa passaram, zero falhas.** Após os últimos ajustes de armazenamento, os dez testes específicos do pacote também passaram. Build, espelhos, módulos incorporados e whitespace foram conferidos.

Testes com dados fictícios cobrem restauração v3 pela interface, preservação dos metadados de recuperação, CSV sem duplicação, Outros legado, concorrência e reenvio do planejamento, backup/restauração do progresso, prazo impossível, IDs repetidos, fração de centavo, confirmação do simulador, bloqueio após envio incerto e invalidação do rascunho após restauração.

A prévia no navegador gravou e exibiu uma meta de R$ 3.000 com R$ 800 reservados e uma compra de R$ 450. Nenhum dado dessa prévia foi enviado ao Google. A automação do navegador ficou bloqueada na antiga confirmação nativa do simulador; as novas confirmações foram substituídas pelo modal do próprio app e o fluxo foi testado em unidade. A inspeção visual final dessas confirmações e em aparelho físico continua no roteiro de homologação. Não há screenshot final aprovado dessa ferramenta nesta etapa.

## Atualização e testes na conta

1. Atualizar o Apps Script (`Backend/Code.gs`), publicar sua versão e atualizar o frontend/proxy com o catálogo de ações novo na implantação de testes.
2. Atualizar o app (cache v70). Não é necessária função nova de ativação; a aba Planejamento é criada no primeiro salvamento.
3. Exportar JSON v3, testar a prévia e a restauração numa cópia descartável. Conferir anos, totais, notas e planejamento após restaurar.
4. Exportar os dois CSVs e comparar contagens/totais; confirmar que os registros de anos diferentes aparecem uma única vez na visão efetiva.
5. Salvar uma meta no computador, consultar no celular, editar progresso e testar uma edição desatualizada no outro aparelho.
6. Testar compra planejada → simulador, cancelamento da edição, prazo inválido, rascunho e confirmações no celular. Concluir planejamento não pode criar nem quitar uma despesa.
7. Fazer um lançamento e um empréstimo simples e conferir os tempos no log das execuções do Apps Script, antes de alterar limites ou refatorar novas camadas.

Usar também `ROTEIRO_TESTES_VERSAO_DEFINITIVA.md`. A passagem à definitiva permanece posterior à homologação na cópia de testes; configurações e acesso de produção não foram alterados.
