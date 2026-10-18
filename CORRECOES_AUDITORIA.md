# Correções da auditoria

## O que mudou

- Vencer uma fatura gera pendência; não confirma mais o pagamento automaticamente.
- Compras e parcelas têm identificadores permanentes. Reordenar a planilha não faz uma ação atingir outra pessoa ou compra parecida.
- Uma tela antiga precisa ser atualizada se o registro tiver mudado, inclusive por edição direta na planilha.
- Cada envio tem uma identificação persistente. O reenvio da mesma operação devolve o resultado anterior, em vez de registrar novamente.
- Um diário permite recuperar gravações interrompidas entre abas. Se houver uma edição externa incompatível, o app preserva a operação para conferência.
- O recebimento do terceiro e o pagamento da fatura ao banco são informações independentes.
- A fila offline remove apenas os itens confirmados. Itens acrescentados durante a sincronização permanecem salvos.
- Notas têm operações pendentes e controle de versão. Um retorno antigo da nuvem não apaga alterações locais novas.
- Pendências de envio continuam guardadas depois de fechar e reabrir o PWA, com opção de repetir o envio protegido.
- Descrições, nomes e outros textos são exibidos como dados; não entram como comandos JavaScript em botões.
- Parcelas e descontos usam centavos inteiros, distribuindo as sobras para fechar o total.
- O Histórico não pula páginas em cliques repetidos. O detalhamento do Anual mantém o ano selecionado e mostra esse filtro.
- O cache preserva a última página válida do app diante de erro de rede, manutenção ou login. Atualizar o Service Worker não recarrega o formulário automaticamente.
- Os PDFs passam a usar texto e tabelas paginadas, sem uma imagem gigante. O texto pode ser selecionado e pesquisado.
- O proxy rejeita JSON inválido e pedidos excessivos antes de encaminhar a operação.
- A revisão adicional também protege nomes que coincidem com propriedades internas, impede falso sucesso em empréstimos ausentes e preserva o histórico ao editar uma assinatura já paga.

## Como atualizar a cópia de teste

1. Faça uma cópia de segurança da planilha de teste.
2. No projeto Apps Script da cópia, substitua o conteúdo de `Código.gs` pelo arquivo `Backend/Code.gs` deste repositório e salve.
3. Atualize a implantação existente do Apps Script para uma **nova versão**, preservando a URL e as propriedades já configuradas. O código novo precisa estar ativo antes da interface nova.
4. Publique as mudanças da branch de teste no GitHub e aguarde o Preview protegido da Vercel.
5. Reabra o PWA. Se ele continuar com a versão anterior, conclua os formulários em andamento e use a opção de atualizar o app.
6. Confira na cópia: lançamento pessoal parcelado; empréstimo Pix; recebimento parcial; recebimento antecipado no cartão; uso offline e sincronização; PDF mensal e anual.

A interface exige a versão compatível do backend antes de enviar alterações. Isso evita que uma versão antiga interprete os novos dados incorretamente.

## Estrutura criada automaticamente

- As onze primeiras colunas de Lançamentos e Empréstimos continuam sendo os dados financeiros.
- As colunas **L:R** guardam identidade, versão, estado do pagamento ao banco, conferência do registro e valor pago ao banco. Não copie esses identificadores ao criar outra compra manualmente.
- Se essas colunas já tiverem dados particulares, a migração para e pede que sejam preservados antes de continuar.
- A aba oculta **_Gestor_Operacoes** guarda o diário e os resultados dos envios. Não a apague: ela permite recuperar falhas e reconhecer reenvios.
- A aba **_Gestor_Atividade** guarda o histórico visível e os dados necessários para desfazer ações. Ela também entra na exportação de backup quando existir.

## Registros antigos

O código anterior pode ter marcado faturas vencidas como pagas. A atualização não desfaz esses pagamentos antigos automaticamente, porque não existe informação suficiente para distinguir um pagamento verdadeiro de uma marcação automática. Confira as faturas antigas que ainda estiverem pendentes no banco.

Parcelamentos antigos que não possam ser agrupados com segurança são sinalizados para revisão. O app evita propagar uma edição ou exclusão a várias compras por adivinhação.

## Verificação

Execute `node --test` na pasta do projeto para rodar os testes locais com dados fictícios. Eles não acessam contas ou planilhas reais.

Na rodada anterior às mudanças de velocidade e restauração, os **71 testes passaram**. As duas cópias da interface também foram conferidas como idênticas ao `index.html` principal.

Além desses testes, foram preparados testes em navegador isolado para texto hostil, perda de resposta, reabertura do app, fila e notas offline, paginação e geração de PDFs grandes.

O fluxo integrado ligou a interface ao proxy e ao código real do Apps Script, substituindo apenas a planilha por dados fictícios. O reenvio após perder a resposta e fechar/reabrir o app manteve um único empréstimo; uma nota offline chegou à planilha fictícia ao reconectar. O ensaio com 500 lançamentos gerou um PDF de 34 páginas com a última compra e o texto pesquisável presentes.

Esses testes não confirmam a configuração ativa das permissões Vercel/Apps Script. A rodada final na cópia de teste e no PWA instalado continua sendo necessária antes de conectar a planilha original.

## Atividade, sincronização e pagamentos

- No Menu, **Atividade e sincronização** reúne pendências, histórico e diagnóstico. As abas principais permanecem no lugar.
- O reenvio usa a identificação original da operação. Só a pendência confirmada é removida.
- O histórico começa nesta versão; não reconstrói alterações antigas. Exclusões, edições, recebimentos e pagamentos compatíveis oferecem desfazer com confirmação.
- O desfazer confere identidade, conteúdo e versão. Se o registro mudou depois, ele bloqueia a recuperação para preservar as alterações recentes. Não restaura uma aba inteira nem oferece refazer.
- **Conferir pagamento**, na aba Mensal ou na central, permite registrar pagamento parcial ou integral da fatura. Receber de uma pessoa continua independente de pagar ao banco.
- O valor pago é distribuído entre os registros da fatura para controlar o saldo. Juros e encargos não são calculados automaticamente; registre-os como despesas quando existirem.
- O diagnóstico copia informações técnicas, sem nomes, descrições, valores financeiros, chave Pix ou tokens.

### Teste na cópia

1. Abra o Menu e entre em Atividade e sincronização.
2. Crie um lançamento fictício, exclua e recupere pelo histórico. Confira que apareceu apenas uma vez.
3. Registre um pagamento parcial de fatura e confira saldo, limite e PDF mensal. O terceiro deve continuar devendo até registrar o recebimento.
4. Desfaça o pagamento pelo histórico e confira os totais novamente.
5. Confira uma pendência offline e o diagnóstico antes de copiar.

O ensaio em navegador isolado cobriu pagamento parcial, desfazer, recuperação de exclusão e reenvio offline através da interface, proxy e backend, com planilha fictícia. Também foram gerados PDFs de até 34 páginas.

### Adiado conforme combinado

**Restaurar backup com prévia** foi implementado na etapa seguinte; consulte VELOCIDADE_E_RESTAURACAO.md. Gerar CSS durante a publicação e reduzir funções antigas do HTML também permanecem como manutenção futura.
