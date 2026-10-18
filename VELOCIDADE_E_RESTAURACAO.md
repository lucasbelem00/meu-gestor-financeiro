# Velocidade e restauração de backup

## Velocidade

- jsPDF e AutoTable são carregados apenas quando você pede um PDF. Na primeira geração é necessária conexão; depois os recursos podem estar disponíveis na cache do navegador.
- Chart.js e Sortable carregam sem bloquear a leitura inicial do HTML.
- Consultas simultâneas de dados completos compartilham a mesma requisição. Iniciar ou concluir uma gravação invalida esse compartilhamento, para não aproveitar uma leitura anterior à gravação.
- Gráficos existentes são atualizados sem destruir e criar tudo novamente, e sem repetir animações a cada atualização.
- Não foi trocada a infraestrutura. A rede, o Apps Script e o tamanho da planilha continuam influenciando o tempo de gravação. Não foi medido um percentual de ganho.
- Compilar Tailwind durante a publicação e reorganizar todo o HTML em módulos permanecem como manutenção separada; esta etapa não reescreve todo o aplicativo.

## Onde restaurar

Menu → Dados e relatórios → Exportar dados. No fim da janela existe Restaurar uma cópia de segurança.

1. Sincronize as pendências e feche o app nos outros aparelhos.
2. Selecione o arquivo JSON exportado pelo Gestor. CSV não é um backup completo.
3. Confira a planilha de destino, as quantidades e os totais de parcelas atuais e do backup.
4. Digite RESTAURAR e confirme a substituição.
5. Aguarde a confirmação. A restauração substitui os dados; não acrescenta os mesmos registros novamente.

## Conteúdo e proteções

- Restaura os dados das abas Dashboard & Resumo, Formas de Pagamento, Lançamentos, Empréstimos e Anotações, incluindo categorias, metas, pagamentos, identidades e formatos numéricos compatíveis.
- Preserva o histórico de atividade atual e registra a restauração. O histórico antigo presente no arquivo não substitui o atual.
- Guarda a cópia anterior automaticamente na aba oculta _Gestor_Restauracoes, antes de aplicar as mudanças financeiras. O botão Baixar cópia anterior à última restauração permite recuperá-la como JSON.
- A aplicação usa o diário recuperável existente e um identificador de operação. Se a resposta se perder, confira Atividade e sincronização e repita o mesmo envio protegido. Não inicie outra restauração com outro identificador.
- Se não houver envio pendente, Conferir restauração interrompida consulta a planilha e libera um bloqueio local deixado antes do envio.
- Uma alteração na planilha depois da prévia bloqueia a restauração e exige nova conferência.
- Após restaurar, versões antigas de registros e envios preparados antes da restauração são bloqueados. Notas locais conflitantes permanecem guardadas para escolha explícita da versão.
- Código, permissões, tokens, implantação e preferências locais, como a chave Pix, não são substituídos.
- A leitura local aceita arquivos até 8 MB. Após remover informações de exibição e histórico que não são restauradas, o conteúdo enviado deve caber em 900 KB. Há também limites de dimensões e tamanho das células.
- Fórmulas financeiras manuais e fórmulas fora da lista de funções internas suportadas são recusadas. Fórmulas que buscam dados externos não são executadas na restauração. Arquivos incompatíveis são preservados para recuperação assistida.
- Este mecanismo restaura os dados do app, não é uma cópia integral de todos os recursos do Google Planilhas, como gráficos, compartilhamentos, cores, filtros ou abas particulares.

## Publicação

Atualize primeiro Backend/Code.gs na implantação da cópia de teste. Depois publique a interface, api/gestor.js e sw.js pela branch protegida no GitHub/Vercel. Não use restauração na planilha original antes de conferir o fluxo na cópia de teste.

## Conferência desta etapa

Na preparação da publicação, passaram 78 testes locais com dados fictícios, incluindo 7 casos específicos de restauração: prévia, substituição, cópia anterior, alteração após a prévia, reenvio, interrupção e bloqueio de arquivos incompatíveis. As três interfaces estão sincronizadas. Ainda falta a conferência na planilha de teste real pelo navegador.

Para conferir na cópia: exporte um JSON, altere um lançamento fictício, abra a prévia e cancele; confira que nada foi substituído. Reabra a prévia e confirme a restauração. Confira totais, parcelas, notas, categorias, PDFs e a cópia anterior. Uma mudança após a prévia deve impedir a aplicação até uma nova prévia.
