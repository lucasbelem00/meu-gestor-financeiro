# Revisão do relatório externo — 03/11/2026

## Correções aplicadas

- A prévia direta (`preview=1` e `apiCallServidor`) exige a propriedade de habilitação e identidade verificável igual à conta que executa a implantação. E-mail vazio, diferente ou indisponível recusa acesso. `doPost` continua exigindo o token do proxy e não depende dessa prévia.
- Quitação antiga sem prévia foi desativada tanto no roteador como na função pública; o algoritmo antigo foi removido. Os rótulos de atividades antigas continuam disponíveis para consulta/recuperação.
- Exclusão de gastos com pagamento (inclusive parcial) e parcelas de terceiros com recebimento ou pagamento bancário é recusada antes de remover linhas. Conferir/desfazer o movimento é necessário antes da exclusão. Isso inclui Pix já marcado como pago; não há exceção silenciosa para apagar dinheiro registrado.
- Histórico inicial e paginado incluem pago/saldo nas posições reservadas 18/19; arquivo anual permanece em 17, perfil em 20 e retrato anual em 21. Interface e mensagem compartilhada explicam o pagamento parcial.
- Fila offline valida por item, confirma os válidos e preserva os inválidos com posição e motivo. Falha de execução continua interrompendo o restante, preservando o protocolo de recuperação. A interface envia até 50 itens por solicitação e informa quando há outros guardados.
- Consulta, filtro e cobrança de pessoas seguem a normalização já utilizada no backend (acentos e caixa), sem renomear linhas na planilha. Fragmentos recebidos seguem a mesma chave na mensagem.
- O comando manual de manutenção da planilha também processa recorrências antes de organizar os lançamentos.

## Verificação remota

O conector da Vercel informou, no projeto `meu-gestor-financeiro`, `ssoProtection.enabled=true` e `deploymentType=all_except_custom_domains`. Domínios personalizados não devem ser considerados protegidos por essa regra. Nenhuma configuração remota foi alterada.

As Script Properties e permissões da implantação Apps Script não foram acessadas nesta revisão. A proteção local da prévia não comprova que a implantação antiga esteja protegida: é necessário publicar uma nova versão do backend. Nenhum dado financeiro real foi modificado nos testes.

## Recomendações avaliadas que não foram transformadas em mudanças automáticas

- Duplicidade de identificador ou divergência em arquivo anual: manter o bloqueio de integridade; não recriar IDs nem omitir valores dos totais. Recuperação deve partir de diagnóstico e cópia conferida.
- Pendência PRONTO com edição externa: manter diário e recuperação com prévia. Abandonar um plano parcialmente aplicado exige reconciliação específica, não apenas trocar o estado para arquivado.
- Remoção de travas e reescrita dos snapshots: não aplicar sem separar manutenção de leitura e medir o custo. As travas protegem a consistência das gravações.
- Cache, rascunhos e fila: preservar a persistência necessária ao funcionamento offline. Trocar tudo por sessionStorage apagaria trabalho não sincronizado ao fechar o app.
- CSV: manter proteção contra fórmulas também em textos iniciados com sinal de menos.
- Fusão de categorias/pessoas, busca global, atalhos de teclado e cadastro automático de diferenças do extrato: são funcionalidades novas, não reparos necessários desta revisão. Exigem definição própria de comportamento e preservação do histórico.
- Recorrência retroativa: uma prévia com quantidade exata exige regras de servidor, incluindo períodos existentes/pulados e estado da série. Não acrescentar um contador apenas no navegador que possa prometer quantidade diferente da gravação.
- Unificação de relógio, fuso e feriados: manter o calendário compartilhado; uma fonte de data autoritativa para todos os modos, inclusive offline, merece uma alteração própria com testes de virada do dia e ano.
- Divisão rápida com bebida: não foi demonstrado erro de centavos; os botões já distinguem parte com e sem bebida. Mudança de identidade no modo rápido não foi misturada a esta correção.

## Publicação e conferência

1. Atualizar `Backend/Code.gs` no Apps Script da **Cópia de Gestor de Gastos** e publicar nova versão da implantação existente.
2. Atualizar o frontend de teste com o pacote correspondente. O build local não publica na Vercel.
3. Conferir pagamento parcial no Histórico e Mensal; tentativa de exclusão deve explicar o bloqueio.
4. Conferir empréstimos com variações de acento/caixa, filtro e prévia de cobrança.
5. Conferir recorrência na manutenção manual sem duplicar períodos já criados.
6. Para uso pela Vercel, a prévia direta pode permanecer desativada (`GESTOR_API_BRIDGE_ENABLED=false`); nenhuma execução de migração é necessária para as novas posições da consulta.

Não remover o bloqueio atual da API no ambiente Vercel de produção sem definir e verificar a autenticação do ambiente definitivo.

## Validação concluída

- Suíte completa: 905 testes aprovados, zero falhas.
- CSS, interfaces espelhadas e pacote estático gerados com sucesso.
- Conferência adicional em planilha simulada: manutenção completou 08/2026, 09/2026 e 10/2026; segunda execução preservou exatamente os mesmos três períodos.
- Diff conferido sem erros de espaços/conflitos. Não houve publicação nem alteração dos dados das planilhas reais.
