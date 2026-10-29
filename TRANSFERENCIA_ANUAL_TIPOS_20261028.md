# Tipos de célula e transferência anual pendente — 28/10/2026

Pacote local: protocolo 16, cache v53. Complementa as correções de ativação em segundo plano e leitura de competências nativas.

## Causa confirmada

A inspeção somente de leitura da cópia de testes encontrou uma transferência preparada no diário: a primeira aba anual recebeu os registros, mas a retirada da base principal não ocorreu. No destino, parcela e mês foram convertidos de texto em datas. A conferência do conteúdo percebeu a mudança de tipo e interrompeu o plano. A leitura seguinte encontrou as mesmas identificações na origem e no destino e recusou misturar os registros.

Não era necessário apagar lançamentos duplicados manualmente. O diário preserva a operação de transferência e a base principal ainda conserva os registros. Nenhuma célula real foi alterada durante esta investigação; a recuperação descrita abaixo depende da publicação do código.

## Prevenção nas gravações

`textoCelulaRegistroGestor_` aplica o escape de texto também a datas escritas como texto, parcelas e competências, reconhecendo o escape usado pelas versões anteriores para não acumular apóstrofos. O escape é de entrada; os campos continuam apresentados normalmente no Planilhas e no app. Datas nativas e números não são convertidos em texto.

O aplicador do diário e a gravação das matrizes financeiras usam a mesma função. Isso abrange cadastros de gastos, parcelas, empréstimos, edições, organização anual, manutenção e preparação de restauração. Não depende do formato visual nem da configuração regional do novo arquivo.

## Recuperação protegida

Antes de reaplicar o diário, a recuperação verifica:

1. O destino anual pertence à base e está aberto.
2. Existe no plano a retirada da mesma aba da principal, e o hash completo da origem continua igual ao registrado antes da transferência.
3. Cada linha afetada tem a mesma identificação e conteúdo da origem.
4. A diferença é somente uma conversão de texto para data nos campos de data, parcela ou mês. A interpretação deve corresponder ao texto e à configuração regional conhecida.
5. Repondo esses textos, o hash integral do destino coincide com o resultado preparado no diário. Qualquer outra diferença mantém o bloqueio.

Somente então as células de formato são corrigidas conforme o plano original. A aplicação normal confere novamente e conclui a transferência. O plano e sua identificação são conservados. Interrupção durante esse reparo pode ser retomada. Valores diferentes, IDs trocados, meses incompatíveis, linhas extras, origem alterada e destinos fechados não são corrigidos por aproximação.

## Painel de backup

Atualizar situação consulta diretamente o estado da proteção. Não exige que a carga financeira anterior tenha terminado para descobrir a versão do servidor. A resposta do estado informa o protocolo; as ações de escrita continuam exigindo versão compatível. Isso evita o aviso enganoso de atualização quando a carga inicial falhou por integridade.

## Como aplicar

1. Substituir `Code.gs` pelo conteúdo completo de `Backend/Code.gs` e publicar **Nova versão** da implantação existente do Apps Script. Salvar o editor, sozinho, não atualiza o endereço `/exec`.
2. Publicar também a interface e o service worker deste pacote. No app, usar Atualizar App para obter cache v53.
3. Reabrir e atualizar os dados. A leitura tenta reaplicar a transferência pendente com as conferências acima. Depois, em Exportar dados e backup, usar Atualizar situação e retomar a ativação se o painel oferecer essa opção.

Não é necessário executar função manual, apagar abas ou recriar identificações. Quando houver divergência verdadeira, o app mantém os dados preservados para conferência. Não houve implantação remota nem recuperação real por esta alteração local.

## Testes

As regressões fictícias simulam a conversão automática que os mocks antigos não reproduziam. Cobrem prevenção e restauração nas configurações `en_US` e `pt_BR`, parcela ambígua `2/5`, leitura bloqueada antes da correção, retomada sem duplicação, interrupção durante o reparo e rejeição de divergências reais. O painel é testado com protocolo inicialmente desconhecido.

Também foi ajustada a apresentação de parcela nativa como `1/1`, separada da competência `10/2026`, na leitura e exportação anuais. A simulação da validação de situação compara o texto efetivo sem o escape de entrada e continua recusando situações desconhecidas.

Validação final: **587 testes aprovados, zero falhas, cancelamentos ou ignorados**, incluindo 15 regressões novas. Build concluído; backend e 12 scripts da interface com sintaxe válida; quatro HTMLs idênticos e service worker v53 sincronizado. Log: `C:/Users/lucas/Documents/Codex/transferencia-anual-tipos-validacao-final-20261028.log`.

O mecanismo reduz a recorrência da causa identificada; não é uma garantia de ausência de qualquer falha futura do serviço externo.

Referência técnica: [o Google descreve o escape de texto e os tipos de célula](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/other#extendedvalue).
