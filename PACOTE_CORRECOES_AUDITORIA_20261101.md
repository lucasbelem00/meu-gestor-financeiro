# Correções da auditoria — 01/11/2026

## Checklist do pacote

- [x] Prévia de restauração de Planejamento compara pelo ID e pelos oito campos; mudanças de ordem não viram alterações falsas.
- [x] CSV usa valores numéricos originais para moeda e preserva datas, cabeçalhos e textos. Não soma novamente os retratos anuais v3.
- [x] CSV usa preparação, download em partes e conferência de integridade. Prepara apenas a aba escolhida e seus arquivos legados, sem baixar notas, planejamento ou retratos v3 duplicados.
- [x] Preparação da exportação mantém o mesmo formato ao repetir o identificador; não reutiliza uma preparação de empréstimos como lançamentos ou JSON.
- [x] Leitura do arquivo e consulta do extrato têm controles separados. Um clique antecipado não descarta a leitura; uma leitura antiga não substitui um arquivo novo.
- [x] Total Carteira sai somente do seletor de extrato. Continua nos demais lugares do app. Cartões arquivados permanecem no seletor para consulta histórica, identificados.
- [x] Mudanças na base, nas formas ou na configuração invalidam a conferência. Respostas anteriores não preenchem outra seleção.
- [x] Conferência mostra horário da consulta e apresenta cada candidato como um par “No extrato / No app”, com contagem consistente.
- [x] Diagnóstico distingue arquivo inválido de registro inválido retornado pelo app, sem incluir conteúdo financeiro.
- [x] Adicionar produto invalida o resultado antigo e pode focar o novo campo.
- [x] Comparador tem Limpar tudo, com confirmação para conteúdo preenchido; retorna a duas opções vazias. Uma confirmação antiga não apaga edição feita depois.
- [x] Virada do dia/mês revalida os dados ao entrar ou retomar Painel/Agenda. Falta de rede mantém aviso e permite tentar novamente. Não recarrega o aplicativo ou interrompe formulários/modais ativos.
- [x] Camada intermediária de fechamento do editor repassa argumentos e retorno.
- [x] Removido o caminho antigo de exportação que baixava a base inteira em uma resposta.

## Onde está cada parte

- `Backend/Code.gs`: comparação de restauração e preparação restrita de CSV (`montarDadosExportacaoCSVGestor_`, `prepararExportacaoBackupWeb`).
- `interface/protecao.js`: montagem e formatação da visão financeira para CSV (`abaCompletaCSVProtecaoGestor`).
- `interface/restauracao.js`: download conferido em partes para JSON e CSV.
- `interface/conferencia.js`: leitura/consulta, diagnóstico, invalidação, pares e limpeza do comparador.
- `interface/desempenho.js`: revalidação de dia (`criarRevalidadorDiaGestor`), sem consulta repetida no mesmo dia ou durante edição.
- `tests/correcoes-auditoria-20261101.test.cjs`: reprodução das falhas e verificações de concorrência, restauração, volume, integridade e virada de calendário.

## Como testar depois de publicar no ambiente de testes

1. No comparador, preencha duas opções e compare. Adicione uma terceira: o resultado anterior deve desaparecer. Limpar tudo deve pedir confirmação e retornar a duas opções vazias.
2. Troque para Calculadora/Notas e volte ao comparador: o preenchimento permanece durante a sessão.
3. No extrato, escolha um CSV UTF-8. Durante a leitura/consulta, Comparar fica desativado. Trocar de arquivo ou filtro impede que a resposta anterior apareça na nova seleção.
4. No seletor de extrato, confira que Total Carteira não aparece e que um cartão arquivado continua disponível. No Painel e em Cartões e Limites, o resumo continua existindo.
5. Faça uma comparação simples com um par: o resumo e o grupo devem indicar um candidato. O par deve mostrar os dois lados.
6. Copie o diagnóstico. Deve conter códigos e contagens, sem nomes, descrições, valores ou conteúdo do CSV.
7. Exporte Lançamentos e Empréstimos em CSV, com organização anual ativa. Confira moeda brasileira, datas, quantidade de registros e ausência de duplicatas dos retratos. O CSV continua sendo de consulta, sem função de restauração.
8. Em uma cópia de testes, salve um JSON, altere progresso/nome de uma meta e abra a prévia desse backup. A diferença deve aparecer pelo nome da meta. Não restaure a base definitiva só para testar.
9. Ao atravessar a virada do dia com o app aberto, retome Painel/Agenda. Deve atualizar os dados; sem conexão, deve mostrar aviso. Formulários abertos aguardam a saída para uma tela de consulta.

## Publicação

Atualize também `Backend/Code.gs` na implantação do Apps Script. A exportação CSV em partes precisa dessa versão do servidor; uma versão antiga gera uma orientação para atualizar em vez de produzir um arquivo incompatível. Não é necessário executar função nova na planilha.

O código foi preparado localmente. Nenhuma implantação, restauração ou alteração de dados reais faz parte desses testes.

## Validação realizada

731 testes automatizados passaram, sem falhas. Incluem concorrência da leitura CSV, respostas antigas, diagnóstico sanitizado, limpeza com confirmação, prévia por ID, integridade/paginação de uma exportação com 500 registros e relógio controlado atravessando mês/ano. Módulos incorporados, três interfaces HTML e `dist/index.html` foram conferidos. A conferência visual no navegador/celular e a importação de um CSV bancário real ainda devem ser feitas no ambiente de testes.
