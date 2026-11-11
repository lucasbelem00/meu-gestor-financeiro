const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const fonte = fs.readFileSync(path.join(__dirname, '../interface/desempenho.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const aguardar = () => new Promise(resolve => setImmediate(resolve));

test('tela oculta aguarda retorno antes de consultar, mas não bloqueia gravação e protocolo',async()=>{
 const chamadas=[],a=ambiente((acao)=>new Promise(resolve=>chamadas.push({acao,resolve})));
 a.ctx.document.visibilityState='hidden';a.eventos['document:visibilitychange']();
 const r=a.ctx.apiCall('obterRecorrenciasWeb',{}),s=a.ctx.apiCall('salvarLancamentoWeb',{});
await aguardar();chamadas[0].resolve({sucesso:true});await s;
 const p=a.ctx.apiCall('getDadosCompletos');
 await aguardar();assert.deepEqual(chamadas.map(c=>c.acao),['salvarLancamentoWeb','getDadosCompletos']);
 chamadas[1].resolve({dados:true});await p;
 a.ctx.document.visibilityState='visible';a.eventos['document:visibilitychange']();await aguardar();
 assert.equal(chamadas.length,3);assert.equal(chamadas[2].acao,'obterRecorrenciasWeb');chamadas[2].resolve({itens:[]});await r;
 assert(a.ctx.obterMetricasDesempenhoGestor().esperasConsultas.some(e=>e.motivo==='tela_oculta'));
});

test('resposta invalidada não inicia outra leitura enquanto app está oculto',async()=>{
 const chamadas=[],a=ambiente((acao)=>new Promise(resolve=>chamadas.push({acao,resolve})));
 const p=a.ctx.apiCall('obterRecorrenciasWeb',{});await aguardar();
 a.eventos.storage({key:'gestorEpocaRestauracaoV1'});a.ctx.document.visibilityState='hidden';a.eventos['document:visibilitychange']();
 chamadas[0].resolve({antigo:true});await aguardar();assert.equal(chamadas.length,1);
 a.ctx.document.visibilityState='visible';a.eventos['document:visibilitychange']();await aguardar();assert.equal(chamadas.length,2);
 chamadas[1].resolve({atual:true});assert.equal((await p).atual,true);assert.equal(a.ctx.obterMetricasDesempenhoGestor().descartadas,1);
});
const leituras = ['getDadosCompletos', 'obterRelatorioMes', 'obterRelatorioAnual', 'filtrarLancamentosWeb', 'obterFaturaPagamentoWeb', 'previaRestauracaoBackupWeb','obterAtividadeWeb','obterRecorrenciasWeb'];

function ambiente(executar, carregarReal = false, extras = {}) {
  const eventos = {}, graficos = [], telas = new Map(), renderizados = [], avisos = [];
  const ctx = vm.createContext({
    console, Promise, Map, Set, TextEncoder, Date,
    apiCall: executar,
    carregarDados: async () => true,
    atualizarGraficoGestor(anterior, contexto, configuracao) { const chart = {anterior, contexto, configuracao}; graficos.push(chart); return chart; },
    setAba(aba) { for (const c of telas.values()) c.visivel = c.aba === aba; },
    chartGlobal: null, chartRel: null, chartAnualObj: null,
    leiturasAtividadeGestor: new Set(leituras),
    geracaoLeituraGestor: 0,
    document: {visibilityState: 'visible', addEventListener(n,f) { eventos['document:' + n] = f; }},
    addEventListener(n,f) { eventos[n] = f; },
    requisicaoCarregarDadosAtual: 0,
    inicializarNotasLocaisGestor() {}, dadosCarregadosIniciais: true, notasGlobais: [],
    lerCacheLeituraGestor: () => null, salvarCacheLeituraGestor() {}, sincronizarNotasNuvem() {},
    renderizarDados: d => renderizados.push(d), mostrarAviso: (...a) => avisos.push(a),
    ...extras
  });
  ctx.window = ctx;
  require('./fixtures/aviso-leitura-ui.cjs')(ctx);
  if (carregarReal) {
    const inicio = html.indexOf('    function carregarDados() {'), fim = html.indexOf('function limparFormularioEmprestimo()', inicio);
    vm.runInContext(html.slice(inicio, fim), ctx);
  }
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/acoes.js'),'utf8'),ctx);
  vm.runInContext(fonte, ctx);
  function canvas(id,aba) { const c = {id,aba,isConnected:true,visivel:false,closest(){return this.visivel ? null : {};}}; telas.set(id,c); return {canvas:c}; }
  return {ctx,eventos,graficos,canvas,renderizados,avisos};
}
function coordenador(opcoes = {}) {
  const {ctx} = ambiente(async () => ({}));
  return ctx.criarCoordenadorLeiturasGestor({leituras:new Set(leituras),cacheaveis:['obterRelatorioMes','obterRelatorioAnual'],...opcoes});
}

test('resize só redesenha o Horizonte quando cruza o modo de tela, sem perder dados atuais',()=>{
 const a=ambiente(async()=>({}));let largura=500,dados=true,render=0;
 const resize=a.ctx.criarControleResizeHorizonteGestor({largura:()=>largura,possuiDados:()=>dados,renderizar:()=>render++});
 for(const l of [510,530,639]){largura=l;resize();}assert.equal(render,0);
 largura=640;resize();assert.equal(render,1);largura=1100;resize();assert.equal(render,1);
 dados=false;largura=500;resize();assert.equal(render,1);dados=true;largura=900;resize();assert.equal(render,2);
});

test('selo automático agrupa chamadas sem atrasar gravações nem a atualização explícita',async()=>{
 const inicio=html.indexOf('let badgeAtividadeAgendadoGestor='),fim=html.indexOf('function abrirAtividadeGestor()',inicio);const c=vm.createContext({Promise});vm.runInContext(html.slice(inicio,fim),c);let chamadas=0;c.atualizarBadgeAtividadeGestor=()=>chamadas++;
 c.agendarBadgeAtividadeGestor();c.agendarBadgeAtividadeGestor();c.agendarBadgeAtividadeGestor();assert.equal(chamadas,0);c.atualizarBadgeAtividadeGestor();assert.equal(chamadas,1);await Promise.resolve();assert.equal(chamadas,2);
 c.agendarBadgeAtividadeGestor();await Promise.resolve();assert.equal(chamadas,3);
});

test('espera local mede só o intervalo na fila sem guardar filtros e sem mudar os envios',async()=>{
 let instante=10;const chamadas=[];const c=coordenador({agora:()=>instante,executar:(acao,p)=>new Promise(resolve=>chamadas.push({p,resolve}))});
 const a=c.chamar('filtrarLancamentosWeb',{termo:'privado-a'});await aguardar();
 const b=c.chamar('filtrarLancamentosWeb',{termo:'privado-b'});await aguardar();assert.equal(chamadas.length,1);
 instante=60;chamadas[0].resolve({itens:[1]});await a;await aguardar();assert.equal(chamadas.length,2);
 instante=90;chamadas[1].resolve({itens:[2]});await b;
 const m=c.metricas();assert.equal(m.esperasConsultas.length,1);assert.equal(m.esperasConsultas[0].duracaoMs,50);assert.equal(m.esperasConsultas[0].motivo,'historico');assert(!JSON.stringify(m).includes('privado'));
 m.esperasConsultas[0].duracaoMs=0;assert.equal(c.metricas().esperasConsultas[0].duracaoMs,50);
});

test('filtros diferentes não acumulam envios; só o último filtro visual pendente é enviado',async()=>{
 const chamadas=[];let atual=1;const c=coordenador({executar:(acao,param)=>new Promise(resolve=>chamadas.push({acao,param,resolve}))});
 const a=c.consultarHistorico({termo:'a'},()=>atual===1),cancelarA=assert.rejects(a,e=>e.codigo==='CONSULTA_SUBSTITUIDA');await aguardar();
 atual=2;const b=c.consultarHistorico({termo:'b'},()=>atual===2),cancelarB=assert.rejects(b,e=>e.codigo==='CONSULTA_SUBSTITUIDA');
 atual=3;const ultimo=c.consultarHistorico({termo:'c'},()=>atual===3);await aguardar();assert.equal(chamadas.length,1);
 chamadas[0].resolve({itens:['a']});await cancelarA;await cancelarB;await aguardar();assert.equal(chamadas.length,2);assert.equal(chamadas[1].param.termo,'c');
 chamadas[1].resolve({itens:['c']});assert.equal((await ultimo).itens[0],'c');
});

test('consultas diretas de histórico preservam todas as páginas e compartilham pedidos iguais',async()=>{
 const chamadas=[];const c=coordenador({executar:(acao,param)=>new Promise(resolve=>chamadas.push({param,resolve}))});
 const a=c.chamar('filtrarLancamentosWeb',{offset:0}),igual=c.chamar('filtrarLancamentosWeb',{offset:0}),b=c.chamar('filtrarLancamentosWeb',{offset:50});
 await aguardar();assert.equal(chamadas.length,1);chamadas[0].resolve({itens:[0]});await Promise.all([a,igual]);await aguardar();assert.equal(chamadas.length,2);assert.equal(chamadas[1].param.offset,50);chamadas[1].resolve({itens:[50]});assert.equal((await b).itens[0],50);
});

test('sair do Histórico impede reconsulta antiga e retoma o filtro ao voltar, sem cancelar gravação',async()=>{
 let a,retomadas=0;const chamadas=[];
 a=ambiente(acao=>new Promise(resolve=>chamadas.push({acao,resolve})),false,{abaAtivaAtual:'lancamentos',setAba:aba=>{a.ctx.abaAtivaAtual=aba;},chamarFiltroBackend:()=>retomadas++});
 const filtro=a.ctx.consultarHistoricoVisivelGestor({termo:'x'},()=>true),cancelado=assert.rejects(filtro,e=>e.codigo==='CONSULTA_SUBSTITUIDA');await aguardar();
 a.ctx.setAba('dashboard');const gravar=a.ctx.apiCall('salvarLancamentoWeb',{});await aguardar();
 chamadas[0].resolve({itens:['antigo']});await cancelado;await aguardar();assert.equal(chamadas.length,2);assert.equal(chamadas[1].acao,'salvarLancamentoWeb');
 chamadas[1].resolve({confirmado:true});assert.equal((await gravar).confirmado,true);
 a.ctx.setAba('lancamentos');await aguardar();assert.equal(retomadas,1);
});

test('erro tardio de consulta em tela deixada é substituído sem reenviar a consulta',async()=>{
 const chamadas=[];const a=ambiente(acao=>new Promise((resolve,reject)=>chamadas.push({acao,resolve,reject})),false,{abaAtivaAtual:'lancamentos'});
 const p=a.ctx.consultarHistoricoVisivelGestor({},()=>true),cancelado=assert.rejects(p,e=>e.codigo==='CONSULTA_SUBSTITUIDA');await aguardar();a.ctx.abaAtivaAtual='dashboard';
 chamadas[0].reject(Object.assign(Error('ocupado'),{codigo:'SERVICO_OCUPADO'}));await cancelado;assert.equal(chamadas.length,1);
});

function snapshotConfirmado(saldo=20){return {versao:1,dados:{protocoloGestor:18,integridade:{bloqueada:false,pendencias:[]},epocaRestauracao:'',kpis:{totalAberto:saldo},faturas:{},lancamentos:[],formasPagamento:[],configCategorias:[],emprestimos:{itens:[]},versoesConfiguracao:{formas:'f',categorias:'c'}}};}
test('página filtrada confirmada só atende uma vez os mesmos filtros e geração',async()=>{
 const consulta={filtros:{termo:'x'},offset:0,limite:50},snapshot=snapshotConfirmado();snapshot.historico={consulta,requerReconsultaPaginacao:true,resposta:{itens:[],qtdTotal:0,versaoConsulta:null,temMais:false}};
 for(const caso of ['igual','filtro','geracao']){
 const c=coordenador({executar:async()=>({atualizacaoDados:snapshot})});await c.chamar('editarLancamentoLinhaWeb',{incluirAtualizacaoDados:true});assert(c.consumirAtualizacaoConfirmada());
 if(caso==='geracao')c.invalidar('armazenamento');
 const p=caso==='filtro'?{...consulta,filtros:{termo:'y'}}:consulta,r=c.consumirHistoricoConfirmado(p);
 assert.equal(Boolean(r),caso==='igual');assert.equal(c.consumirHistoricoConfirmado(consulta),null);
 }
});

test('Novo, edição, categorias e exclusão confirmados atualizam a tela uma vez sem consulta completa adicional',async()=>{
 for(const acao of ['salvarLancamentoWeb','editarLancamentoLinhaWeb','salvarCategoriasWeb','excluirLancamentoWeb','registrarPagamentoFaturaWeb','alternarStatusEmprestimoWeb','dividirParcelaEmprestimoWeb']){
  const chamadas=[],ingeridos=[];const a=ambiente(async nome=>{chamadas.push(nome);return nome===acao?{sucesso:true,atualizacaoDados:snapshotConfirmado()}:{saldo:99};},true,{receberEstadoDadosCompletosGestor:d=>ingeridos.push(d)});
  await a.ctx.apiCall(acao,{incluirAtualizacaoDados:true});
  assert.equal(a.renderizados.length,0);
  const p=a.ctx.carregarDados(),q=a.ctx.carregarDados();assert.equal(p,q);assert.equal(await p,true);await q;
  assert.deepEqual(chamadas,[acao]);assert.equal(a.renderizados.length,1);assert.equal(a.renderizados[0].kpis.totalAberto,20);assert.equal(ingeridos.length,1);assert.equal(a.ctx.obterMetricasDesempenhoGestor().atualizacoesConfirmadas,1);
  await a.ctx.carregarDados();assert.deepEqual(chamadas,[acao,'getDadosCompletos']);
 }
});

test('API interna não consome snapshot e resposta sem opt-in ou de outra ação usa rede normal',async()=>{
 for(const [acao,param] of [['salvarLancamentoWeb',{}],['salvarNotasWeb',{incluirAtualizacaoDados:true}]]){
  let completas=0;const a=ambiente(async nome=>nome==='getDadosCompletos'?(completas++,{saldo:99}):{atualizacaoDados:snapshotConfirmado()},true,{receberEstadoDadosCompletosGestor(){throw Error('não consumir');}});
  await a.ctx.apiCall(acao,param);assert.equal(await a.ctx.carregarDados(),true);assert.equal(completas,1);
 }
 let completas=0;const a=ambiente(async nome=>nome==='getDadosCompletos'?(completas++,{saldo:99}):{atualizacaoDados:snapshotConfirmado()},true,{receberEstadoDadosCompletosGestor(){throw Error('não consumir');}});
 await a.ctx.apiCall('salvarLancamentoWeb',{incluirAtualizacaoDados:true});await a.ctx.apiCall('getDadosCompletos');assert.equal(completas,1);
});

test('invalidação durante ou depois da mutação impede aplicar snapshot confirmado antigo',async()=>{
 for(const durante of [true,false]){
  const chamadas=[];const a=ambiente(nome=>new Promise(resolve=>chamadas.push({nome,resolve})),true,{receberEstadoDadosCompletosGestor(){throw Error('não aplicar');}});
  const envio=a.ctx.apiCall('salvarLancamentoWeb',{incluirAtualizacaoDados:true});await aguardar();
  if(durante)a.eventos.storage({key:'gestorEpocaRestauracaoV1'});
  chamadas[0].resolve({atualizacaoDados:snapshotConfirmado()});await envio;
  if(!durante)a.eventos.storage({key:'gestorEpocaRestauracaoV1'});
  const recarga=a.ctx.carregarDados();await aguardar();assert.equal(chamadas.length,2);assert.equal(chamadas[1].nome,'getDadosCompletos');
  chamadas[1].resolve({saldo:99});assert.equal(await recarga,true);assert.equal(a.renderizados[0].saldo,99);
 }
});

test('snapshot opcional inválido, expirado ou com falha de ingestão não prejudica confirmação e usa rede',async()=>{
 for(const valor of [undefined,{versao:2,dados:{}},{versao:1,dados:{}},snapshotConfirmado()]){
  let completas=0;const a=ambiente(async nome=>nome==='getDadosCompletos'?(completas++,{saldo:99}):{confirmado:true,atualizacaoDados:valor},true,{receberEstadoDadosCompletosGestor(){throw Error('ingestão falhou');}});
  assert.equal((await a.ctx.apiCall('salvarLancamentoWeb',{incluirAtualizacaoDados:true})).confirmado,true);assert.equal(await a.ctx.carregarDados(),true);assert.equal(completas,1);
 }
 let agora=1000;const c=coordenador({agora:()=>agora,executar:async()=>({atualizacaoDados:snapshotConfirmado()})});
 await c.chamar('salvarLancamentoWeb',{incluirAtualizacaoDados:true});agora+=15000;assert.equal(c.consumirAtualizacaoConfirmada(),null);
});

test('invalidação em microtask entre consumo e render impede promover snapshot antigo',async()=>{
 let a;const chamadas=[];
 a=ambiente(async nome=>{chamadas.push(nome);return nome==='getDadosCompletos'?{saldo:99}:{atualizacaoDados:snapshotConfirmado()};},true,{receberEstadoDadosCompletosGestor(){Promise.resolve().then(()=>a.eventos.storage({key:'gestorEpocaRestauracaoV1'}));}});
 await a.ctx.apiCall('salvarLancamentoWeb',{incluirAtualizacaoDados:true});assert.equal(await a.ctx.carregarDados(),true);
 assert.deepEqual(chamadas,['salvarLancamentoWeb','getDadosCompletos']);assert.equal(a.renderizados.length,1);assert.equal(a.renderizados[0].saldo,99);assert.equal(a.ctx.obterMetricasDesempenhoGestor().atualizacoesConfirmadas,0);
});

test('diagnóstico informa build e motivos limitados sem conteúdo financeiro',async()=>{
 const a=ambiente(async()=>({total:10}));
 a.eventos.blur();a.eventos.focus();a.eventos.storage({key:'gestorMutacaoV3:id-privado'});
 await a.ctx.apiCall('salvarCategoriasWeb',{descricao:'conteúdo privado'});
 const c=a.ctx.obterMetricasDesempenhoGestor();assert.equal(c.versaoInterface,'v191');
 assert.equal(c.invalidacoesPorMotivo.foco,1);assert.equal(c.invalidacoesPorMotivo.armazenamento,1);assert.equal(c.invalidacoesPorMotivo.mutacao_inicio,1);assert.equal(c.invalidacoesPorMotivo.mutacao_fim,1);
 assert(!JSON.stringify(c).includes('id-privado'));assert(!JSON.stringify(c).includes('conteúdo privado'));
 c.ultimasInvalidacoes[0].motivo='adulterado';assert.notEqual(a.ctx.obterMetricasDesempenhoGestor().ultimasInvalidacoes[0].motivo,'adulterado');
 for(let i=0;i<30;i++){a.eventos.blur();a.eventos.focus();}assert.equal(a.ctx.obterMetricasDesempenhoGestor().ultimasInvalidacoes.length,20);
});

test('foco e visibilidade da mesma retomada invalidam uma vez, em qualquer ordem',async()=>{
 for(const ordem of [['focus','document:visibilitychange'],['document:visibilitychange','focus']]){
  let chamadas=0;const a=ambiente(async()=>({valor:++chamadas}));
  await a.ctx.apiCall('obterRelatorioMes','10/2026');
  a.eventos.blur();a.ctx.document.visibilityState='hidden';a.eventos['document:visibilitychange']();
  const antes=a.ctx.obterMetricasDesempenhoGestor().invalidacoes;
  a.ctx.document.visibilityState='visible';for(const evento of ordem)a.eventos[evento]();
  assert.equal(a.ctx.obterMetricasDesempenhoGestor().invalidacoes,antes+1);
  await a.ctx.apiCall('obterRelatorioMes','10/2026');assert.equal(chamadas,2);
  a.eventos.blur();a.eventos.focus();assert.equal(a.ctx.obterMetricasDesempenhoGestor().invalidacoes,antes+2);
 }
});

test('foco inicial ou repetido não invalida consulta em andamento; foco oculto espera visibilidade',async()=>{
 const chamadas=[];const a=ambiente(acao=>new Promise(resolve=>chamadas.push({acao,resolve})),true);
 const dados=a.ctx.carregarDados();await aguardar();a.eventos.focus();a.eventos['document:visibilitychange']();
 chamadas[0].resolve({saldo:20});assert.equal(await dados,true);assert.equal(chamadas.length,1);assert.equal(a.ctx.obterMetricasDesempenhoGestor().descartadas,0);
 const antes=a.ctx.obterMetricasDesempenhoGestor().invalidacoes;a.ctx.document.visibilityState='hidden';a.eventos['document:visibilitychange']();a.eventos.focus();assert.equal(a.ctx.obterMetricasDesempenhoGestor().invalidacoes,antes);
 a.ctx.document.visibilityState='visible';a.eventos['document:visibilitychange']();a.eventos.focus();assert.equal(a.ctx.obterMetricasDesempenhoGestor().invalidacoes,antes+1);
});

test('retomada não absorve invalidação de gravação ou de outro aparelho',async()=>{
 const a=ambiente(async()=>({confirmado:true}));a.eventos.blur();a.eventos.focus();
 a.eventos.storage({key:'gestorEpocaRestauracaoV1'});await a.ctx.apiCall('salvarLancamentoWeb',{});a.eventos['document:visibilitychange']();
 const m=a.ctx.obterMetricasDesempenhoGestor();assert.equal(m.invalidacoesPorMotivo.foco,1);assert.equal(m.invalidacoesPorMotivo.armazenamento,1);assert.equal(m.invalidacoesPorMotivo.mutacao_inicio,1);assert.equal(m.invalidacoesPorMotivo.mutacao_fim,1);assert.equal(m.invalidacoes,4);
});

test('Histórico espera edição pendente e compartilha consulta após a confirmação sem reenviar edição',async()=>{
 const chamadas=[];const c=coordenador({executar:(acao,param)=>new Promise((resolve,reject)=>chamadas.push({acao,param,resolve,reject}))});
 const editar=c.chamar('editarLancamentoLinhaWeb',{requestId:'mesmo-envio'}),a=c.chamar('filtrarLancamentosWeb',{busca:'x'}),b=c.chamar('filtrarLancamentosWeb',{busca:'x'});
 await aguardar();assert.equal(chamadas.length,1);assert.equal(chamadas[0].acao,'editarLancamentoLinhaWeb');
 chamadas[0].resolve({sucesso:true});await editar;await aguardar();assert.equal(chamadas.length,2);
 chamadas[1].resolve({itens:[1]});await Promise.all([a,b]);assert.equal(chamadas.filter(x=>x.acao==='editarLancamentoLinhaWeb').length,1);
});
test('Histórico não fica preso a edição falha e consultas internas continuam disponíveis',async()=>{
 const chamadas=[];const c=coordenador({executar:(acao,param)=>new Promise((resolve,reject)=>chamadas.push({acao,param,resolve,reject}))});
 const editar=c.chamar('editarLancamentoLinhaWeb',{}),falhou=assert.rejects(editar,/sem confirmação/),historico=c.chamar('filtrarLancamentosWeb',{}),protocolo=c.chamar('getDadosCompletos');
 await aguardar();assert.equal(chamadas.length,2);assert.equal(chamadas[1].acao,'getDadosCompletos');
 chamadas[1].resolve({protocolo:18});await protocolo;chamadas[0].reject(Error('sem confirmação'));await falhou;await aguardar();assert.equal(chamadas.length,3);
 chamadas[2].resolve({itens:[]});await historico;
});

test('relatórios aguardam carga completa já iniciada e compartilham apenas o envio da versão nova',async()=>{
 const chamadas=[];const c=coordenador({executar:(acao,param)=>new Promise((resolve,reject)=>chamadas.push({acao,param,resolve,reject}))});
 const base=c.chamar('getDadosCompletos');
 const mes=c.chamar('obterRelatorioMes','11/2026'),mesIgual=c.chamar('obterRelatorioMes','11/2026');
 await aguardar();assert.equal(chamadas.length,1);assert.equal(chamadas[0].acao,'getDadosCompletos');
 chamadas[0].resolve({atual:true});await base;await aguardar();
 assert.equal(chamadas.length,2);assert.equal(chamadas[1].acao,'obterRelatorioMes');
 chamadas[1].resolve({total:20});const r=await Promise.all([mes,mesIgual]);assert(r.every(x=>x.total===20));assert.equal(c.metricas().descartadas,0);
});
test('falha da carga completa não prende relatórios nem causa repetição automática da falha',async()=>{
 const chamadas=[];const c=coordenador({executar:(acao,param)=>new Promise((resolve,reject)=>chamadas.push({acao,param,resolve,reject}))});
 const base=c.chamar('getDadosCompletos');const falhou=assert.rejects(base,/rede/);const ano=c.chamar('obterRelatorioAnual','2026');
 await aguardar();chamadas[0].reject(Error('rede'));await falhou;await aguardar();assert.equal(chamadas.length,2);
 chamadas[1].resolve({total:30});assert.equal((await ano).total,30);
});

test('consultas simultâneas compartilham envio e retornam objetos independentes', async () => {
  const chamadas = [];
  const c = coordenador({executar:(acao,param)=>new Promise(resolve=>chamadas.push({acao,param,resolve}))});
  const a = c.chamar('obterRelatorioMes',{mes:'10/2026',opcao:true});
  const b = c.chamar('obterRelatorioMes',{opcao:true,mes:'10/2026'});
  const outro = c.chamar('obterRelatorioMes','11/2026');
  await aguardar(); assert.equal(chamadas.length,2);
  chamadas.forEach(chamada=>chamada.resolve({itens:[{valor:100}]}));
  const [ra,rb] = await Promise.all([a,b,outro]); ra.itens[0].valor=0;
  assert.equal(rb.itens[0].valor,100);
  const cache = await c.chamar('obterRelatorioMes',{mes:'10/2026',opcao:true});
  assert.equal(cache.itens[0].valor,100); assert.equal(cache.origemLeituraDesempenho,'cache');
});

test('cache mantém a idade real da consulta, expira e é limitado por quantidade e tamanho', async () => {
  let instante=1000, chamadas=0;
  const c=coordenador({executar:async(a,p)=>{chamadas++;return {mes:p,total:10};},agora:()=>instante,ttlMs:15000,limiteEntradas:2,limiteBytes:200});
  const original=await c.chamar('obterRelatorioMes','10/2026');
  instante=5000;const reaproveitado=await c.chamar('obterRelatorioMes','10/2026');
  assert.equal(reaproveitado.consultadoEmDesempenho,original.consultadoEmDesempenho);assert.equal(chamadas,1);
  await c.chamar('obterRelatorioMes','11/2026');await c.chamar('obterRelatorioMes','12/2026');
  assert.equal(c.metricas().entradas,2);await c.chamar('obterRelatorioMes','10/2026');assert.equal(chamadas,4);
  instante=21001;await c.chamar('obterRelatorioMes','10/2026');assert.equal(chamadas,5);
  const grande=coordenador({executar:async()=>({texto:'x'.repeat(1000)}),limiteBytes:20});
  await grande.chamar('obterRelatorioAnual','2026');assert.equal(grande.metricas().entradas,0);
});

test('pagamento invalida antes e depois, e resposta atravessada por gravação não chega à tela', async () => {
  const chamadas=[];
  const c=coordenador({executar:(acao)=>new Promise(resolve=>chamadas.push({acao,resolve}))});
  const antiga=c.chamar('obterRelatorioMes','10/2026');await aguardar();
  const pagamento=c.chamar('registrarPagamentoFaturaWeb',{valor:40});await aguardar();
  chamadas[0].resolve({pago:0});await aguardar();assert.equal(chamadas.length,3);
  chamadas[1].resolve({pago:40});await pagamento;
  chamadas[2].resolve({pago:0});await aguardar();assert.equal(chamadas.length,4);
  chamadas[3].resolve({pago:40});const confirmado=await antiga;
  assert.equal(confirmado.pago,40);assert.equal(c.metricas().descartadas,2);
  assert.equal((await c.chamar('obterRelatorioMes','10/2026')).pago,40);
});

test('consulta alterada repetidamente termina sem promover resposta antiga ou repetir gravações', async () => {
  let chamadas=0,c;
  c=coordenador({executar:async()=>{chamadas++;c.invalidar();return {pago:0};}});
  await assert.rejects(c.chamar('obterRelatorioMes','10/2026'),e=>e.codigo==='LEITURA_SUBSTITUIDA');
  assert.equal(chamadas,3);assert.equal(c.metricas().entradas,0);
  chamadas=0;const gravar=coordenador({executar:async()=>{chamadas++;throw Error('rede interrompida');}});
  await assert.rejects(gravar.chamar('salvarLancamentoWeb',{requestId:'teste'}),/rede/);assert.equal(chamadas,1);
});

test('erro de rede não é guardado nem repetido; cópia financeira anterior não sobrevive a mutação falha', async () => {
  let chamadas=0;
  const c=coordenador({executar:async(a)=>{chamadas++;if(a==='salvarLancamentoWeb')throw Error('não confirmado');if(chamadas<3)throw Error('offline');return {total:20};}});
  await assert.rejects(c.chamar('obterRelatorioMes','10/2026'),/offline/);assert.equal(chamadas,1);
  await assert.rejects(c.chamar('obterRelatorioMes','10/2026'),/offline/);assert.equal(chamadas,2);
  await c.chamar('obterRelatorioMes','10/2026');
  await assert.rejects(c.chamar('salvarLancamentoWeb',{}),/não confirmado/);
  await c.chamar('obterRelatorioMes','10/2026');assert.equal(chamadas,5);
});

test('dados completos e prévias de pagamento ou restauração nunca usam cache de resultado', async () => {
  let chamadas=0;const c=coordenador({executar:async()=>({atual:++chamadas})});
  for(const acao of ['getDadosCompletos','obterFaturaPagamentoWeb','previaRestauracaoBackupWeb']) {
    const a=await c.chamar(acao,{}),b=await c.chamar(acao,{});assert.notEqual(a.atual,b.atual);
  }
  assert.equal(c.metricas().entradas,0);
});

test('invalidação acessória não converte gravação confirmada em falha', async () => {
  const c=coordenador({executar:async()=>({confirmado:true}),aoInvalidar(){throw Error('acessório de cache indisponível');}});
  assert.equal((await c.chamar('restaurarBackupDadosWeb',{})).confirmado,true);
});

test('duas atualizações simultâneas executam uma consulta e um render real', async () => {
  const chamadas=[];const a=ambiente(acao=>new Promise(resolve=>chamadas.push({acao,resolve})),true);
  const p1=a.ctx.carregarDados(),p2=a.ctx.carregarDados();assert.equal(p1,p2);
  await aguardar();assert.equal(chamadas.length,1);chamadas[0].resolve({saldo:100});
  assert.equal(await p1,true);await p2;assert.equal(a.renderizados.length,1);assert.equal(a.renderizados[0].saldo,100);
});

test('nova atualização após pagamento substitui o render antigo sem uma quarta consulta', async () => {
  const chamadas=[];const a=ambiente(acao=>new Promise(resolve=>chamadas.push({acao,resolve})),true);
  const anterior=a.ctx.carregarDados();await aguardar();
  const pago=a.ctx.apiCall('registrarPagamentoFaturaWeb',{});await aguardar();chamadas[1].resolve({confirmado:true});await pago;
  const atual=a.ctx.carregarDados();await aguardar();assert.notEqual(anterior,atual);assert.equal(chamadas.length,2);
  chamadas[0].resolve({saldo:100});await aguardar();assert.equal(chamadas.length,3);
  chamadas[2].resolve({saldo:0});assert.equal(await atual,true);assert.equal(await anterior,false);assert.equal(chamadas.length,3);
  assert.equal(a.renderizados.length,1);assert.equal(a.renderizados[0].saldo,0);
});

test('recargas visuais aguardam gravação e compartilham consulta e render depois dela',async()=>{
 const chamadas=[];const a=ambiente(acao=>new Promise((resolve,reject)=>chamadas.push({acao,resolve,reject})),true);
 const salvar=a.ctx.apiCall('salvarCategoriasWeb',{}),primeira=a.ctx.carregarDados(),segunda=a.ctx.carregarDados();
 await aguardar();assert.equal(chamadas.length,1);assert.equal(a.renderizados.length,0);
 chamadas[0].resolve({confirmado:true});await salvar;await aguardar();assert.equal(chamadas.length,2);assert.equal(chamadas[1].acao,'getDadosCompletos');
 chamadas[1].resolve({saldo:40});assert.deepEqual(await Promise.all([primeira,segunda]),[true,true]);assert.equal(a.renderizados.length,1);
});

test('recarga visual após falha de gravação consulta novamente sem repetir o envio',async()=>{
 const chamadas=[];const a=ambiente(acao=>new Promise((resolve,reject)=>chamadas.push({acao,resolve,reject})),true);
 const salvar=a.ctx.apiCall('salvarCategoriasWeb',{}),falhou=assert.rejects(salvar,/rede/),dados=a.ctx.carregarDados();
 await aguardar();assert.equal(chamadas.length,1);chamadas[0].reject(Error('rede'));await falhou;await aguardar();
 assert.equal(chamadas.length,2);chamadas[1].resolve({saldo:40});assert.equal(await dados,true);assert.equal(a.renderizados.length,1);
});

test('cargas de gerações diferentes esperam a anterior e nunca promovem dados antigos',async()=>{
 const chamadas=[];const c=coordenador({executar:acao=>new Promise(resolve=>chamadas.push({acao,resolve}))});
 const antiga=c.chamar('getDadosCompletos');await aguardar();c.invalidar();
 const nova=c.chamar('getDadosCompletos');await aguardar();assert.equal(chamadas.length,1);
 chamadas[0].resolve({saldo:100});await aguardar();assert.equal(chamadas.length,2);
 c.invalidar();chamadas[1].resolve({saldo:20});await aguardar();assert.equal(chamadas.length,3);
 chamadas[2].resolve({saldo:10});assert.equal((await nova).saldo,10);assert.equal((await antiga).saldo,10);
 assert(c.metricas().esperasConsultas.some(e=>e.motivo==='carga_anterior'));
});

test('gráficos de tela oculta são criados ao abrir, usando somente a última configuração', () => {
  const a=ambiente(async()=>({})),contexto=a.canvas('chartCategorias','dashboard');
  a.ctx.atualizarGraficoGestor(null,contexto,{data:{total:10}});
  a.ctx.atualizarGraficoGestor(null,contexto,{data:{total:20}});assert.equal(a.graficos.length,0);
  a.eventos.focus(); // Retornar ao navegador não pode apagar o gráfico pendente.
  a.ctx.setAba('dashboard');assert.equal(a.graficos.length,1);
  assert.equal(a.graficos[0].configuracao.data.total,20);assert.equal(a.ctx.chartGlobal,a.graficos[0]);
  a.ctx.setAba('dashboard');assert.equal(a.graficos.length,1);
});

test('retorno à conexão ou ao app invalida relatórios sem apagar rascunhos ou filtros', async () => {
  let chamadas=0;const a=ambiente(async()=>({valor:++chamadas}));
  a.ctx.filtroTeste={pessoa:'Ana'};a.ctx.rascunhoTeste='meu preenchimento';
  await a.ctx.apiCall('obterRelatorioMes','10/2026');await a.ctx.apiCall('obterRelatorioMes','10/2026');assert.equal(chamadas,1);
  a.eventos.online();await a.ctx.apiCall('obterRelatorioMes','10/2026');
  a.eventos.blur();a.eventos.focus();await a.ctx.apiCall('obterRelatorioMes','10/2026');
  a.ctx.document.visibilityState='hidden';a.eventos['document:visibilitychange']();a.ctx.document.visibilityState='visible';a.eventos['document:visibilitychange']();await a.ctx.apiCall('obterRelatorioMes','10/2026');
  assert.equal(chamadas,4);assert.equal(a.ctx.rascunhoTeste,'meu preenchimento');assert.equal(a.ctx.filtroTeste.pessoa,'Ana');
});

test('consulta de protocolo iniciada dentro de gravação não entra em espera circular', async () => {
  let ctx;const a=ambiente(async acao=>acao==='getDadosCompletos'?{protocoloGestor:9}:{confirmado:(await ctx.apiCall('getDadosCompletos')).protocoloGestor===9});ctx=a.ctx;
  assert.equal((await ctx.apiCall('salvarLancamentoWeb',{})).confirmado,true);
});

test('atualização completa invalida relatório de outra versão e reaproveita uma única resposta entre leitores', async () => {
  let total=10,chamadas=0;
  const c=coordenador({executar:async acao=>{chamadas++;return acao==='getDadosCompletos'?{epocaRestauracao:'restaurada'}:{total};}});
  await c.chamar('obterRelatorioMes','10/2026');total=20;
  const [a,b]=await Promise.all([c.chamar('getDadosCompletos'),c.chamar('getDadosCompletos')]);
  assert.equal(a.epocaRestauracao,b.epocaRestauracao);assert.equal(chamadas,2);
  const novo=await c.chamar('obterRelatorioMes','10/2026');assert.equal(novo.total,20);assert.equal(chamadas,3);
});

test('alterações de outra página invalidam relatórios, mas salvar rascunho não perde o cache', async () => {
  let chamadas=0;const a=ambiente(async()=>({valor:++chamadas}));
  await a.ctx.apiCall('obterRelatorioMes','10/2026');
  a.eventos.storage({key:'gestorRascunhoV3:novo:outra'});await a.ctx.apiCall('obterRelatorioMes','10/2026');assert.equal(chamadas,1);
  a.eventos.storage({key:'gestorMutacaoV3:outra'});await a.ctx.apiCall('obterRelatorioMes','10/2026');assert.equal(chamadas,2);
});

test('cards de empréstimos só são montados quando a consulta fica visível', () => {
  const a=ambiente(async()=>({}));let montagens=0,oculto=true;
  a.ctx.document.getElementById=()=>({closest:()=>oculto?{}:null});
  a.ctx.renderizarPainelEmprestimos=()=>montagens++;
  const inicio=fonte.indexOf('const painelEmprestimosAntesCoordenacaoGestor ='),fim=fonte.indexOf("window.addEventListener('online'",inicio);
  vm.runInContext(fonte.slice(inicio,fim).replaceAll('painelEmprestimosAntesCoordenacaoGestor','painelEmprestimosTesteGestor'),a.ctx);
  a.ctx.renderizarPainelEmprestimos();assert.equal(montagens,0);
  oculto=false;a.ctx.renderizarPainelEmprestimos();assert.equal(montagens,1);
});

test('reconsulta usa os parâmetros conferidos mesmo se o chamador alterar o objeto original', async () => {
  const chamadas=[],param={filtros:{pessoa:'Ana'},offset:0};
  const c=coordenador({executar:(acao,p)=>new Promise(resolve=>chamadas.push({acao,p,resolve}))});
  const consulta=c.chamar('getDadosCompletos',param);param.filtros.pessoa='Bruno';await aguardar();
  assert.equal(chamadas[0].p.filtros.pessoa,'Ana');chamadas[0].p.filtros.pessoa='Alterado no adaptador';
  c.invalidar();chamadas[0].resolve({valor:1});await aguardar();assert.equal(chamadas[1].p.filtros.pessoa,'Ana');
  chamadas[1].resolve({valor:2});assert.equal((await consulta).valor,2);
});

function interfaceMensal() {
  const pedidos=[],tarefas=[];
  function node(tag='div') {
    return {tag,style:{visibility:''},inert:false,attrs:{},children:[],hidden:false,
      setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},removeAttribute(k){delete this.attrs[k];},
      before(irma){this.envoltorio=irma;},append(...itens){for(const e of itens){e.parent=this;this.children.push(e);}},
      querySelectorAll(tipo){return this.children.flatMap(c=>[...(c.tag===tipo?[c]:[]),...c.querySelectorAll(tipo)]);},
      querySelector(tipo){return this.querySelectorAll(tipo)[0]||null;},remove(){this.parent.children=this.parent.children.filter(c=>c!==this);}
    };
  }
  const indicadores=node(),consumo=node(),valor=node(),canvas=node('canvas');valor.closest=()=>indicadores;canvas.closest=()=>consumo;
  const doc={visibilityState:'visible',addEventListener(){},createElement:node,getElementById:id=>id==='rel-aberto'?valor:id==='chartRelatorio'?canvas:null};
  let ctx,req=0;
  const a=ambiente(acao=>new Promise((resolve,reject)=>pedidos.push({acao,resolve,reject})),false,{
    document:doc,ultimoRelatorioMensalCache:{periodoReferencia:'10/2026'},
    setTimeout:f=>tarefas.push(f),
    carregarRelatorioMesUnico(mes){const id=++req;ctx.ultimoRelatorioMensalCache=null;ctx.apiCall('obterRelatorioMes',mes).then(res=>{if(id===req)ctx.ultimoRelatorioMensalCache={...res,periodoReferencia:mes};},()=>{});}
  });ctx=a.ctx;
  return {...a,pedidos,indicadores,consumo,flush(){while(tarefas.length)tarefas.shift()();}};
}

test('trocar mês cobre números antigos e bloqueia ações até aplicar o período correto', async () => {
  const a=interfaceMensal();a.ctx.carregarRelatorioMesUnico('11/2026');
  assert.equal(a.indicadores.style.visibility,'hidden');assert.equal(a.indicadores.inert,true);assert.equal(a.consumo.inert,true);
  assert.equal(a.indicadores.envoltorio.children[1].querySelector('p').textContent,'Conferindo os valores de 11/2026…');
  await aguardar();a.pedidos[0].resolve({total:50});await aguardar();a.flush();
  assert.equal(a.indicadores.style.visibility,'');assert.equal(a.indicadores.inert,false);assert.equal(a.consumo.getAttribute('aria-busy'),'false');
  assert.equal(a.ctx.ultimoRelatorioMensalCache.periodoReferencia,'11/2026');
  assert.equal(a.indicadores.envoltorio.children[1].style.display,'none');
});

test('falha ou resposta atrasada não revela os números do mês anterior', async () => {
  const a=interfaceMensal();a.ctx.carregarRelatorioMesUnico('11/2026');await aguardar();
  a.ctx.carregarRelatorioMesUnico('12/2026');await aguardar();
  a.pedidos[0].resolve({total:50});await aguardar();a.flush();assert.equal(a.indicadores.inert,true);
  a.pedidos[1].reject(Error('rede indisponível'));await aguardar();a.flush();
  assert.equal(a.indicadores.style.visibility,'hidden');assert.equal(a.indicadores.inert,true);
  const status=a.indicadores.envoltorio.children[1];assert.match(status.querySelector('p').textContent,/12\/2026.*não estão disponíveis/);
  assert.equal(status.querySelector('button').textContent,'Tentar novamente');
});


test('Atividade e Recorrências aguardam carga inicial sem descarte e sem cache entre consultas',async()=>{for(const acao of ['obterAtividadeWeb','obterRecorrenciasWeb']){const chamadas=[],c=coordenador({executar:(n,p)=>new Promise((resolve,reject)=>chamadas.push({n,p,resolve,reject}))});const base=c.chamar('getDadosCompletos'),a=c.chamar(acao,{}),b=c.chamar(acao,{});await aguardar();assert.equal(chamadas.length,1);chamadas[0].resolve({atual:true});await base;await aguardar();assert.equal(chamadas.length,2);assert.equal(chamadas[1].n,acao);chamadas[1].resolve({itens:[]});await Promise.all([a,b]);assert.equal(c.metricas().descartadas,0);const nova=c.chamar(acao,{});await aguardar();assert.equal(chamadas.length,3);chamadas[2].resolve({itens:['atual']});assert.equal((await nova).itens[0],'atual');}});
test('Atividade e Recorrências esperam gravação, mas consulta de protocolo permanece livre',async()=>{for(const acao of ['obterAtividadeWeb','obterRecorrenciasWeb']){const chamadas=[],c=coordenador({executar:(n,p)=>new Promise((resolve,reject)=>chamadas.push({n,p,resolve,reject}))});const envio=c.chamar('salvarLancamentoWeb',{requestId:'aguardar-gravacao-segura'}),painel=c.chamar(acao,{});await aguardar();assert.equal(chamadas.length,1);const protocolo=c.chamar('getDadosCompletos');await aguardar();assert.equal(chamadas.length,2);chamadas[1].resolve({atual:true});await protocolo;chamadas[0].resolve({confirmado:true});await envio;await aguardar();assert.equal(chamadas.length,3);assert.equal(chamadas[2].n,acao);chamadas[2].resolve({itens:[]});await painel;}});
test('falha da carga inicial libera as leituras de tela sem repetir o erro nem travar a fila',async()=>{const chamadas=[],c=coordenador({executar:(n,p)=>new Promise((resolve,reject)=>chamadas.push({n,p,resolve,reject}))});const base=c.chamar('getDadosCompletos'),falhou=assert.rejects(base,/rede/),painel=c.chamar('obterAtividadeWeb',{});await aguardar();assert.equal(chamadas.length,1);chamadas[0].reject(Error('rede'));await falhou;await aguardar();assert.equal(chamadas.length,2);chamadas[1].resolve({itens:[]});await painel;assert.equal(c.metricas().pendentes,0);});


test('ocupação repete somente consulta permitida, com duas pausas e limite total de três envios',async()=>{const pausas=[];let chamadas=0;const c=coordenador({esperar:async ms=>pausas.push(ms),executar:async()=>{chamadas++;if(chamadas<3)throw Object.assign(Error('ocupado'),{codigo:'SERVICO_OCUPADO'});return {itens:['atual']};}});assert.equal((await c.chamar('obterAtividadeWeb',{})).itens[0],'atual');assert.equal(chamadas,3);assert.deepEqual(pausas,[1200,2500]);assert.equal(c.metricas().retentativasOcupado,2);const d=coordenador({esperar:async()=>{},executar:async()=>{throw Object.assign(Error('ocupado'),{codigo:'SERVICO_OCUPADO'});}});await assert.rejects(d.chamar('obterRecorrenciasWeb',{}),e=>e.codigo==='SERVICO_OCUPADO');assert.equal(d.metricas().envios,3);assert.equal(d.metricas().ocupadasEsgotadas,1);});
test('ocupação não repete salvamento, prévia financeira nem falha de comunicação',async()=>{for(const [acao,codigo]of [['salvarLancamentoWeb','SERVICO_OCUPADO'],['obterFaturaPagamentoWeb','SERVICO_OCUPADO'],['obterAtividadeWeb','FALHA_COMUNICACAO']]){let chamadas=0;const c=coordenador({esperar:async()=>{throw Error('Não deveria esperar');},executar:async()=>{chamadas++;throw Object.assign(Error('falhou'),{codigo});}});await assert.rejects(c.chamar(acao,{}),e=>e.codigo===codigo);assert.equal(chamadas,1);}});
test('busca alterada ou tela abandonada durante pausa não reenvia consulta antiga',async()=>{for(const caso of ['filtro','tela']){let ativo=true,liberar,chamadas=0;const c=coordenador({podeRetomar:()=>caso==='tela'?ativo:true,esperar:()=>new Promise(r=>liberar=r),executar:async()=>{chamadas++;throw Object.assign(Error('ocupado'),{codigo:'SERVICO_OCUPADO'});}});const p=caso==='filtro'?c.consultarHistorico({filtros:{termo:'antigo'}},()=>ativo):c.chamar('obterRecorrenciasWeb',{}),erro=assert.rejects(p,e=>e.codigo==='CONSULTA_SUBSTITUIDA');await aguardar();assert.equal(typeof liberar,'function');ativo=false;liberar();await erro;assert.equal(chamadas,1);}});
test('consultas iguais compartilham novo envio depois da ocupação',async()=>{let chamadas=0;const c=coordenador({esperar:async()=>{},executar:async()=>{chamadas++;if(chamadas===1)throw Object.assign(Error('ocupado'),{codigo:'SERVICO_OCUPADO'});return {itens:[1]};}});const r=await Promise.all([c.chamar('obterAtividadeWeb',{}),c.chamar('obterAtividadeWeb',{})]);assert.equal(chamadas,2);assert.equal(r[0].itens[0],1);assert.equal(r[1].itens[0],1);});

test('múltiplas recargas invalidadas não sobrepõem cargas e falha antiga não prende a seguinte',async()=>{const chamadas=[],c=coordenador({executar:()=>new Promise((resolve,reject)=>chamadas.push({resolve,reject}))});const a=c.chamar('getDadosCompletos'),falha=assert.rejects(a,/rede/);await aguardar();c.invalidar();const b=c.chamar('getDadosCompletos');c.invalidar();const d=c.chamar('getDadosCompletos');await aguardar();assert.equal(chamadas.length,1);chamadas[0].reject(Error('rede'));await falha;await aguardar();assert.equal(chamadas.length,2);chamadas[1].resolve({saldo:7});assert.equal((await b).saldo,7);assert.equal((await d).saldo,7);assert.equal(chamadas.length,2);assert.equal(c.metricas().pendentes,0);});

test('primeiro salvamento aguarda protocolo da carga em voo antes de invalidar e não faz outra carga',async()=>{const chamadas=[];let a;a=ambiente((acao)=>new Promise((resolve,reject)=>chamadas.push({acao,resolve:v=>{if(acao==='getDadosCompletos')a.ctx.protocoloServidorGestor=v.protocoloGestor;resolve(v);},reject})),false,{protocoloServidorGestor:0});const carga=a.ctx.apiCall('getDadosCompletos');await aguardar();const envio=a.ctx.apiCall('salvarLancamentoWeb',{requestId:'teste-inicial-protocolo'});await aguardar();assert.equal(chamadas.length,1);assert.equal(a.ctx.obterMetricasDesempenhoGestor().invalidacoes,0);chamadas[0].resolve({protocoloGestor:19});await carga;await aguardar();assert.equal(chamadas.length,2);assert.equal(chamadas[1].acao,'salvarLancamentoWeb');chamadas[1].resolve({confirmado:true});await envio;assert.equal(a.ctx.obterMetricasDesempenhoGestor().descartadas,0);});
test('falha na carga inicial conserva o envio sem disparar gravação nem repetir a falha',async()=>{const chamadas=[],a=ambiente(acao=>new Promise((resolve,reject)=>chamadas.push({acao,resolve,reject})),false,{protocoloServidorGestor:0});const carga=a.ctx.apiCall('getDadosCompletos'),erroCarga=assert.rejects(carga,/rede/);await aguardar();const envio=a.ctx.apiCall('salvarLancamentoWeb',{requestId:'protocolo-falha'}),erroEnvio=assert.rejects(envio,/rede/);await aguardar();chamadas[0].reject(Error('rede'));await Promise.all([erroCarga,erroEnvio]);assert.equal(chamadas.length,1);assert.equal(a.ctx.obterMetricasDesempenhoGestor().pendentes,0);});
test('servidor antigo impede salvar após a checagem coordenada',async()=>{const chamadas=[];let a;a=ambiente(async acao=>{chamadas.push(acao);a.ctx.protocoloServidorGestor=4;return {protocoloGestor:4};},false,{protocoloServidorGestor:0});await assert.rejects(a.ctx.apiCall('salvarLancamentoWeb',{}),/Atualize/);assert.deepEqual(chamadas,['getDadosCompletos']);});

test('checagem inicial retoma dentro do coordenador sem disparar bloqueio visual de envio duplicado',async()=>{const chamadas=[];let a;a=ambiente(async acao=>{chamadas.push(acao);if(acao==='getDadosCompletos'){a.ctx.protocoloServidorGestor=19;return {protocoloGestor:19};}return {confirmado:true};},false,{protocoloServidorGestor:0});const interna=a.ctx.apiCall;let ocupado=false;a.ctx.apiCall=function(acao,...args){if(acao==='getDadosCompletos')return interna(acao,...args);if(ocupado)throw Error('envio duplicado');ocupado=true;return interna(acao,...args).finally(()=>ocupado=false);};assert.equal((await a.ctx.apiCall('salvarLancamentoWeb',{})).confirmado,true);assert.deepEqual(chamadas,['getDadosCompletos','salvarLancamentoWeb']);assert.equal(ocupado,false);});
