# Backups e manutenção de longo prazo — 25/10/2026

As alterações deste pacote estão implementadas no projeto local. A pasta real foi criada e conferida como particular: [Backups do Gestor de Gastos](https://drive.google.com/drive/folders/1d3jqGUnFA7apPE5GxC5Sg3j5wFpHmDRh).

**A rotina real ainda precisa ser ativada depois da atualização do Apps Script.** Os testes usaram planilhas e Drive fictícios; não moveram seus lançamentos reais nem instalaram gatilhos na sua conta.

## O que mudou

- [x] Backup mensal automático no Google Drive, em JSON, com conferência de integridade após a gravação.
- [x] Botões em Menu → Exportar dados e backup: situação, ativação, backup imediato e prévia da manutenção.
- [x] Arquivos anuais em Google Planilhas para compras inteiramente encerradas de anos anteriores. O app continua consultando esses anos no Histórico, Mensal e Anual.
- [x] Empréstimos arquivados continuam consultáveis ao incluir recebidos; o padrão continua Todos os meses + A Receber.
- [x] Totais pessoais de todo o histórico e exportações CSV incluem os registros anuais.
- [x] JSON completo incorpora o conteúdo dos anos arquivados. Restaurar não depende de os arquivos anuais originais ainda existirem: são criados novos arquivos conferidos.
- [x] Compactação do histórico técnico com mais de 180 dias, preservando comprovantes de operações confirmadas e canceladas para reconhecer reenvios.
- [x] Plano de manutenção gravado e conferido no Drive antes de alterar a origem. Uma interrupção pode ser retomada; divergências externas impedem sobrescrever dados.
- [x] Atalho Voltar ao padrão nos filtros de Empréstimos, inclusive quando existem resultados. Retorna a Todos os meses + A Receber, sem pessoa, forma ou busca específica.
- [x] Memória da descrição mantém o comportamento já existente, sem acrescentar o botão Usar sugestão.

## Como ativar, uma única vez

1. Atualize o Apps Script com **Backend/Code.gs** e a interface gerada em **Backend/Index.html** ou **Backend/Index_para_colar.txt**, conforme o procedimento que você já usa. Publique uma nova versão do Apps Script e atualize também o app/proxy na Vercel. Este pacote usa protocolo 10 e cache v38.
2. Na planilha, abra **Extensões → Apps Script**. No seletor de funções, escolha **configurarProtecaoAutomaticaGestor** e clique em Executar.
3. Autorize sua própria conta Google quando solicitado. Essa autorização permite que o seu script grave as cópias particulares no Drive e execute a rotina agendada.
4. O script encontrará a pasta **Backups do Gestor de Gastos** pelo nome. Se houver mais de uma pasta com esse nome, informe o endereço correto ao chamar a função; não escolha outra aleatoriamente.
5. No app atualizado, abra **Menu → Exportar dados e backup**. Confira a situação e use **Fazer backup no Drive agora** para confirmar a primeira cópia sem esperar o agendamento.
6. Confira que aparece o mês do último backup confirmado e que o arquivo está na pasta do Drive. A partir daí, a rotina funciona também com o app fechado.

Também existe a ativação pelo botão do app. Se o Google pedir uma autorização que não puder ser concluída por ali, siga os passos pelo editor do Apps Script acima. Repetir a instalação na mesma conta não cria outro gatilho igual. Se o gatilho for removido por fora, o painel permite reativá-lo.

## Como funciona no dia a dia

O agendamento verifica diariamente, na faixa das **3h**, usando o fuso do script. A execução não tem minuto exato garantido pelo Google. Na primeira execução bem-sucedida de cada mês, confirma uma cópia JSON. Se falhar, a próxima execução tenta novamente; o painel mostra o último erro conhecido. Não há envio de mensagens a outras pessoas.

O JSON guarda lançamentos, empréstimos, configurações das abas, notas e o conteúdo dos arquivos anuais. Código do app, credenciais e configurações exclusivas do aparelho não são copiados. O histórico técnico atual continua preservado na origem durante a restauração.

O arquivo anual é uma **planilha nativa do Google**, com Lançamentos, Empréstimos, configurações de referência e Leia-me. É um arquivo para consulta do passado, não outra planilha ativa para novos lançamentos. Não altere seus registros: a conferência detecta mudanças antes de misturar esses dados à consulta do app.

Uma compra só sai da principal quando **todas as suas parcelas** estão encerradas e pertencem a anos anteriores. Em empréstimos, precisa estar recebida da pessoa **e** paga ao banco. Dívidas em aberto, compras com parcelas futuras e séries fixas permanecem na principal. Registros envolvidos em ações reversíveis nos últimos 90 dias também ficam na principal.

Todo mês a rotina reconsidera valores antigos que tenham sido quitados depois. Quando precisar ampliar um arquivo anual, cria uma nova revisão e mantém a anterior. Cada rodada move até 2.000 registros, sem dividir uma compra; outros lotes continuam em execuções posteriores.

Antes do arquivamento financeiro, há uma cópia extra de segurança. A origem só muda após gravar, reler e conferir o destino. Interrupções entre abas são retomadas pelo plano guardado. Se alguém alterar a planilha durante uma interrupção, a rotina para para conferência, preservando a diferença.

## Manutenção técnica e limites

O histórico técnico guarda as provas necessárias para evitar lançamentos e recebimentos duplicados. A compactação desloca o conteúdo detalhado antigo para JSON no Drive, mas mantém na principal a identificação, o resultado confirmado ou o cancelamento e a referência conferida. Não apague linhas técnicas nem arquivos dessa pasta manualmente para tentar acelerar o app.

Arquivos mensais, revisões anuais, planos e comprovantes técnicos **não são apagados automaticamente**. Isso prioriza a recuperação e exige espaço disponível no Drive. As provas pequenas continuam crescendo na principal; essa manutenção reduz o conteúdo detalhado, não promete armazenamento ou duração ilimitados. O Apps Script continua sujeito aos limites de execução do Google.

A restauração pelo app continua limitada a **8 MB, 20 mil linhas por aba/partição e 500 mil células no conjunto**. Um backup maior pode ser preservado integralmente, mas precisará de recuperação assistida em lotes. O app bloqueia o que excede esses limites, sem cortar conteúdo silenciosamente.

O agendamento usa a conta que o instala. Use a conta proprietária da planilha e uma pasta particular dessa mesma conta. Cópias de teste e de uso real recebem identificações diferentes, mesmo que usem a mesma pasta. Mudou a planilha configurada? Reative para confirmar o novo destino.

## Se algo não confirmar

- **Sem conexão ou autorização:** reconecte e confira a situação; no primeiro uso, execute a ativação no Apps Script.
- **Envios em conferência:** resolva-os em Atividade e sincronização antes da manutenção. Não repita o lançamento com outro identificador.
- **Arquivo alterado/incompleto ou edição externa:** preserve a planilha e os arquivos. Não exclua a pendência nem edite as abas técnicas. O aviso indica que a rotina preferiu parar a sobrescrever uma diferença.
- **Falha após criar um backup:** consulte a situação e tente a mesma operação novamente. A preparação durável permite reaproveitar a cópia conferida.

## Validação

Suíte completa: **375 testes aprovados, zero falhas**, incluindo 19 cenários deste pacote. Cobrem consulta após arquivar, totais e consumo por categoria preservados, parcelas futuras, banco e pessoa separados, restauração com conteúdo anual independente do arquivo original, datas nativas, interrupção entre abas, edição externa, cópia corrompida, reenvio protegido e comprovante cancelado.

O navegador foi conferido com interface e proxy reais sobre planilhas e Drive fictícios: ativação, backup, prévia, arquivamento, consulta do Histórico, bloqueio da edição arquivada e retorno aos filtros iniciais. O painel também foi conferido em 390 × 844 px, sem erros de console nos fluxos exercitados. Um consumo do primeiro clique causado por consulta ao receber foco foi corrigido; a situação agora é consultada ao abrir o painel.

CSS compilado: 40.657 bytes. Sintaxe do backend e dos scripts conferida; index.html, duas interfaces do Apps Script e dist/index.html idênticos. Cache v38 e protocolo 10. Nenhuma publicação, ativação real do gatilho ou movimentação de registros reais foi realizada.
