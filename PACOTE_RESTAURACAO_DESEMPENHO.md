# Restauração completa, desempenho e revisão de uso

Implementado localmente. Este pacote continua o trabalho anterior e inclui os três ajustes adicionais pedidos durante a implementação: separar cadastro e consulta de empréstimos, ignorar rascunhos vazios e esconder a ação de pagamento de cartões quitados. Não foi publicado e não acessou a planilha real.

## O que mudou

- Restauração dos dados do app com prévia de inclusões, alterações, remoções e registros mantidos; valores cancelados/pulados ficam fora dos totais ativos.
- Totais separados de pagamento ao banco, recebimento de pessoas e saldo. Restaurar não confunde essas duas obrigações.
- Catálogo de cópias anteriores, com conferência antes de recuperar ou baixar. Novas cópias possuem SHA-256 e quantidade de partes; cópias antigas recebem aviso explícito.
- Importação e exportação em partes para até 8 MiB de conteúdo restaurável, sem guardar o arquivo grande no armazenamento local de operações. O arquivo exportado normalmente fica menor ao omitir apresentação duplicada e o histórico técnico, que continua preservado na planilha.
- Retomada de importação pelo mesmo ID e hash; uma parte repetida não duplica o conteúdo. Partes diferentes ou arquivos incompletos/adulterados são recusados.
- Confirmação vinculada à prévia atual: selecionar outro arquivo impede confirmar a prévia anterior. Alterar a planilha depois da prévia também impede substituir os dados sem nova conferência.
- A cópia anterior é gravada antes dos dados financeiros pelo diário recuperável. Interrupções e reenvios mantêm a operação original.
- Consultar uma restauração interrompida não apaga o bloqueio só porque a fila local está vazia. Consulta o identificador original.
- Novo empréstimo mostra apenas o cadastro; Consultar mostra a consulta e suas ações. Os valores digitados e filtros são preservados na alternância. Os atalhos de cadastro e de simulador abrem o cadastro.
- Datas automáticas, mês calculado e uma parcela padrão não geram rascunhos recuperáveis. Cópias antigas sem conteúdo são ignoradas na lista, sem apagar cópias úteis de outras páginas. Envios identificados continuam protegidos.
- Consumo por forma mantém os totais pessoais e de terceiros no mês. O botão Conferir pagamento aparece somente se houver saldo ao banco. Receber da pessoa não quita o banco; pagar o banco não marca a pessoa como recebida.

## Desempenho

- Consultas simultâneas compartilham o envio e a atualização da tela. Respostas de leitura atravessadas por uma gravação são descartadas e consultadas novamente, com limite.
- Relatórios mensal e anual podem reaproveitar por até 15 segundos um resultado em memória. O cache tem limite de entradas/tamanho, mantém o horário original e é invalidado por gravações, consulta completa e retorno ao app. Prévias financeiras, backups e gravações não usam esse cache.
- Gráficos e listas de empréstimos de abas ocultas aguardam a abertura. Na troca de mês, indicadores antigos ficam cobertos e fora do foco até os valores corretos chegarem; falhas oferecem Tentar novamente.
- A manutenção de recorrências não é repetida em cargas idênticas. Mudança de dia, configuração ou edição direta da planilha volta a exigir a conferência. A assinatura é uma otimização descartável, não a fonte financeira.
- Cópias de snapshots evitam conversão redundante em JSON; a apresentação das células só é buscada quando necessária. Hashes iguais podem ser reaproveitados exclusivamente dentro da mesma operação.
- Pagamento e desfazer de faturas preparam blocos por aba, preservando fórmulas de linhas não atingidas. No cenário de 100 itens, as passagens de migração no pagamento caíram de 104 para 5. Isso mede trabalho em dados fictícios, não um percentual de velocidade da rede ou do Google.
- A página padrão de Atividade decodifica apenas os eventos pedidos e as reversões necessárias. No ensaio de 300 eventos, a primeira página decodificou 20. Busca textual ainda pode examinar o histórico para manter o resultado completo.
- Novas restaurações anexam a cópia de segurança sem reler e regravar o conteúdo de todas as cópias antigas. Nenhum comprovante de idempotência é apagado.

