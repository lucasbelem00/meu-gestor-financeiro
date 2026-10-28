# Pacote de continuidade — 28/10/2026

Base anterior: 25a9f69. Este documento acompanha as alterações locais autorizadas após a vistoria de 27/10 e a proposta de planilhas anuais. Protocolo 15 e cache v48. A instalação na conta Google não é feita pelo build local.

## Checklist do pacote

- [x] Correção de Pix para cartão também ao mudar valor ou competência, sem pagamento fictício; valores recebidos da pessoa continuam protegidos.
- [x] Cabeçalho legado de Notas compatível com backup/restauração, preservando revisão e exclusão lógica. Campos desconhecidos mantêm o financeiro disponível e pedem conferência específica.
- [x] Backup anunciado como confirmado somente após validar o esquema e reler o arquivo. Personalizações válidas podem ter cópia integral preservada para recuperação assistida, com aviso explícito.
- [x] Catálogo único de ações para consultas, operações financeiras, preparações temporárias, manutenção e recuperação. Consultas de backup não criam pendências financeiras falsas.
- [x] Retirado o restaurador antigo de 500 ms; rascunhos concluídos não são recolocados por esse timer.
- [x] Formas com identidade permanente, tipo e nomes anteriores; reordenação, desfazer e backup preservam essa identidade. Nomes antigos não podem identificar outro cartão ambiguamente.
- [x] Outros padronizado de forma coordenada no cadastro e nos registros ativos, preservando valores e identidades.
- [x] Reservas e recibos locais de Notas confirmadas compactados; pendências e preparações continuam integrais.
- [x] Resumo nativo derivado da fonte financeira do app, incluindo anos e ajustes; migração restrita às fórmulas padrão reconhecidas. Fórmulas particulares não são apagadas para liberar manutenção.
- [x] Central de Navegação ocupa a altura útil do celular, com cabeçalho fixo, grade compacta, foco controlado e rolagem de segurança.
- [x] Consolidação dos 13 corpos substituídos, remoção de três auxiliares sem referências e retirada dos cálculos financeiros antigos sem efeito. Inicialização usa o carregador atual.
- [x] Mapa dos módulos, funções principais, fontes e artefatos gerados.
- [x] Bases anuais por competência com um único webapp e controle permanente.
- [x] Preparação antecipada de ano futuro quando houver parcelas, fechamento de anos passados e ajustes posteriores sem reescrever o retrato fechado.
- [x] Planos financeiros recuperáveis para destinos anuais, com nova conferência antes/durante a aplicação, inclusive destinos preparados sem mudança de linha.
- [x] JSON v3 com estado efetivo e retratos anuais, independente dos endereços antigos do Drive. Importação v1/v2 preservada.
- [x] Recuperação de ano ausente/corrompido por JSON completo, com confirmação específica e cópia anterior do diagnóstico/conteúdo legível.
- [x] Migração do catálogo anual antigo sem duplicar registros nem apagar os arquivos anteriores.
- [x] PDFs automáticos mensais e anuais no Drive, com revisão, conferência de bytes e retomada. Correções tardias e exclusão do último item produzem nova revisão.

## Como os anos funcionam

O endereço do app e o ID da base de controle permanecem. Essa base mantém cadastros, categorias, Notas, provas das operações, catálogo dos anos e ajustes. Os lançamentos financeiros ficam nas planilhas anuais correspondentes à competência da fatura. Uma compra parcelada entre dezembro e janeiro conserva os IDs e pode preparar o próximo ano antes de janeiro chegar.

O ciclo automático prepara o ano atual e confere os anos anteriores antes de fechá-los. Uma pendência de envio impede essa manutenção; uma dívida ainda não recebida não impede o uso do novo ano. Depois do fechamento, o arquivo anual conserva o retrato e o app aplica os movimentos posteriores por registros vinculados no controle. Pagar ao banco e receber de uma pessoa continuam independentes.

As telas de Histórico, Mensal e Empréstimos apresentam indicação do ano fechado e permitem conferir a situação preservada quando há vínculo. O relatório mostra o estado atual; o retrato do fechamento continua acessível. Um registro incluído depois do fechamento é identificado como tal.

## Instalar primeiro na cópia de testes

1. Atualize `Backend/Code.gs` e a interface gerada `Backend/Index.html` ou `Backend/Index_para_colar.txt` no projeto Apps Script de testes. Publique a nova versão e atualize frontend/proxy juntos.
2. Confira o destino nas propriedades: o projeto de testes deve apontar para **Cópia de Gestor de Gastos**. A planilha **Gestor de Gastos** é a definitiva. Identificação é pelo ID, não apenas pelo título.
3. No app, abra Menu → Exportar dados e backup. Atualize a situação e confira o nome da base de controle mostrado ali.
4. Ative/reative a proteção automática se necessário. Autorize o próprio Apps Script na conta proprietária, conforme a orientação já existente.
5. Use **Ativar organização por ano e PDFs**. Essa etapa confere uma cópia antes de organizar os registros. Se houver personalização incompatível, ela para e preserva o conteúdo.
6. Confira os links dos anos na mesma tela, totais antigos, saldo de uma fatura e valores a receber. Teste a restauração em uma cópia descartável, nunca sobre a definitiva para experimentar.
7. Depois da conferência real na cópia, repita a instalação no projeto definitivo com suas próprias propriedades e destinos. Não substituir o ID da planilha todo janeiro nem copiar indiscriminadamente as propriedades do projeto de testes.

