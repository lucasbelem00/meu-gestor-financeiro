# Painel, Agenda e bases anuais — 30/10/2026

Implementado localmente, incluindo a continuação das propostas em `AJUSTES_FERRAMENTAS_PROPOSTA_PAINEL_20261030.md`. Protocolo 17, cache `gestor-gastos-v68`. Não houve publicação, escrita financeira real ou mudança de gatilhos/IDs das contas.

## Checklist do acumulado

- [x] “Mostrar arquivados” só aparece quando existe uma forma arquivada nos dados carregados.
- [x] Empréstimos usam ⚡ À vista, ➗ Parcela n/total e 📌 Fixo mensal, no padrão do app.
- [x] WhatsApp da rachadinha organizado por pessoa, com conta, pagamento ao estabelecimento e acertos separados; valores opcionais zerados omitidos.
- [x] Preencher minha parte conserva a descrição e não acrescenta “(minha parte)”.
- [x] Calculadora copia o resultado numérico; notas salvas copiam o texto e as quebras de linha.
- [x] Fixos programados mostram “A partir da fatura MM/AAAA”; mudanças futuras destacam somente as condições diferentes.
- [x] Painel reorganizado: Seu mês → O que precisa de atenção → Pagamentos e recebimentos → Horizonte → Análise e planejamento. O histórico global fica recolhido; o resumo geral de terceiros fica junto da ação correspondente.
- [x] Agenda financeira em Menu → Planejamento, com mês, tipo de compromisso e filtro por dia. Distingue fatura bancária de devolução combinada, sem novas consultas só para montar o calendário.
- [x] Bases anuais recebem cabeçalhos no padrão visual da base, larguras, filtros, colunas técnicas ocultas e resumo dos doze meses daquele ano. Novas bases herdam região e fuso antes da gravação dos registros.
- [x] Mapa do código, identidade visual, fontes incorporadas e arquivos de distribuição atualizados.

As ferramentas do primeiro grupo estão descritas com mais detalhes no relatório anterior. As correções financeiras e otimizações já entregues em `CORRECOES_PENDENCIAS_20261030.md` foram preservadas.

## Novos achados e correções

| Achado | Consequência possível | Correção |
| --- | --- | --- |
| Backup limitava o catálogo a 201 anos, enquanto o cadastro aceita 1900–2200 | Um backup válido com mais de 201 anos seria recusado | Limite derivado das mesmas constantes: 301 anos, mantendo validações e teto de células |
| Mudança futura de categoria em um fixo não aparecia na legenda | Condições diferentes pareciam repetições sem motivo | Texto identifica a nova categoria, junto das demais diferenças |
| Criador anual não definia explicitamente região/fuso da base | Uma nova planilha poderia interpretar/exibir datas e números com outra configuração | Herança antes da gravação; fuso e valores de arquivos antigos não são reescritos |
| Organizador anterior de pagamentos ficou redundante com a nova ordem | Dois trechos fariam rearranjos da mesma seção | Removida a implementação antiga e a chamada; preservados os controles existentes |
| Mapa do código ainda dizia “oito módulos” | Orientação de manutenção já desatualizada | Documentação aponta a lista real do gerador e descreve os novos módulos |

O inventário de referências analisou 915 declarações nas fontes, desconsiderando cópias geradas. As ocorrências únicas restantes são entradas da plataforma, manutenção manual ou diagnóstico. Duas funções locais chamadas `aplicar` pertencem a escopos diferentes. Não são duplicações globais; não foram removidas apenas pelo nome.

## Proteções da apresentação anual

O layout anual é uma adaptação da identidade da planilha, com referências locais daquele ano. Cadastros, controles, fórmulas da base central e automações não são clonados para criar controles concorrentes.

O resumo é derivado. Usa somente Lançamentos e Empréstimos do destino, ignora ocorrências canceladas/puladas e reconhece tanto competência em texto quanto data nativa. Quitação pessoal pelo status e pagamento parcial na coluna técnica seguem a distinção usada pelo backend. Recebimento de terceiros fica separado. Um ano fechado mostra o retrato do fechamento; os ajustes posteriores continuam no controle e no webapp.

O conteúdo gerado tem comprovante de preparação/conclusão. Uma interrupção pode ser retomada se o conteúdo corresponder ao anterior ou ao resultado esperado. Personalização divergente é preservada e vira aviso em Exportar dados e backup. Falha de apresentação não bloqueia uma compra por causa do layout. Separadores de fórmula normalizados pelo Sheets não são tratados como personalização.