Medição reproduzível: `node scripts/medir-desempenho.cjs 100 1000`. Usa exclusivamente as planilhas fictícias dos testes. O relatório JSONL registra tempo local, hashes, migrações e linhas técnicas. As escolhas de chamadas agrupadas seguem as [boas práticas oficiais do Apps Script](https://developers.google.com/apps-script/guides/support/best-practices).

## Fragilidades encontradas e corrigidas

| Achado | Correção |
|---|---|
| Mês como Date nativo desaparecia do Mensal/Anual | Normalização de data, mês e parcela apenas na leitura, com regressões para diferentes formatos. |
| Mudar somente a data combinada não mudava versão | Metadado de devolução participa do hash; edição concorrente é recusada e Atividade permite conferir/desfazer. |
| Confirmar arquivo A depois de selecionar B | Controle de geração e estado; confirmação antiga não pode enviar B nem restaurar A. |
| Cópia anterior sem prova de integridade | SHA-256 e contagem; conteúdo truncado ou adulterado fica bloqueado. |
| Botão de conferência liberava restauração sem confirmar o requestId | Consulta específica da operação; bloqueio permanece quando há incerteza. |
| Trabalho quadrático ao pagar/desfazer fatura grande | Preparação em blocos por aba e preservação das fórmulas não afetadas. |
| Valores do mês anterior continuavam visíveis sob o novo mês | Estado de carregamento cobre indicadores e ações até aplicar o período correto. |
| Transferência de todo histórico técnico para cada página | Leitura paginada por cabeçalhos, preservando o evento original ao desfazer. |
| Cópias recuperáveis criadas só por abrir formulários | Critério de conteúdo útil, sem considerar datas e parcelas automáticas como despesa preenchida. |

## Limites e preservação

Restaura as cinco abas de dados do app. Não restaura código, credenciais, implantação, permissões, preferências locais, chave Pix local, gráficos ou abas particulares do Google Planilhas. Abas opcionais ausentes são preservadas e informadas. O histórico de atividade e o diário atuais não são substituídos pelos de um arquivo antigo.

Limites: arquivo/conteúdo de até 8 MiB; até 20.000 linhas por aba e 500.000 células no conjunto; no máximo 20 preparações temporárias simultâneas. A preparação expira em 24 horas. Partes temporárias vencidas podem ser removidas ao iniciar outra preparação; isso não remove diário, cópias anteriores ou registros financeiros. Para continuar uma importação ativa interrompida, selecione o mesmo arquivo. Para preparação vencida, descarte a referência ou selecione novamente para preparar outra.

As travas, as validações de versão e a recuperação pelo diário permanecem. Não foi adicionada autenticação nova nem alterada a proteção da Vercel. O comportamento na implantação Google/Vercel e a experiência em aparelho físico ainda precisam de conferência na cópia de teste.

## Validação e publicação

- [x] Suíte completa: **323 testes aprovados, zero falhas**.
- [x] Importação/exportação grande, retomada, alteração/truncamento de partes, checksum e cópia anterior verificados com dados fictícios.
- [x] Concorrência de leituras, cache, respostas antigas, filtros e preservação de rascunhos verificados.
- [x] Pagamento e desfazer de fatura grande, edições concorrentes de data combinada e datas nativas nos relatórios verificados.
- [x] Navegador móvel em 390 × 844: prévia → confirmação → restauração → catálogo → prévia da cópia anterior; a última prévia não foi aplicada.
- [x] Backup JSON baixado e analisado: planilha Teste isolado, dois gastos pessoais e um empréstimo após a restauração, sem dados reais.
- [x] Novo/Consultar alternam áreas sem perder o nome digitado. Abrir formulário vazio não mostrou rascunhos recuperáveis vazios.
- [x] Fatura fictícia de R$ 170 quitada ao banco; no Mensal, o botão de pagamento sumiu, e R$ 70 de terceiros continuaram visíveis e a receber.
- [x] Console sem erros no fluxo conferido. CSS compilado com 40.497 bytes; interfaces e cópia pública sincronizadas. `git diff --check` sem erros.

Evidência visual: [Mensal quitado com terceiros preservados](C:/Users/lucas/Documents/Codex/mensal-quitado-terceiros-preservados-20261024.png). Log da suíte: [323 testes](C:/Users/lucas/Documents/Codex/restauracao-desempenho-suite-completa-20261024.log). Medição reproduzível: [JSONL dos cenários de 100 e 1.000 registros](C:/Users/lucas/Documents/Codex/medicao-desempenho-final-20261024.jsonl).

Todos os testes usaram dados fictícios. Não houve publicação, uso de conta Google ou gravação na planilha real. A conferência na implantação de teste e em aparelho físico permanece como etapa de instalação.

Atualize juntos `Backend/Code.gs`, a interface e `api/gestor.js`. O backend usa protocolo 9, o service worker usa `gestor-gastos-v34`; a interface recusa novas gravações se o backend estiver antigo. Compilar com `npm run build` sincroniza as três interfaces e prepara `dist/`.

Antes da versão definitiva: na cópia de teste, exporte JSON, registre um gasto fictício posterior, confira a prévia, cancele, reabra e restaure; confira totais, empréstimos, notas e cópia anterior. Teste também recebimento parcial, pagamento e desfazer de fatura, fixos e um envio pendente de outro aparelho.