# Pular mês de uma despesa fixa

## Uso

Em Despesas Fixas: Editar, ⏸️ Pular mês e ⏹️ Desativar são ações diferentes.

Pular mês consulta o servidor e mostra a competência exata para confirmar. Começa pelo mês atual, ou pelo primeiro mês se a assinatura só começa no futuro. No Histórico, usa o mês da ocorrência selecionada. Havendo qualquer pagamento, inclusive parcial, o app não pula esse mês: oferece consultar o próximo e só grava após nova confirmação. Uma ocorrência já pulada também é protegida.

Apenas uma competência é marcada como Ocorrência Pulada. As cobranças e os pagamentos existentes permanecem preservados, e os meses seguintes continuam recorrentes. Se a ocorrência futura ainda não existe, cria um marcador da mesma série, impedindo que a geração automática recrie a cobrança. A ação aparece em Atividade e pode ser desfeita, respeitando as verificações atuais de versão.

## Código

- shared/pular-fixo.js: prévia e gravação no servidor, identidade da série, proteção de pagamentos, hash da prévia e criação do marcador futuro.
- interface/usabilidade.js: consulta e confirmações; descarta resposta atrasada após navegação.
- shared/acoes.js: contrato das novas ações previaPularMesFixoWeb (leitura) e pularMesFixoWeb (financeira).
- Backend/Code.gs: despacho, operação protegida, atividade e desfazer; incorpora o módulo pelo script de sincronização.
- interface/botoes.js: 💸 Registrar pagamento, ⏸️ Pular mês e ⏹️ Desativar.

## Publicação e teste manual

Atualizar também o Apps Script com Backend/Code.gs e a versão do webapp; nenhuma função extra de ativação é necessária. Não foi feita publicação nesta alteração local.

1. Em uma cópia de testes, pular um fixo sem pagamento e conferir o mês mostrado.
2. Atualizar o app: o mês continua pulado e não volta para o total.
3. Desfazer em Atividade e conferir a ocorrência restaurada.
4. Em mês pago ou parcialmente pago, verificar a oferta de consultar o próximo; cancelar deve preservar tudo.
5. Confirmar um próximo mês sem pagamento e verificar que o mês pago não mudou.
6. Desativar continua encerrando novas ocorrências, preservando o histórico.
