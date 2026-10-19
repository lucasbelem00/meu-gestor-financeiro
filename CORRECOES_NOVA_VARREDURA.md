# Correções da nova varredura — 18/10/2026

## Aplicado

1. **Configurações com versão:** a leitura retorna versões para cartões/formas e categorias/metas. Salvar, renomear, arquivar/excluir e reordenar formas exige a versão atual. Categorias também exigem a versão do conjunto aberto. A versão é capturada ao abrir a edição, sem ser trocada por uma atualização em segundo plano. Conflitos preservam o rascunho; reenvios já confirmados continuam idempotentes.
2. **Validação no backend:** limite e metas finitos e não negativos; fechamento/vencimento vazios ou inteiros de 1 a 31. Categorias inválidas, duplicadas ou acima de 25 são recusadas por inteiro. Não há corte silencioso da lista. Renomeações precisam apontar para categorias presentes no conjunto final.
3. **Cache de consulta opcional:** falhar ao guardar dados confirmados em cache não impede a renderização nem vira erro de conexão. Diários de operações offline e gravações continuam obrigatórios. Se a versão de segurança de uma restauração não puder ser persistida, a leitura funciona, mas novas gravações ficam bloqueadas até corrigir o armazenamento e atualizar.
4. **Filtros e posição do Mensal:** atualização do mesmo período preserva o filtro enquanto a opção existir, sem apagar a lista durante a espera. Mudança de período ou remoção da opção limpa o filtro. O estado visual é sincronizado após renderizar.
5. **Consultas e tentativas:** consultas simultâneas iguais de dados completos, mensal, anual, histórico e conferência de fatura compartilham o envio. Mês e parâmetros diferentes não compartilham respostas. Início e término de uma gravação invalidam o compartilhamento anterior. Leituras têm no máximo duas tentativas; timeout não é repetido automaticamente. O timeout do navegador é 60 s e o do proxy 55 s. Um cancelamento não é considerado prova de que o Apps Script parou.
6. **Snapshot reutilizado:** na abertura da aba virtual, os valores calculados são lidos uma vez e reutilizados com fórmulas e exibição. Hashes, diário, recuperação e confirmação permanecem ativos.
7. **Medições:** diagnóstico local inclui duração total percebida da consulta e duração de renderização. A resposta da API fornece Server-Timing de ida/volta ao Apps Script. O Registro de execução do Apps Script registra duração total e espera pelo lock. Métricas não incluem parâmetros, valores financeiros, nomes, descrições, URLs ou tokens.

## Como publicar

1. Atualizar Backend/Code.gs na implantação existente do Apps Script da cópia de teste (nova versão).
2. Publicar branch New pelo GitHub/Vercel, incluindo api/gestor.js, interface e service worker.
3. Reabrir o PWA e Atualizar dados antes de editar configurações.

Uma interface antiga poderá receber aviso de configuração desatualizada depois da atualização do backend. Atualizar a interface e recarregar resolve essa incompatibilidade; não forçar gravação sem versão.

## Conferir na cópia

- Abrir o mesmo cartão em dois aparelhos; salvar em um e tentar salvar o rascunho antigo no outro: deve haver conflito, sem sobrescrever.
- Repetir para categorias/metas.
- Conferir limite zero e dias válidos; entradas inválidas devem ser recusadas.
- Selecionar forma ou tag no Mensal; atualizar o mesmo mês e verificar filtro e posição.
- Abrir Atividade → Diagnóstico e copiar o resumo após uma consulta lenta. As durações permitem comparar transporte e renderização.

## Limites

A melhora real de latência depende da medição no ambiente publicado. Nenhum percentual de ganho foi afirmado. A correção não acessou contas ou planilhas reais e não foi publicada automaticamente.

## Resultado da verificação

122 testes locais passaram, sem falhas ou testes ignorados. No navegador isolado, foram conferidos: pagamento parcial e desfazer; exclusão recuperável; fila offline e reenvio; conflito de configuração entre aparelhos mantendo o rascunho; salvar após reabrir edição atualizada; filtro mensal preservado; leitura com armazenamento cheio; diagnóstico sem conteúdo financeiro e ausência de rolagem horizontal nos tamanhos conferidos. A medição de latência real e a publicação permanecem pendentes.
