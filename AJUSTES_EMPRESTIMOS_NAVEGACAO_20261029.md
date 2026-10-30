# Empréstimos e navegação — 29/10/2026

## Mudanças

- Pix usa 💠 também no filtro. Removidos o SVG que ficou grande e sua incorporação no build.
- Cadastro e edição de empréstimos usam o rótulo curto Mês da fatura, sem o parágrafo de competência/devolução.
- Observação continua opcional, com exemplo de instrução de transferência em vez de repetir uma data. A data combinada continua um campo próprio com calendário nativo.
- Abaixo da data combinada na edição, a escolha é Somente esta parcela ou Esta e as próximas parcelas a receber. A explicação aparece somente para a segunda opção; a prévia das datas e a confirmação existentes continuam obrigatórias. Parcelas anteriores e já recebidas não são modificadas. O escopo volta ao individual a cada abertura do editor.
- No novo empréstimo, a data da primeira devolução continua gerando as demais por mês. Não é necessário cadastrar a mesma data manualmente em cada parcela.
- Voltar do navegador/celular fecha a Central de Navegação e mantém a aba. Fechar pelo X ou escolher um atalho consome a entrada temporária, sem acumular passos extras. Reabrir rapidamente enquanto o histórico retorna também é tratado. O estado anterior do histórico é preservado.
- Consultar/Novo empréstimo têm cores mutuamente exclusivas, seleção âmbar e estado acessível. O âmbar foi restaurado a pedido do usuário. Havia fundo neutro e selecionado simultâneos no mesmo botão, prejudicando o destaque.
- A subferramenta escolhida fica azul, tem nome atualizado no cabeçalho e aparece na barra horizontal. A barra não rola verticalmente para trás do cabeçalho. Verde continua reservado à aba principal Novo. O título do grupo Ferramentas no menu passa a neutro.
- Recebidos do mês substitui o texto longo no indicador de empréstimos. Continua sendo o total recebido das parcelas da competência atual, e não um extrato pela data em que o dinheiro entrou.
- Em Novo, Empréstimo e Limpar ficam lado a lado em uma linha própria no celular, com mesma altura e largura. Empréstimo usa nome âmbar sobre fundo neutro.
- Nas parcelas e no resumo por pessoa de Empréstimos, valores a receber ficam brancos e recebidos verdes. Os campos editáveis de valor usam branco. Os indicadores de recebimento continuam verdes.
- Novo empréstimo rola até o cabeçalho do cadastro; uma troca posterior de navegação invalida essa rolagem programada.

## Desempenho e identidade instalada

O cadastro atualiza seus indicadores e sugestões, mas não monta os cartões da consulta oculta. A busca em Empréstimos aguarda 160 ms de pausa na digitação, em vez de reconstruir a lista a cada tecla. Estas melhorias reduzem trabalho local; não medem nem eliminam a espera real da rede ou do Apps Script.

O manifesto estava no caminho genérico de prioridade de cache e podia continuar informando a identidade antiga. Agora a consulta tenta a rede com revalidação e preserva a cópia anterior em falhas; uma página HTML de login não pode substituir um manifesto válido. A URL do ícone Apple foi versionada. Os PNGs próprios e as URLs versionadas do manifesto já faziam parte do pacote anterior.

Depois de publicar, atualizar o app e abrir com conexão. No Chrome, uma mudança de identidade pode precisar de aceitação da atualização de ícone/nome. O ícone da tela inicial e a tela de abertura são controlados também pelo navegador e sistema; não é possível prometer substituição imediata apenas pelo botão Atualizar. Fonte oficial: https://developer.chrome.com/blog/improvements-to-web-app-updates.

## Conferência e publicação

Testes automatizados cobrem o retorno do histórico, fechamento explícito, reabertura rápida, cores de seleção, nome da ferramenta, rolagem exclusivamente horizontal, consulta oculta, busca e atualização/offline do manifesto. Os testes financeiros existentes continuam cobrindo a prévia de datas e parcelas pagas.

### Conferência da prévia e do botão ÷2

A primeira imagem de Novo era de uma prévia isolada sem a inicialização dos atalhos de parcelas e da linha de metade. Comparação com a versão anterior confirmou que os blocos de posicionamento e criação do ÷2 não foram revertidos: 3x/6x/12x continuam abaixo do campo e ÷2 fica abaixo do valor.

No teste de ida e volta do ÷2, foi encontrada uma falha preexistente de escopo: a função `removerTagDivididoAutomatica` estava dentro de um bloco local, embora funções globais a chamassem. Ela foi promovida para junto do cálculo de metade, removendo o bloco local que ficou obsoleto. O teste verifica 25,50 → 12,75 → 25,50, remoção só da tag automática e preservação de #dividido quando digitada pelo usuário.

Conferência posterior no navegador, com a inicialização dos controles incluída: ÷2 e os atalhos 3x/6x/12x aparecem abaixo dos respectivos campos; o ciclo dividir/restaurar foi executado sem erros. Consultar e Novo empréstimo apresentaram seleção âmbar em ambos os casos. A suíte completa passou com 604 testes; os HTMLs de distribuição foram conferidos como idênticos à raiz.

Prévia local em 390 × 844 com dados fictícios: Voltar fechou o menu e preservou Novo; escolher Calculadora atualizou nome e seleção azul visível; Novo empréstimo abriu e rolou até o cadastro. Os atalhos Empréstimo e Limpar mediram ambos 152 × 42 px. A prévia não consulta nem grava na planilha, e não reproduz a instalação Android.

Cache PWA v58, protocolo 16. Build sincroniza os HTMLs e prepara `dist/`; não publica Vercel/Apps Script. Para este ajuste, publicar o frontend e o HTML atualizado do Apps Script. Nenhuma função nova precisa ser executada na planilha. Dados financeiros e regras do backend não foram alterados.

### Destaque da página atual na Central

Ao reabrir o menu, a ferramenta atual fica azul, incluindo Simular Compra, Calculadora, Notas, Rachadinha e Empréstimos. Os demais destinos de página também seguem a indicação. A seleção usa `aria-current="page"` e é recalculada a partir da aba e da subferramenta abertas; não depende do foco deixado pelo último toque. Exportação/backup e Chave Pix continuam ações que abrem modais.

Foram retiradas as antigas mudanças de classes que cobriam apenas quatro atalhos. A Central passa a usar uma única regra de seleção. A conferência local em 390 × 844 confirmou Simular Compra selecionado ao reabrir, substituição pelo destaque de Calculadora e Voltar fechando a Central sem abandonar a ferramenta. Os quatro novos testes e a suíte completa passaram: 617 testes. Build atualizado, cache PWA v60, protocolo 17 preservado. Esta correção não exige executar função na planilha nem altera o backend; precisa publicar a interface para chegar ao app instalado.
