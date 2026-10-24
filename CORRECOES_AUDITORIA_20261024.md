# Correções da auditoria — 24/10/2026

## Checklist do pacote aprovado

- [x] Editar o valor de um item quitado preserva o dinheiro já pago ao banco. Exemplo: total de 100 para 200 mantém 100 pagos e deixa saldo de 100.
- [x] Reduzir o total abaixo do pagamento registrado ou mudar a fatura de uma parcela com pagamento exige conferência ou desfazer antes.
- [x] Empréstimos que já foram recebidos da pessoa não podem ganhar recebimentos fictícios pela edição do valor. A correção exige desfazer o recebimento ou registrar a diferença separadamente.
- [x] O editor explica alterações de valores quitados e pede confirmação para retirar a situação de pago/recebido.
- [x] O avanço do Mensal usa o saldo bancário do relatório recém-consultado, incluindo terceiros. Não depende do resumo anterior do Painel.
- [x] O avanço automático exige conexão, resposta recente, ausência de pendência de integridade e nenhuma gravação posterior à consulta. Revalida antes de navegar e faz nova consulta ao reentrar com acompanhamento ativo.
- [x] A escolha manual do mês continua pausando o acompanhamento. O automático continua desligado por padrão.
- [x] A confirmação do próprio envio atualiza a referência do editor de notas quando ID, revisão, texto e época de restauração correspondem. Leituras externas não autorizam sobrescrita silenciosa.
- [x] Recebimentos em lote usam mapa de IDs e uma gravação agrupada de status. Para 20 itens, o controle de versões faz uma passagem em vez de 20, preservando os registros não selecionados.
- [x] O histórico da calculadora ignora entradas inválidas. Inicializações independentes evitam que uma ferramenta interrompa as outras.
- [x] Transferir simulação detecta categoria, data, forma, parcelas, tags, pessoa e opções já preenchidas. A conferência é repetida antes de substituir o formulário.
- [x] Valores previstos do Horizonte têm detalhamento acessível pelo toque, separando registrado, pago, saldo e estimativa. Só os registros existentes entram na conferência de pagamentos.
- [x] Rascunhos das notas ficam guardados no aparelho além da sessão. A mesma aba recupera a referência anterior; ao reabrir sem sessão, as cópias podem ser escolhidas em Rascunhos guardados neste aparelho.
- [x] Abas duplicadas recebem chaves diferentes. Recuperar copia o texto e preserva a origem. Descartar uma cópia exige confirmação e verifica se ela mudou enquanto o aviso estava aberto.
- [x] Há migração do rascunho antigo da sessão e fallback explícito caso o armazenamento durável esteja indisponível.
- [x] Fixos continuam somente nos meses já existentes por registros; não são criados meses extras por essa projeção.
- [x] 35 novos testes cobrem os cenários da auditoria; a suíte completa contém 198 testes.
- [x] As referências dos testes antigos de navegação e calculadora foram atualizadas para a fonte atual, mantendo suas verificações de comportamento e segurança.

## Validação local

- Suíte completa: 198 testes aprovados, zero falhas.
- Dados fictícios em memória, sem conta, planilha ou API real.
- Cobertura inclui reenvio da mesma operação, resposta perdida, pagamentos parciais, empréstimos, recebimentos, notas concorrentes, armazenamento cheio e rascunhos de abas duplicadas.
- CSS compilado e interfaces do Apps Script sincronizadas com index.html; conteúdo estático preparado em dist/.
- Protocolo do backend: 7. Cache do app: v28.
- Não foi feita validação visual em um celular real nesta rodada.

## Como publicar

1. Atualize Backend/Code.gs no Apps Script da cópia de testes.
2. Atualize a interface usando Backend/Index_para_colar.txt.
3. Crie uma nova versão da implantação do Apps Script.
4. Publique o frontend pelo fluxo habitual da Vercel e carregue a atualização do app.
5. Confira primeiro uma compra fictícia quitada, uma edição de nota durante sincronização e o acompanhamento mensal opcional.

A interface exige backend 7 para as edições financeiras protegidas; se a implantação estiver antiga, os campos permanecem preenchidos e o app pede a atualização. Este pacote foi preparado localmente: não houve publicação nem alteração em dados reais.

## Observações de uso

O histórico da calculadora e a fixação de notas continuam locais. As notas adicionadas usam a sincronização existente; texto ainda em elaboração permanece como rascunho local. Cópias antigas dos rascunhos não são apagadas automaticamente; use Descartar quando não precisar delas. O pacote não faz restauração de backup nem reorganização ampla das travas ou do diário técnico.
