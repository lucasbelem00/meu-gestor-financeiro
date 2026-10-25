# Backup, restauração e velocidade

A implementação atual está em [PACOTE_RESTAURACAO_DESEMPENHO.md](PACOTE_RESTAURACAO_DESEMPENHO.md), com mudanças, fragilidades corrigidas, testes e limites. As melhorias anteriormente adiadas foram implementadas localmente; a publicação é uma etapa separada.

## Para guardar uma cópia

Menu → Dados e relatórios → Exportar dados e backup → Baixar cópia de segurança — JSON.

O JSON contém os dados restauráveis do app. A preparação e o download são feitos em partes, com conferência de integridade. CSV serve para consultar no Excel ou Planilhas; não substitui o backup JSON. Sincronize os envios pendentes antes de exportar.

## Para restaurar

1. Sincronize as pendências e feche o app nos outros aparelhos.
2. No mesmo modal, em Restaurar backup, selecione o JSON do Gestor.
3. Confira o destino, quantidades, inclusões, alterações, remoções e totais. Abra os detalhes de cada aba para ver banco, terceiros e exemplos dos registros afetados.
4. Digite RESTAURAR e confirme a substituição.
5. Aguarde a confirmação. O app guarda a cópia anterior antes de substituir os dados.

Em Cópias anteriores e recuperação, é possível conferir uma cópia preservada para restaurar ou somente baixá-la. Abrir sua prévia não substitui os dados. Cópias legadas são identificadas; cópias incompletas ou com integridade incompatível são bloqueadas.

Se o upload interromper, selecione o mesmo arquivo para retomar as partes. Se a gravação tiver sido enviada e faltar confirmação, use Atividade e sincronização para consultar ou repetir o mesmo envio protegido. Não crie outra restauração com um identificador novo. O botão Conferir restauração interrompida só libera a pendência após confirmar seu estado.

## O que fica preservado

Restaura Lançamentos, Empréstimos, Anotações, categorias/metas e formas de pagamento. Abas opcionais ausentes são preservadas. Pagamento ao banco e recebimento de pessoas continuam independentes.

O diário atual e o histórico de atividade não são apagados ou substituídos. Código, tokens, permissões, implantação, chave Pix local, preferências do aparelho e recursos particulares do Google Planilhas não fazem parte da restauração de dados do app.

Limites: 8 MiB, 20.000 linhas por aba e 500.000 células no conjunto. Arquivos incompatíveis permanecem com você para recuperação assistida. Preparações temporárias duram 24 horas. Uma alteração na planilha após a prévia exige nova conferência.

## Velocidade

Há consultas compartilhadas, cache curto dos relatórios, gráficos/listas carregados quando visíveis, manutenção somente quando necessária e processamento em blocos das faturas. A página padrão de Atividade lê apenas os eventos necessários. Nenhum comprovante de operação é apagado para acelerar o app.

A velocidade real continua dependendo da rede e do serviço de planilhas. Os resultados de teste medem trabalho local com dados fictícios. Para repetir a medição: `node scripts/medir-desempenho.cjs 100 1000`.

## Instalação

Atualize backend, interface e proxy juntos na cópia de teste, seguindo o relatório do pacote. Backend: protocolo 9. Cache do app: versão 35, após os ajustes de [categorias, navegação e metas](AJUSTES_CATEGORIAS_ROLAGEM_METAS.md). Não restaure na planilha definitiva antes de testar o fluxo completo na cópia.
