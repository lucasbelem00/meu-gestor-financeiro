const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const fonte = fs.readFileSync(path.join(__dirname, '../interface/desempenho.js'), 'utf8');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const aguardar = () => new Promise(resolve => setImmediate(resolve));
const leituras = ['getDadosCompletos', 'obterRelatorioMes', 'obterRelatorioAnual', 'obterFaturaPagamentoWeb', 'previaRestauracaoBackupWeb'];

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
  vm.runInContext(fonte, ctx);
  function canvas(id,aba) { const c = {id,aba,isConnected:true,visivel:false,closest(){return this.visivel ? null : {};}}; telas.set(id,c); return {canvas:c}; }
  return {ctx,eventos,graficos,canvas,renderizados,avisos};
}
function coordenador(opcoes = {}) {
  const {ctx} = ambiente(async () => ({}));
  return ctx.criarCoordenadorLeiturasGestor({leituras:new Set(leituras),...opcoes});
}

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

test('nova atualização após pagamento não compartilha o render antigo', async () => {
  const chamadas=[];const a=ambiente(acao=>new Promise(resolve=>chamadas.push({acao,resolve})),true);
  const anterior=a.ctx.carregarDados();await aguardar();
  const pago=a.ctx.apiCall('registrarPagamentoFaturaWeb',{});await aguardar();chamadas[1].resolve({confirmado:true});await pago;
  const atual=a.ctx.carregarDados();await aguardar();assert.notEqual(anterior,atual);assert.equal(chamadas.length,3);
  chamadas[2].resolve({saldo:0});assert.equal(await atual,true);
  chamadas[0].resolve({saldo:100});await aguardar();assert.equal(chamadas.length,4);
  chamadas[3].resolve({saldo:0});assert.equal(await anterior,false);
  assert.equal(a.renderizados.length,1);assert.equal(a.renderizados[0].saldo,0);
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
  for(const evento of ['online','focus','document:visibilitychange']) {a.eventos[evento]();await a.ctx.apiCall('obterRelatorioMes','10/2026');}
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
