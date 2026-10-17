# Ajustes de usabilidade

- Categorias em ordem alfabética, com **Outros 📦** sempre no final. O emoji é uma apresentação: os nomes antigos na planilha continuam compatíveis.
- Removida a metade automática do resumo filtrado e da mensagem do Histórico. O atalho de dividir no formulário permanece.
- Limites e valores disponíveis dos cartões formatados em reais.
- **Próximos Meses (Horizonte)** com totais por forma em azul-claro, distintos do âmbar de terceiros.
- Pessoa em Empréstimos: exemplo **Ex.: Mãe, tio…**, sem texto adicional.
- Atalho de último valor total em Empréstimos pela combinação de pessoa e descrição. Ele depende da versão atualizada do backend e não preenche automaticamente.
- No cadastro **Minha chave Pix**, uma preferência permite incluir a chave por padrão nas novas mensagens. A preferência e a chave continuam locais a cada aparelho.
- Prévia de cobrança editável, com X para fechar e botão para copiar. Alternar a chave preserva o restante do texto editado.
- Mensagens distinguem envio, confirmação de gravação e resultado ainda não confirmado.
- Atualização do Histórico preserva filtros, páginas carregadas e posição de rolagem. Em Empréstimos, filtros disponíveis e posição também são preservados; se um filtro deixar de existir após a ação, a lista volta a uma opção disponível.

## Publicação

Atualize primeiro o Apps Script da cópia de teste e depois publique a interface no Preview. As três cópias do HTML devem permanecer sincronizadas pelo script do projeto.

## Escopo adiado

Conforme combinado, otimizações de velocidade e restauração completa de backup ficam para outra etapa. Esta atualização não faz migração de infraestrutura nem restaura dados.

## Pix e horizonte

- Pix continua sendo uma única forma de pagamento; não foi criado Boleto ou Pix parcelado.
- Novo lançamento oferece **Pagamento em parcelas** ao selecionar Pix. As parcelas futuras ficam em aberto até confirmação, sem consumir limite de cartão.
- Empréstimos oferece **Recebimento em parcelas**: representa a devolução pela pessoa, independente do Pix enviado à vista.
- Sem marcar a opção, Pix continua único. A indicação 1/1 fica oculta nas listas e no detalhamento do PDF; o registro interno permanece compatível.
- No celular, o horizonte mostra dois meses e omite o total da janela para caber melhor. Valores são apresentados sem repetir R$, com a unidade no cabeçalho. Comparar meses mostra a tabela mais ampla.
- Atualize o backend antes de publicar a interface: versões anteriores não reconhecem o parcelamento opcional do Pix.

## Conferência manual sugerida

Confira a ordem das categorias, a preferência Pix após reabrir o cadastro, a edição da mensagem antes de copiar, o último valor de um empréstimo conhecido e a posição do Histórico após editar um item de uma página posterior.
