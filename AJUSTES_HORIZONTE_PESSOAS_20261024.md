# Horizonte e Pessoas na mesa — 24/10/2026

## Alterações realizadas

- [x] Setas indisponíveis do Horizonte ficam apagadas, sem sombra nem destaque de hover. O bloqueio nativo impede o clique e informa a indisponibilidade às tecnologias assistivas.
- [x] As setas começam desativadas até o carregamento e têm nomes e dicas que explicam os limites.
- [x] A posição do Horizonte é corrigida ao alternar de duas para quatro colunas, redimensionar a tela ou carregar uma lista menor de meses. A última janela aproveita as colunas disponíveis; nenhum mês adicional é criado.
- [x] Nome, cota e pagamento da rachadinha usam os mesmos espaçamentos e altura de campo. Rótulos possuem espaço para duas linhas. A ação de remover e a indicação de participante fixo seguem a base dos campos.
- [x] Nomes longos não alargam a grade; o nome completo continua no campo e na dica. A estrutura móvel de duas colunas permanece.
- [x] Nomes acessíveis dos pagamentos e da remoção acompanham a edição do nome da pessoa.

## Vistoria: novo risco confirmado, separado destes ajustes

**Rascunho da rachadinha em duas abas.** Duas páginas que já estejam abertas podem gravar versões diferentes na mesma chave `gestorRachadinhaRascunhoV1`. A página com dados antigos pode substituir a cópia local da outra. Os ouvintes de armazenamento atualizam indicadores e notas, mas não conciliam esse rascunho.

Reprodução local: duas instâncias do módulo real compartilharam apenas um Map em memória. A primeira guardou “Jantar em elaboração”; uma gravação posterior da segunda, ainda com o campo vazio, substituiu essa informação. Nenhuma planilha ou armazenamento real do navegador foi alterado. O ensaio ficou em `C:/Users/lucas/Documents/Codex/auditoria-rachadinha-abas-20261024.cjs`.

Recomendação: guardar um rascunho por página, listar as cópias recuperáveis e avisar quando houver outra versão. A migração deve preservar a chave antiga e o identificador de qualquer envio já preparado. Essa mudança de persistência fica registrada para um próximo pacote, sem misturá-la com o ajuste visual. Até lá, prefira montar a divisão em uma única aba.

Melhoria de uso recomendada: incluir futuramente um indicador curto do intervalo exibido, como “Out/26 a Jan/27”. Os meses continuam identificados nos cabeçalhos atuais.

## Validação e publicação

- Cinco novos testes cobrem limites, cliques repetidos, troca de duas para quatro colunas, redução da lista e índices inválidos.
- Suíte completa: 230 testes aprovados, com dados fictícios e sem contas reais.
- CSS compilado; cópias da interface e publicação estática sincronizadas. Cache do app atualizado para v30; protocolo do backend permanece 7.
- A ferramenta de uso do computador interrompeu a conferência por não conseguir identificar com segurança a URL do navegador. Não houve validação visual final: conferir a aparência no celular e no computador após publicar.
- Não houve publicação nem alteração de dados reais. Atualizar a interface do Apps Script com `Backend/Index_para_colar.txt` e publicar a interface da Vercel pelo fluxo habitual. Este pacote não exige mudança de lógica no `Backend/Code.gs`.

Esta vistoria cobriu navegação do Horizonte, disposição e acessibilidade dos participantes e persistência local da rachadinha. Não é garantia de ausência de falhas em todo o aplicativo.
