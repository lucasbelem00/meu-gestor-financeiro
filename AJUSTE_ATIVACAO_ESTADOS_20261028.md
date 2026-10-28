# Ativação anual, estados e ícones — 28/10/2026

Correção posterior ao pacote de continuidade. Protocolo permanece 15; cache do PWA atualizado para v49.

## Falha corrigida

A linha Total Carteira é um resumo. Na cópia consultada, fechamento e vencimento têm traços porque não se aplicam a ela. A importação protege textos iniciados por hífen com uma marca literal antes de validar; esses dois formatos precisam ser reconhecidos. O validador estava exigindo dias numéricos nessa linha e impedia o backup anterior à ativação.

O código aceita o marcador de campo não aplicável somente nos tipos não bancários (resumo, Pix e à vista). Cartões continuam exigindo dias de 1 a 31 quando preenchidos, limites numéricos válidos, identidade e tipo coerentes. A cópia não é modificada para retirar os traços. Erros de cadastro agora identificam nome e linha.

## Indicação na interface

- Proteção automática: ativada, desativada ou precisa reativar o agendamento.
- Organização anual: ativada ou desativada.
- PDFs automáticos: ativados ou desativados.

Essas informações ficam separadas da mensagem de erro da última ação. Os botões permanecem visíveis e desabilitados quando as respectivas ativações estão completas. Reativar PDFs com a organização já ativa habilita a configuração sem recriar os arquivos anuais.

Atualizar App usa ↻; Atividade e sincronização usa 📡; Anual usa 📈; Despesas Fixas mantém 🔄. O ícone de Anual também foi atualizado no título da tela e na configuração da navegação.

## Atualização

Atualizar o backend Apps Script, publicar a nova versão e atualizar o frontend/proxy. No PWA, usar Atualizar App para obter o cache v49. Na cópia de testes, consultar a situação e repetir Ativar organização por ano e PDFs. Não é necessário limpar traços ou valores da planilha manualmente nem instalar outro gatilho.

A leitura da planilha foi somente para diagnóstico; não houve ativação, migração ou escrita de dados reais por esta correção.

## Validação

Suíte final: **560 testes aprovados, zero falhas ou testes ignorados**. Inclui cinco regressões novas: backup/prévia/ativação com resumo legado, rejeição dos dias inválidos de cartão, reativação isolada de PDFs e estados legíveis distintos. Log em `C:/Users/lucas/Documents/Codex/ativacao-estados-validacao-final-20261028.log`.

Build concluído, quatro HTMLs idênticos e sintaxe do backend/scripts validada. A implantação e a ativação na conta Google continuam separadas dessa validação local.
