const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {boot,fixture,personal,loan}=require('./fixtures/gestor-mocks.cjs');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),nav=fs.readFileSync(path.join(__dirname,'../interface/navegacao.js'),'utf8');
const norm=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
test('Registrado inclui todos os anos e parcelas futuras gravadas, sem terceiros ou cancelados',()=>{
 const {ctx}=boot(fixture([personal('Ano anterior',100,'1/1','12/2025'),personal('Este mês',50),personal('Futura gravada',25,'1/1','02/2027'),personal('Cancelada',10,'1/1','10/2026','Assinatura Cancelada')],[loan('Ana','A Receber',70,'Cartao')]));ctx.console={log(){}};const d=ctx.executarAcaoApi_('getDadosCompletos',null);assert.equal(d.kpis.totalGeral,'R$ 175,00');assert.equal(d.kpis.comprometimentoMes,'R$ 50,00');assert.equal(d.categorias.reduce((s,c)=>s+c.total,0),50);
});
test('meta e categoria equivalente compartilham seleção, desmarcação e limpeza; tags equivalentes também',()=>{
 const controles=[['categoria','Transporte 🚗'],['categoria','Transporte (Antigo)'],['tag','#casal'],['tag','CASAL']].map(([tipo,valor])=>({dataset:{filtroMensalTipo:tipo,filtroMensalValor:valor},setAttribute(k,v){this[k]=v;}}));
 const c=vm.createContext({normalizarTexto:norm,document:{querySelectorAll:()=>controles},ultimoRelatorioMensalCache:{},filtroInternoMensalAtivo:{},renderizarListaItensFaturaMensal(){}});vm.runInContext(html.slice(html.indexOf('    function filtrosMensaisVaziosGestor('),html.indexOf('    function montarCardFaturaMensalSeguro(')),c);
 c.aplicarFiltroInternoMensal('categoria','Transporte 🚗');assert.equal(controles[0]['aria-pressed'],'true');assert.equal(controles[1]['aria-pressed'],'true');
 c.aplicarFiltroInternoMensal('categoria','Transporte (Antigo)');assert.equal(controles[0]['aria-pressed'],'false');assert.equal(c.filtroInternoMensalAtivo.categoria.length,0);
 c.aplicarFiltroInternoMensal('tag','#casal');assert.equal(controles[3]['aria-pressed'],'true');c.aplicarFiltroInternoMensal('todos','');assert(controles.every(b=>b['aria-pressed']==='false'));
});
test('metas sem consumo aparecem como zero e permanecem filtráveis sem poluir o gráfico',()=>{
 const dados=fixture([personal('Gasto atual',50)]);dados['Dashboard & Resumo'][16]=['','Teste','',100];dados['Dashboard & Resumo'][17]=['','Educação 📚','',200];dados['Dashboard & Resumo'][18]=['','Outros 📦','',300];
 const {ctx}=boot(dados);ctx.console={log(){}};ctx.executarAcaoApi_('getDadosCompletos',null);const res=ctx.executarAcaoApi_('obterRelatorioMes','10/2026');assert.equal(res.categorias.length,1);assert.equal(res.metasCategorias.length,3);assert.equal(res.metasCategorias.find(c=>c.nome==='Educação 📚').total,0);assert.equal(res.metasCategorias.at(-1).nome,'Outros 📦');
 const vazio=ctx.executarAcaoApi_('obterRelatorioMes','01/2026');assert.equal(vazio.categorias.length,0);assert.equal(vazio.metasCategorias.length,3);assert(vazio.metasCategorias.every(c=>c.total===0));
 const c=vm.createContext({normalizarTexto:norm});vm.runInContext(html.slice(html.indexOf('    function filtrosMensaisVaziosGestor('),html.indexOf('    function aplicarFiltroInternoMensal(')),c);
 const f=c.escolherFiltroAposRecargaMensalGestor({categoria:['Educação 📚']},'10/2026','10/2026',res);assert.equal(f.categoria[0],'Educação 📚');
});
function navegacao(){
 const frames=[],eventos={},elementos=new Map(),rolagens=[];let c;
 function el(id){if(!elementos.has(id))elementos.set(id,{id,value:'não alterar',hidden:true,attrs:{},focus(){this.focado=true;},classList:{add(){},remove(){},toggle(){}},setAttribute(k,v){this.attrs[k]=v;},querySelector(){return el('botaoMais');}});return elementos.get(id);}
 c=vm.createContext({console,Promise,Map,Set,scrollY:900,abaAtivaAtual:'dashboard',filtrosAtuais:{forma:'Cartao',ano:'2026'},offsetAtual:0,LIMITE_PAGINA:50,pxReqFiltroId:0,pxPaginaHistoricoEmAndamento:false,pxVersaoConsultaHistorico:'v1',ultimoResumoSomaFiltro:null,
  document:{getElementById:el,addEventListener:(n,f)=>eventos[n]=f},requestAnimationFrame:f=>frames.push(f),matchMedia:()=>({matches:true}),scrollTo:op=>{rolagens.push(op.top);c.scrollY=op.top;},setAba:aba=>{c.abaAtivaAtual=aba;},addEventListener:(n,f)=>eventos[n]=f,pxEl:el,renderTabelaLancamentos(){},temAlgumFiltroAtivo:()=>true,mostrarAviso(){}});c.window=c;vm.runInContext(nav,c);return {c,el,rolagens,frames,flush(){while(frames.length)frames.shift()();}};
}
test('trocar abas começa no topo e Voltar ao topo não altera filtros nem pede teclado',()=>{
 const a=navegacao();a.c.setAba('lancamentos');a.flush();assert.equal(a.c.scrollY,0);a.c.scrollY=1200;a.c.atualizarBotaoTopoHistoricoGestor();assert.equal(a.el('btnTopoHistoricoGestor').hidden,false);
 a.c.voltarAoTopoHistoricoGestor();assert.equal(a.c.scrollY,0);assert.equal(a.el('view-lancamentos').focado,true);assert.equal(a.el('inpBusca').focado,undefined);assert.equal(a.c.filtrosAtuais.ano,'2026');
 a.c.scrollY=900;a.c.setAba('dashboard');a.flush();assert.equal(a.el('btnTopoHistoricoGestor').hidden,true);assert.equal(a.c.scrollY,0);
});
test('resposta do Histórico preserva posição na mesma visita, mas não após sair e voltar',async()=>{
 for(const navegar of [false,true]){const a=navegacao();a.c.setAba('lancamentos');a.flush();a.c.scrollY=1200;let resolver;a.c.apiCall=()=>new Promise(r=>resolver=r);
  const i=html.indexOf('    window.chamarFiltroBackend = function (append, preservarLista)'),fim=html.indexOf('    window.limparFiltros',i);vm.runInContext(html.slice(i,fim),a.c);
  const pedido=a.c.chamarFiltroBackend(false,true);if(navegar){a.c.setAba('dashboard');a.c.setAba('lancamentos');a.flush();}
  resolver({itens:[],temMais:false,versaoConsulta:'v2',qtdTotal:0});await pedido;a.flush();assert.equal(a.c.scrollY,navegar?0:1200);assert.equal(a.c.filtrosAtuais.forma,'Cartao');
 }
});
