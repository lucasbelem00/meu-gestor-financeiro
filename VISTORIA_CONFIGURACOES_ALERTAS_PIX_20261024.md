# Vistoria: configurações, vencimentos e mensagens — 24/10/2026

Continuação do [checklist consolidado](VISTORIA_CONSOLIDADA_MOBILE_20261024.md), com foco em caminhos diferentes das rodadas anteriores. Foram testadas as funções ativas, incluindo as substituições finais de categorias. Nenhuma correção funcional foi implementada nesta rodada.

## 1. Alta prioridade: remover uma categoria muda o alvo de uma edição em andamento

**Reprodução completa:** a lista tinha Alimentação, Lazer, Transporte e Outros. Iniciei a edição de Lazer, removi Alimentação e atualizei o nome em elaboração para Lazer atualizado. O editor alterou Transporte, mantendo Lazer com o nome anterior.

Ao salvar esse resultado com o backend atual na planilha fictícia, um lançamento de Ônibus que era Transporte passou a Lazer atualizado. Um lançamento de Cinema que era Lazer continuou como Lazer. Os valores monetários foram preservados; a classificação histórica mudou no grupo errado.

**Causa:** o editor guarda a posição numérica da categoria. Remover um elemento anterior desloca a lista, mas não atualiza a referência em edição. A implementação final de Atualizar encontra outra categoria nessa posição e prepara uma renomeação válida para o servidor, porém diferente da intenção original.

**Controle:** editar Lazer sem remover outra categoria atualizou o grupo correto e seus lançamentos.

**Correção proposta:** identificar a categoria em edição por uma referência estável do rascunho, sem depender da posição visual. Ao remover o próprio item em edição, cancelar ou resolver explicitamente essa edição. Conferir a origem da renomeação antes de salvar, preservando o controle de versão da configuração. Ordenar ou remover outros itens não pode trocar o alvo.

Código: [edição por posição](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:5024), [remoção](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:5049), [atualização final](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:7064), [renomeação no histórico](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:2799).

## 2. Outros não está efetivamente protegido pelo cadeado

**Reprodução:** a interface renderizou o cadeado de Outros, mas a mesma linha também disponibilizou as ações. A função de remoção retirou a categoria e Salvar confirmou a configuração sem Outros. A leitura seguinte do backend continuou sem essa categoria porque ainda havia outras categorias cadastradas.

Esse comportamento contraria a regra combinada de Outros permanecer fixo no final. Não houve exclusão de lançamentos no ensaio; a configuração da categoria foi removida.

**Correção proposta:** manter Outros como categoria reservada tanto na interface quanto na validação do servidor, com nome padronizado Outros 📦 e posição final. A meta dessa categoria pode continuar editável. Diferenciar o que é fixo — nome e existência — do que o usuário pode ajustar. Para um cadastro legado com o limite já preenchido e sem Outros, não descartar outra categoria silenciosamente para abrir espaço.

Código: [linha com cadeado e ações](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:5010), [validação de categorias](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:2762).

## 3. Aviso de vencimento pode omitir fatura de terceiro com mês em célula Date

**Reprodução:** um empréstimo de R$ 70 no cartão, já recebido da pessoa e ainda não pago ao banco, tinha mês 10/2026. Com o mês em texto, apareceu o aviso da fatura em aberto. Com o mesmo mês armazenado como Date, o aviso desapareceu.

Nos dois casos, a consulta de pagamento do cartão continuou retornando R$ 70 de saldo. No caso Date, a lista de empréstimos também continuou exibindo 10/2026. O ensaio simulou a formatação MM/AAAA da célula, para não confundir o valor bruto da planilha com sua apresentação.

**Causa:** a montagem dos itens de terceiros para o aviso converte os valores brutos com String. Uma célula Date vira uma data extensa com horário, enquanto o cálculo do aviso aceita MM/AAAA. A correção anterior da consulta de pagamento não alcançou esse outro caminho.

**Correção proposta:** normalizar o mês pelo mesmo significado e fuso usados na consulta de fatura, preservando a distinção entre pagamento ao banco e recebimento da pessoa. O aviso deve depender do saldo bancário e do vencimento, não do tipo interno de célula. Uma data ilegível precisa de orientação de conferência, sem apresentar a fatura como quitada.

Código: [itens de terceiros no aviso](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:1817), [cálculo de vencimento](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:1231).

## 4. Arquivar cartão é apresentado como exclusão definitiva

**Reprodução:** clicar em Excluir Cartao abriu a pergunta de exclusão permanente. Como havia lançamentos vinculados, o backend fez o comportamento seguro: arquivou o cadastro e preservou o histórico. A interface, porém, anunciou Cartão excluído!.

