# Retomar uma assinatura encerrada

Em Histórico de Canceladas, ▶️ Retomar abre o editor para revisar descrição, forma de pagamento, categoria, valor mensal, mês de retorno e dia fixo da cobrança. O editor usa o fechamento protegido já existente: Voltar, Escape e confirmação de descarte.

A retomada cria uma série com novos IDs e mantém a anterior encerrada, sem alterar cobranças ou pagamentos antigos e sem preencher os meses da pausa. A primeira ocorrência fica pendente, inclusive para Pix: retomar não comprova pagamento. O dia escolhido é preservado na recorrência; dia 31 usa o último dia de fevereiro e volta a 31 nos meses que o possuem.

O mês sugerido é o atual ou o primeiro disponível após cobranças ainda registradas da assinatura antiga. O servidor rejeita sobreposição, período passado, identidade desatualizada, valor/dia inválidos, forma arquivada, categoria inexistente e retomada duplicada. Uma origem de retomada comum impede duplicação mesmo quando a assinatura ativa foi renomeada. Reenvio da mesma operação reutiliza o resultado confirmado.

## Código

- shared/retomar-fixo.js: dados para revisão, validações e criação da nova série.
- interface/retomada.js: modo de retomada do modal, preenchimento e envio protegido por sessão do editor.
- Backend/Code.gs: dados das assinaturas, despacho e histórico de atividade; incorpora o módulo pelo gerador.
- interface/rotina.js: rótulo do mês do editor compartilhado.
- tests/retomar-fixo-20261102.test.cjs: preservação de histórico, meses de pausa, retomadas sucessivas, duplicação, dias curtos e integração anual.
- tests/retomar-fixo-ui-20261102.test.cjs: campos revisados, troca de modo, erros de gravação e respostas tardias.

## Publicação

Atualizar também Backend/Code.gs no Apps Script junto da versão do webapp. Nenhuma função adicional de ativação é necessária. Não houve publicação nesta alteração local.

## Conferência manual em testes

1. Desativar uma assinatura de teste e abrir Retomar no histórico de canceladas.
2. Revisar os seis campos; cancelar e conferir que nenhum registro foi criado.
3. Retomar em mês futuro, revisar a assinatura ativa nova e confirmar que a antiga segue cancelada.
4. Atualizar o app e verificar que não existem cobranças nos meses da pausa.
5. Tentar retomar a origem novamente enquanto a nova está ativa: deve impedir duplicação.
6. Usar Voltar no celular com o modal aberto; com alterações, deve pedir confirmação de descarte.
