# Pacote de integridade — 18/10/2026

## Alterações locais

| Caso | Tratamento no código |
| --- | --- |
| 1 | Encerrar uma recorrência mantém cobranças e pagamentos existentes. O controle de encerramento é separado do status financeiro. |
| 2 | Trocar a forma de uma compra com pagamento bancário vinculado é recusado, evitando transferir o pagamento para outro cartão. |
| 3 | Antecipação exige quantidade válida e uma prévia com parcelas, desconto, destino e efeito no pagamento. Mudanças depois da prévia impedem a confirmação. |
| 4 | Recorrência não pode ser movida como empréstimo parcelado. |
| 5 | Páginas do Histórico e cópia para WhatsApp usam uma versão da consulta. Se os dados mudarem, a consulta deve ser refeita. |
| 6 | Falha do Anual limpa os indicadores do período, mostra erro e oferece nova tentativa. O PDF não usa dados de outro ano. |
| 7 | Novas ocorrências de Pix fixo ficam em aberto até confirmação; o registro inicial de um Pix realizado mantém o pagamento. |
| 8 | Recebimento em lote usa exatamente os IDs, versões e total dos itens mostrados pelos filtros. |
| 9 | Configurações críticas do backup são aplicadas como valores validados, com aviso na prévia, evitando divergência entre valor e fórmula. |
| 10 | Consulta de confirmação por identificador, preservação do envio incerto e diagnóstico independente da recuperação. Divergências mantêm bloqueio de gravação, com consulta dos dados disponíveis. |
| 11 | Geração de recorrência usa a referência da série, preservando o dia original depois de meses curtos quando essa referência existe. Não adivinha dias de registros antigos sem evidência. |
| 12 | Partes de um empréstimo compartilham o total atual da compra, inclusive após editar o saldo ou excluir uma parte. |
| 13 | Tags são deduplicadas na entrada e no cálculo dos agrupamentos, inclusive para dados anteriores. |
| 14 | O tipo financeiro é guardado separadamente do nome. Renomear não transforma cartão em Pix. |
| 15 | A restauração confere IDs no estado final combinado, incluindo abas que o arquivo não substitui. |
| 16 | Voltar Pix parcelado para gastos pessoais preserva o pagamento efetivo de cada parcela. |
| 17 | Rascunhos preservam as opções de parcelamento Pix e as restauram antes de recalcular os campos. |
| 18 | Formas necessárias a ações recuperáveis são arquivadas; desfazer confere as dependências antes de restaurar registros. |

Também foram padronizadas as setas do Menu, esclarecido o indicador de recebimentos por mês de referência e ampliado o diagnóstico com códigos e duração. A gravação usa blocos alterados, mantendo a conferência integral do estado e o diário recuperável.

## Atualização da versão de teste

1. No Apps Script da **cópia de teste**, substitua o conteúdo de `Code.gs` pelo arquivo `Backend/Code.gs` deste projeto e salve.
2. Em **Implantar → Gerenciar implantações → Editar**, escolha **Nova versão** e atualize a implantação existente. Mantenha suas propriedades e a URL já configurada.
3. Envie os arquivos locais pelo GitHub Desktop para a mesma branch de teste usada atualmente. Aguarde a publicação da Vercel.
4. Reabra o app com internet para receber a interface e o service worker novos.
5. Em **Menu → Atividade e sincronização**, use **Consultar confirmação** para o envio pendente. A consulta usa o identificador original; não é preciso cadastrar o gasto de novo.

O backend usa protocolo 4; atualizar apenas a interface não habilita as novas gravações. Atualize primeiro a implantação do Apps Script e depois publique a interface.

## Sobre a pendência já existente

Alterar o código local não modifica a planilha nem confirma a operação real. A nova consulta tenta recuperar somente o plano preservado, sem sobrescrever divergências preenchidas. Se houver conflito real, permanece em conferência e o diagnóstico informa as abas e coordenadas divergentes, sem expor valores ou tokens. Isso permite decidir a recuperação a partir dos dados efetivos. Não apague o diário nem crie outro lançamento para ocultar a pendência.

## Conferências desta entrega

Sintaxe do backend, proxy, service worker e scripts da interface conferida. O CSS é gerado na compilação e as três cópias da interface são sincronizadas. Os comandos de build preparam arquivos locais; não publicam o app.

Não foram acrescentados testes ou executada a suíte funcional nesta implementação. Build e conferência de sintaxe não substituem testar os fluxos após a atualização na cópia de teste. Nenhuma conta ou planilha real foi alterada nesta entrega.

A expansão da restauração completa e otimizações maiores continuam para uma etapa própria. Aqui foram endurecidas as funções já existentes, sem migração para outro banco de dados ou plataforma.

## Fechamento das revisões acumuladas — 19/10/2026

Os pontos abaixo completam as revisões posteriores ao primeiro pacote. Os números correspondem às seções 1 a 12 de `REVISAO_APOS_PACOTE_2026-10-18.md`, guardado na pasta Documents/Codex.

| Revisão | Correção local |
| --- | --- |
| 1 | O Simulador classifica o próprio cartão selecionado, corrigindo a referência à variável inexistente. |
| 2 e 3 | Cálculos, avisos, telas, PDFs e rascunhos usam o tipo financeiro separado do nome. A comparação dos nomes é uniforme; nomes ambíguos são recusados e a ordenação preserva o tipo da própria forma. |
| 4 | Um Pix agendado não passa a pago quando chega a data. Trocar a forma no editor também preserva a situação, que depende de seleção explícita. |
| 5 | A consulta de confirmação encontra o cabeçalho correto da operação e ignora suas linhas de conteúdo. |
| 6 | A confirmação de um envio só limpa os campos se eles ainda corresponderem àquele envio. Outro rascunho permanece preenchido. |
| 7 | Empréstimos consulta a operação pelo identificador; conferir visualmente uma compra semelhante não descarta mais a pendência. |
| 8 | Criação, edição e sincronização conferem se a forma de pagamento atual existe e pode ser usada. Uma seleção desatualizada não cria um gasto sem cadastro. |
| 9 | Planos novos preservam pré-condições por bloco e conferem as linhas intactas, permitindo retomar blocos já aplicados sem aceitar edições divergentes. |
| 10 | A movimentação genérica de uma compra com valores já recebidos é bloqueada para preservar o recebimento. |
| 11 | A resolução de conflito de notas mantém a identidade coerente de toda a sequência de operações, incluindo exclusões locais. |
| 12 | A ativação do service worker tenta preparar o HTML validado já no primeiro uso online. Páginas de login e erro continuam fora do cache. |

A central de Atividade também apresenta pendências do servidor, inclusive quando foram iniciadas em outro aparelho. A consulta pelo identificador não precisa recriar o lançamento.

### Limites da recuperação

As pré-condições por bloco fazem parte dos planos novos. Planos antigos mantêm as verificações conservadoras disponíveis: o aplicativo não inventa o estado anterior nem sobrescreve uma divergência para liberar a planilha. Uma pendência antiga que não puder ser recuperada com segurança continua visível para conferência.

Alterar arquivos locais não confirma a gravação real que já estava pendente, nem atualiza automaticamente a implantação do Apps Script ou a Vercel.

### Conferências locais deste fechamento

Conferência estática da sintaxe do backend, proxy, service worker e scripts da interface; geração do CSS; sincronização das três interfaces e preparação dos arquivos públicos de publicação. Não foram adicionados testes nem executados testes funcionais nesta entrega. Essas conferências não comprovam o comportamento da implantação nem da rede no celular.