Após recarregar, o cartão continuou na gestão, sem indicação de Arquivado nem ação visível de reativação. Ao mesmo tempo, deixou de aparecer entre as formas disponíveis para novos lançamentos. Isso pode parecer uma falha intermitente para quem usa o app.

**Controle:** quando o cartão não tinha uso nem dependência histórica, o backend realmente removeu o cadastro. Portanto, a distinção existe no servidor; falta representá-la de forma coerente na interface.

**Melhoria proposta:** explicar antes da ação que cadastros usados serão arquivados para preservar os registros; usar a resposta `arquivado` para a mensagem correta. Separar Ativos e Arquivados dentro da mesma gestão, com Reativar para os arquivados. O backend já tem um parâmetro de reativação, mas o fluxo atual não o oferece na interface. Manter a consulta e o pagamento de faturas antigas acessíveis; arquivar não significa encerrar as dívidas.

Código: [confirmação e mensagem](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:4982), [listagem](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:4890), [arquivamento seguro](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:2721), [reativação existente no servidor](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/Backend/Code.gs:2670).

## 5. Desmarcar Incluir Pix pode manter a chave após editar a linha gerada

**Reprodução:** com a chave fictícia teste@exemplo.com e a preferência de inclusão ativa, abri uma cobrança e alterei apenas o título da linha automática de Minha chave Pix para Meu Pix. Em seguida, desmarquei Incluir Pix. A chave permaneceu no texto e na chamada de cópia capturada pelo ensaio.

**Causa:** a remoção busca exatamente o bloco de texto adicionado antes. Quando esse bloco é editado, a correspondência deixa de existir e a linha é tratada como parte da mensagem manual, embora a opção fique desmarcada.

**Controle:** sem editar a linha gerada, desmarcar a opção removeu a chave corretamente.

Não houve envio de mensagem ou cópia para a área de transferência real; o ensaio capturou o texto em memória. O problema é a divergência entre a escolha da opção e o conteúdo final preparado.

**Melhoria proposta:** controlar o bloco automático da chave separadamente do corpo editável e mostrar a composição final antes de copiar. Se uma edição manual impedir separar os blocos com segurança, avisar e pedir revisão em vez de indicar implicitamente que a chave foi retirada. Não apagar indiscriminadamente texto que a pessoa escreveu manualmente.

Código: [composição da prévia e remoção pelo texto anterior](C:/Users/lucas/OneDrive/Documentos/GitHub/meu-gestor-financeiro/index.html:1840).

## Melhorias de uso derivadas destes casos

- **Edição de categorias mais clara:** mostrar qual categoria está em edição, com uma ação de cancelar essa edição. Não exigir que a pessoa acompanhe a posição da linha após uma remoção.
- **Estado do cartão reconhecível:** Arquivado deve ser um estado explícito, com consequência e reversão claras, sem acrescentar uma aba principal ao app.
- **Cobrança previsível:** a prévia deve representar exatamente o texto que será copiado, inclusive a inclusão ou exclusão da chave Pix.
- **Avisos confiáveis:** abrir diretamente a fatura do cartão e do mês indicados, mantendo o saldo bancário independente dos recebimentos de terceiros.

As duas primeiras são particularmente úteis no celular, onde uma lista longa torna mais difícil perceber que o alvo mudou ou que um cartão apenas deixou de aceitar novos lançamentos. A disposição visual precisa ser validada depois da implementação.

## Verificação e limites

Oito cenários direcionados executados, com controles: categoria errada após remoção, edição sem remoção, remoção de Outros, arquivamento com histórico, exclusão sem histórico, aviso com mês texto/Date, Pix editado e Pix não editado.

O ensaio executa código atual da interface, incluindo a substituição final das categorias, e o backend real do repositório sobre DOM, armazenamento e planilhas fictícios. Os efeitos nas categorias foram conferidos após salvar; o caso de aviso comparou também a consulta bancária e a lista de empréstimos.

Artefatos: [script](C:/Users/lucas/Documents/Codex/vistoria-configuracoes-alertas-20261024.cjs) e [resultado](C:/Users/lucas/Documents/Codex/vistoria-configuracoes-alertas-20261024.log).

A suíte existente foi executada nesta rodada com `node --test`: 239 testes aprovados, zero falhas. [Log da suíte](C:/Users/lucas/Documents/Codex/suite-vistoria-configuracoes-20261024.log). Ela não exige ainda o comportamento corrigido dos novos cenários reproduzidos aqui; esses cenários precisam se tornar regressões no pacote de implementação.

Não houve alteração de código funcional, publicação ou acesso a dados reais. Não foi feita nova conferência visual num celular físico. Passar nos ensaios que reproduzem os defeitos não significa que eles foram corrigidos; será necessário exigir o comportamento correto nas regressões do próximo pacote.
