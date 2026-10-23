# Checklist do pacote de robustez

O pacote posterior de filtros, sincronização e rachadinha está documentado em [PACOTE_FILTROS_RACHADINHA_20261023.md](PACOTE_FILTROS_RACHADINHA_20261023.md), com checklist e roteiro de testes próprios.

Concluído localmente em 23/10/2026. Este arquivo acompanha o pacote autorizado após a revisão das duas análises. As marcações abaixo indicam implementação local; a publicação é uma etapa separada. O resumo final e as instruções estão em [PACOTE_ROBUSTEZ_20261023.md](PACOTE_ROBUSTEZ_20261023.md).

## Já implementado na retomada

- [x] Corrigir a atualização do Histórico para a aba `lancamentos`, preservando a consulta e as páginas carregadas.
- [x] Centralizar gravações locais e liberar somente caches reconstruíveis quando faltar espaço.
- [x] Preservar fila offline, notas, rascunhos, diagnóstico, identificadores e versão de restauração.
- [x] Distribuir pagamentos parciais por data da compra e parcela, com prévia antes da confirmação.
- [x] Manter pagamento ao banco separado do recebimento de terceiros.
- [x] Sinalizar controle inválido de uma despesa fixa e suspender somente a série afetada.
- [x] Cancelar envios pelo servidor, sob a mesma trava da gravação, impedindo sua chegada tardia.
- [x] Preservar operações que já começaram a gravar e confirmar as que já terminaram.
- [x] Deixar `onOpen` responsável apenas pelo menu; manutenção permanece explícita.
- [x] Remover versões antigas de envio e confirmação, unificar o escape de texto e colocar os ajustes de CSS diretamente na fonte.
- [x] Completar a compatibilidade dos cadastros antigos à vista e explicitar o tipo no cadastro de formas.
- [x] Substituir a execução dinâmica da calculadora por um interpretador de operações limitadas.
- [x] Acrescentar testes com dados fictícios para os novos fluxos.

## Conclusão e conferência

- [x] Concluir a proteção de integridade das bibliotecas externas com hashes verificados.
- [x] Conferir os detalhes de interface, persistência e recuperação após as mudanças.
- [x] Corrigir o cenário antigo de paginação ainda falhando e executar os testes finais: 140 aprovados, zero falhas.
- [x] Compilar o CSS, atualizar o service worker e sincronizar as três interfaces: 39.594 bytes de CSS e cache `gestor-gastos-v25`.
- [x] Revisar a pasta de publicação e a diferença final dos arquivos: hashes iguais nas interfaces e na cópia pública; nove verificações de publicação/relatórios aprovadas após o build; `git diff --check` sem erros.
- [x] Registrar a conferência de autenticação da Vercel e seus limites.
- [x] Documentar crescimento do diário mantendo a proteção contra duplicações.
- [x] Preparar o resumo de mudanças e as instruções de publicação em `PACOTE_ROBUSTEZ_20261023.md`.
- [x] Conferir no navegador o pagamento parcial, o cancelamento com rascunho preservado, o novo envio e a navegação por teclado, com dados fictícios.
- [x] Gerar e baixar o PDF mensal com as bibliotecas protegidas, sem erros no console.
- [x] Reavaliar o antigo alerta de `braces` e atualizar a documentação: aviso retirado pelo GitHub em 23/10/2026.

## Etapas posteriores

- [ ] Publicar a nova versão do Apps Script e a interface na cópia de teste.
- [ ] Conferir o uso na implantação real antes de levar para a planilha definitiva.

Não há limpeza automática do diário técnico. Um arquivamento futuro precisa preservar permanentemente as identificações confirmadas e canceladas. A ampliação da restauração de backups e a reorganização maior de desempenho permanecem fora deste pacote, conforme combinado. As travas atuais continuam necessárias enquanto as consultas também fazem manutenção e recuperação.
