# Mensal pelo calendário — 28/10/2026

- Removidos a caixa seletora, a sugestão de avanço e a lógica de seguir cartões quitados/fechados.
- A entrada normal na aba Mensal, inclusive ao tocar na aba já aberta, seleciona o mês e ano atuais do aparelho.
- O mês vigente aparece nos seletores mesmo vazio, sem criar lançamentos nem novos meses de despesas fixas.
- Consultas manuais continuam disponíveis pelos seletores e setas; atualizar os dados sem sair da tela preserva a consulta. A próxima entrada normal retorna ao mês atual.
- Um atalho explícito para uma fatura antiga ou futura abre o período solicitado com uma única consulta, mantendo a navegação útil do Horizonte.
- A opção antiga salva no navegador é removida durante a inicialização; não existe mais pausa ou avanço escondido.
- Protocolo 15 preservado; cache atualizado para v51. Atualizar frontend/PWA e interface do Apps Script conforme a implantação utilizada.

Os testes anteriores da regra de avanço foram substituídos por cenários de calendário, virada de ano, mês sem registros, retorno à aba, preservação da consulta durante recarga e atalho explícito.

Validação: 34 testes direcionados e suíte integrada final com 555 aprovados, zero falhas ou ignorados. Os cenários da funcionalidade removida foram substituídos pelos da regra nova. Quatro HTMLs idênticos, scripts válidos e diff sem erros de espaços. Log: `C:/Users/lucas/Documents/Codex/mensal-calendario-suite-20261028.log`. Nenhuma publicação remota ou mudança de dados financeiros foi feita nesta etapa.