Os campos financeiros, IDs e hash do ano fechado não mudam. A formatação não altera máscaras de datas nativas nos registros. Novas planilhas reaproveitam a aba inicial vazia como Dashboard & Resumo.

Referência visual conferida somente em leitura na **Cópia de Gestor de Gastos**: cabeçalho azul `#1b365d`, texto branco e Roboto 10. Documento técnico das APIs usadas: [Range](https://developers.google.com/apps-script/reference/spreadsheet/range) e [Spreadsheet](https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet). As fórmulas usam [FILTER](https://support.google.com/docs/answer/3093197), [ARRAYFORMULA](https://support.google.com/docs/answer/3093275) e [IFNA](https://support.google.com/docs/answer/9365944); apenas ausência de linhas é tratada como zero, sem esconder erros de referência.

## Usabilidade e desempenho

O Painel reaproveita os controles e dados existentes. Total do mês fica primeiro; valores globais e configurações opcionais perdem destaque diário. O gráfico tem altura fixa para não se esticar com a nova organização.

A Agenda reutiliza a carga existente e guarda o cálculo de eventos até a próxima atualização dos dados. Mostra somente faturas registradas com saldo e empréstimos a receber com data combinada. Previsão isolada de fixo não vira fatura registrada; sem data não vira atraso. Um dia sem compromissos não significa que todas as obrigações estão quitadas. Vencimentos no dia 31 são ajustados ao último dia do mês, inclusive fevereiro bissexto.

A medição local com mil registros fictícios confirmou as contagens já otimizadas: 4.000 chamadas ao hash por carga/relatório, 10.000 no pagamento e 11.000 ao desfazer. As duas leituras repetidas não acrescentaram linhas ao diário. Os tempos locais desta execução foram aproximadamente 2,44 s na primeira carga, 1,13 s na repetida e 0,94 s no relatório. Esses números não medem Google, Vercel nem a conexão do celular; não justificam prometer a mesma latência no app publicado.

Não foi criado outro cache financeiro persistente, retirado lock ou apagada prova de operação para ganhar velocidade. Os diários e a conferência de edição manual permanecem.

## Validação e limites

- **680 testes aprovados, zero falhas**, com dados fictícios. Onze casos novos cobrem a apresentação anual, retomada, personalização, datas nativas, limite do backup, Agenda e legenda dos fixos. Um teste do organizador substituído foi retirado; não se trata de remoção de cobertura financeira.
- Prévia local no navegador: Painel móvel e de computador, Agenda mensal e seleção por dia, sem erros/avisos de console no fluxo conferido. Sem transbordamento horizontal nos tamanhos observados; gráfico com altura de 256 px.
- O navegador usou um servidor local com respostas fictícias e a lógica real do backend. A Agenda não acrescentou uma chamada própria à API. Nenhum botão de confirmação financeira foi usado contra a conta real.
- Build e incorporação conferidos: interface raiz, duas cópias Apps Script e `dist/index.html`; módulos, manifesto e service worker iguais aos artefatos correspondentes.
- Não foram recalculadas as novas fórmulas numa planilha real nem executados backup, PDF, restauração ou virada anual na conta nesta etapa. Os testes simulados não substituem essa homologação.

## Como testar a atualização

1. Atualizar a interface e `Backend/Code.gs` na implantação ligada à **Cópia de Gestor de Gastos**; publicar a nova versão do Apps Script usada pelo app.
2. Atualizar o app para carregar o cache v68. Conferir Painel, Agenda, cópia de notas/calculadora, rachadinha e fixos.
3. Com a proteção e a organização anual já ativas, a rotina existente aplica a apresentação dos arquivos catalogados. Para antecipar a conferência, executar a função existente `rotinaProtecaoProgramadaGestor` no projeto de testes. Ela também executa sua manutenção habitual; não é uma função apenas de formatação. Não é necessário criar outro gatilho ou reativar uma organização já válida.
4. Abrir um ano de testes e conferir os doze meses, as fórmulas recalculadas e os totais contra Mensal/Empréstimos. O retrato fechado deve ser comparado com sua situação no fechamento.
5. Conferir permissões, backup/PDF e restauração numa cópia descartável antes de passar à definitiva. Nunca trocar o ID do controle a cada janeiro nem restaurar testes sobre a base definitiva.

As sugestões de filtros rápidos de vencidos/próximos 30 dias continuam em observação, conforme combinado. Nesta etapa não há outra alteração funcional recomendada sem primeiro testar o pacote na rotina real.