Os gatilhos usam as funções já existentes; não instalar gatilhos duplicados. A rotina diária continua funcionando com o app fechado. O JSON mensal é a cópia para recuperação. PDFs de meses completos e anos passados são gerados em lotes de até dois por rodada; arquivos pendentes continuam em rodadas seguintes.

## Resumos e cópias

O Dashboard nativo recebe referências para `_Gestor_Resumo`, que reúne os períodos existentes. Categorias/metas e formas continuam preservadas. Somente fórmulas padrão identificadas são migradas; uma fórmula particular que dependa de mover linhas exige revisão. O resumo é reconstruído após alterações financeiras e no ciclo automático. Se uma atualização derivada falhar, a gravação financeira confirmada não é desfeita; o painel informa o erro dos relatórios.

PDFs são resumos de consulta, com período, data, revisão e separação entre seus gastos, banco e terceiros. São salvos na pasta particular **Backups do Gestor de Gastos**. Nenhum PDF, planilha antiga ou JSON é apagado automaticamente. O processo não tenta baixar arquivos no celular com o app fechado.

Uma cópia com colunas/fórmulas particulares pode ficar como **preservada para recuperação assistida**. Seu conteúdo integral é guardado e relido, mas ela não aparece como novo backup automaticamente restaurável. A organização anual não usa esse tipo de cópia para autorizar remoção de dados particulares.

## Limites e cuidados de migração

- Os limites do importador continuam: 8 MiB, 20 mil linhas por aba/partição e 500 mil células no conjunto. Não há promessa de uso ou restauração ilimitados. Crescimento além disso exige recuperação em lotes; o app não corta conteúdo para caber.
- A leitura dos anos usa cache somente durante a operação. Antes de aplicar planos, os destinos são novamente conferidos; consultas sem alterações não redistribuem as linhas anuais.
- Identidades/aliases preservam renomeações a partir desta atualização. Se o vínculo entre dois nomes já se perdeu antes, o código não adivinha qual cartão novo corresponde ao registro antigo.
- Notas podem ser usadas como diário. Isso não gera gastos, pagamentos ou empréstimos automaticamente. Notas excluídas mantêm marca técnica para impedir reaparecimento por outro aparelho.
- Colunas técnicas de tipo e identidade de formas são ocultadas quando o ambiente do Planilhas permite; não apagá-las. Uma aba Leia-me explica o controle permanente após ativar os anos.
- A planilha financeira fechada deve continuar sem edições manuais. Alteração externa divergente bloqueia a mistura dos dados até conferência.

## Validação

- Suíte integrada final: **555 testes aprovados, zero falhas, cancelamentos ou testes ignorados**. Log: `C:/Users/lucas/Documents/Codex/pacote-continuidade-suite-homologacao-20261028.log`.
- Backend e scripts incorporados do HTML passaram na validação de sintaxe. Os quatro HTMLs (raiz, duas cópias Apps Script e dist) estão idênticos; CSS compilado com 41.105 bytes.
- Medição local com 1.000 registros fictícios em quatro anos: relatório mensal correto de R$ 2.500, cinco aberturas de planilha (controle + quatro anos), zero linhas novas no diário. Tempo local observado: 1.941 ms. Isso mede CPU e mocks; não prevê latência do Google, rede ou celular, nem demonstra ganho percentual contra a versão anterior.
- As regressões cobrem separação banco/pessoa, Pix com mudança de valor/mês, renomeação, rascunhos, Notas antigas/literais/conflitos, personalizações, fórmulas, parcelas entre anos, fechamento com saldos, baixas tardias, migração dos anuais antigos, restauração sem destinos originais e interrupção em vários destinos.
- A revisão adversa acrescentou bloqueio de colunas particulares na ativação, conferência integral de destinos preparados mesmo quando não há alteração planejada e identificação de backup que inclui o estado dos anos.
- Testes comportamentais da Central cobrem foco, Escape, bloqueio/retorno da rolagem e estrutura responsiva. A conferência visual atual não foi homologada: CUA exibiu cache antigo/timeout e depois indisponibilidade do navegador; a tentativa final também expirou. Nenhuma captura antiga foi usada como prova da interface nova. Os servidores temporários foram encerrados.
- A leitura da cópia real foi delimitada às fórmulas necessárias para reconhecer os templates do Dashboard. Não houve gravação em planilhas reais, instalação de gatilhos, mudança de propriedades, publicação, commit ou push nesta implementação.

Os testes usam planilhas/Drive fictícios. A conversão real de HTML para PDF utiliza [Blob.getAs, da API do Apps Script](https://developers.google.com/apps-script/reference/base/blob#getAs(String)); a conferência automática de PDF foi exercitada com um conversor simulado. O build não substitui a homologação da implantação no celular, das permissões, do agendamento e da conversão no serviço real.
