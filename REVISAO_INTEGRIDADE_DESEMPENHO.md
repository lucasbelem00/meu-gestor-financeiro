# Varredura de funcionalidade e fragilidades — 18/10/2026

Registro histórico: a paginação comum da Atividade no backend foi implementada depois desta análise. Consulte [o guia atual](GUIA_MELHORIAS_E_PENDENCIAS.md) para separar pendências reais de recomendações já atendidas.

## Correções aplicadas

- Restauração valida notas, identidades, parcelas, limites dos cartões e metas antes de gravar. Abas opcionais ausentes no arquivo são preservadas, com aviso na prévia.
- Máscaras numéricas do backup não são importadas. Dados usam os formatos do aplicativo; uma máscara incompatível de uma operação antiga não impede a recuperação dos valores.
- Reenvios continuam protegidos pelo diário durável. A consulta busca operações específicas e recupera operações pendentes, sem transferir todo o diário a cada gravação.
- Atividades novas são acrescentadas ao histórico, com recuperação sem duplicação quando a resposta se perde. Conflitos interrompem a operação em vez de sobrescrever registros.
- O aplicativo informa o tamanho das abas técnicas no diagnóstico. Acima de 50 mil linhas no diário, 20 mil em atividades ou 10 mil em restaurações, recomenda revisar o crescimento.

## CSS e publicação

O Tailwind agora gera cerca de 40 KB de CSS antes da publicação. O navegador recebe os estilos prontos, sem executar o gerador. O comando `pnpm build` compila e sincroniza as três interfaces e prepara `dist/` somente com HTML, ícones, manifesto e service worker. O backend e os testes ficam fora dessa pasta pública. A função Vercel permanece em `api/gestor.js`.

O Vercel está configurado para executar esse processo. Instale as dependências com o lockfile antes da compilação. Alterações de classes exigem nova compilação; as classes dinâmicas devem continuar escritas por inteiro no código.

## Crescimento futuro

Não há exclusão automática dos registros técnicos. Apagar o diário poderia permitir que um envio antigo fosse gravado novamente. Um futuro arquivamento deve guardar um índice permanente das operações confirmadas, preservar pendências, produzir backup e ser conferido antes de remover linhas. A abertura da lista de atividades ainda pode ler o histórico completo; paginação no backend é o próximo passo se o volume justificar.

## Dependências

A versão de `postcss-selector-parser` foi fixada em 7.1.6 para corrigir o alerta conhecido. Na análise de 18/10 havia também o aviso de desenvolvimento [GHSA-vfj7-8cjw-p6xm em braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), sem versão corrigida publicada naquele momento. **Conferência em 23/10/2026:** o GitHub retirou esse aviso nessa data, informando que ele não representa uma vulnerabilidade explorável na prática. O projeto continua com `braces` 3.0.3 no lockfile; não houve uma atualização dessa biblioteca para encerrar o aviso. Ela participa apenas da compilação e não é enviada ao navegador nem usada pela API. O compilador continua aceitando somente HTML local confiável, sem padrões glob ou conteúdo de usuários, com limites de tamanho e aninhamento da fonte.

## Verificação e limites

Testes locais cobrem restauração, Pix à vista e parcelado, centavos, recebimento, reenvios, diário grande, interrupção de atividade e publicação. O navegador isolado conferiu menu, pagamento parcial, desfazer, exclusão recuperável, pesquisa, fila offline e diagnóstico com dados fictícios, em celular e computador.

As mudanças ainda precisam de publicação e conferência na cópia de teste real do Apps Script/Vercel. Não houve acesso à planilha original. Nenhuma revisão garante ausência de todos os erros futuros.

Resultado final: 93 testes locais passaram, sem falhas nem testes ignorados. As três interfaces possuem o mesmo conteúdo.

## Recuperação de inclusão incompleta — 18/10/2026

O diagnóstico real encontrou um gasto fixo com os dados principais presentes, mas status e controles vazios. As linhas anteriores coincidiam com o estado anterior registrado no diário. A causa que esvaziou esses campos ainda não foi identificada.

A recuperação agora admite completar uma única linha acrescentada ao final quando todas as linhas anteriores estão intactas, todos os campos preenchidos coincidem e faltam somente status ou controles. O resultado reconstruído deve coincidir integralmente com o hash preparado no diário. Qualquer divergência em valor, pessoa, descrição, data, forma ou registro anterior continua bloqueada. Não há confirmação manual nem descarte de pendências. A gravação também é relida antes da confirmação para detectar resultados incompletos.

Para aplicar na cópia de teste, substituir Backend/Code.gs no projeto correto e atualizar a implantação existente para uma nova versão. Depois atualizar os dados do app: a consulta tenta concluir a operação pendente e o histórico. Não cadastrar o gasto novamente nem editar o diário para forçar confirmação.

A mensagem real de validação em J15 revelou uma lista antiga que só aceitava Pago, Em Aberto e Agendado. O backend agora atualiza a validação de J2:J nas linhas de Lançamentos antes da gravação, incluindo os estados de assinatura e cancelamento. A validação continua rejeitando estados desconhecidos. Um teste reproduz a regra antiga e exige sua atualização antes de salvar o gasto fixo.

## Setas da aba Mensal

Foi reproduzido o avanço de outubro para outubro: o backend removia meses repetidos dos gastos pessoais antes de acrescentar meses dos empréstimos. A interface deduplicava as opções visíveis do seletor, mas não a lista usada pelas setas. Com isso, a seta avançava para outra entrada do mesmo mês.

A consolidação agora remove repetições depois de reunir pessoais e terceiros. A lista das setas também normaliza e deduplica os períodos, inclusive ao receber dados de um backend anterior. O teste com meses repetidos falhou antes da correção e passou depois. Os 22 testes direcionados de navegação, funcionalidades e relatórios passaram nesta etapa. Publicar a interface no GitHub/Vercel e atualizar a implantação existente do Apps Script para aplicar os dois lados da correção.
